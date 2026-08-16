import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { TimesheetEntry, TimesheetEntryInput } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import { runOrEnqueue, isOutboxQueuedError, isOutboxQueuedResult } from '@/lib/offline/runOrEnqueue'
import { isOnline } from '@/lib/offline/network'
import { stashExpectedUpdatedAt, readExpectedUpdatedAt } from '@/lib/offline/expectedUpdatedAt'

function entriesKey(workspaceId: string) {
  return ['timesheet-entries', workspaceId] as const
}

const ALL_ENTRIES_KEY = { queryKey: ['timesheet-entries', 'all'], exact: false } as const

function shouldInvalidateAfterMutation(data: unknown, error: unknown): boolean {
  if (!isOnline()) return false
  if (isOutboxQueuedError(error) || isOutboxQueuedResult(data)) return false
  return true
}
export function useTimesheetEntries(workspaceId: string | undefined) {
  return useQuery({
    queryKey: entriesKey(workspaceId ?? ''),
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<TimesheetEntry[]> => {
      const { data, error } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('workspace_id', workspaceId as string)
      if (error) throw error
      return data as TimesheetEntry[]
    },
  })
}

/** Fetches entries for many workspaces at once, used by the cross-workspace summary calendar. */
export function useAllTimesheetEntries(workspaceIds: string[]) {
  return useQuery({
    queryKey: ['timesheet-entries', 'all', ...[...workspaceIds].sort()],
    enabled: workspaceIds.length > 0,
    queryFn: async (): Promise<TimesheetEntry[]> => {
      const { data, error } = await supabase.from('timesheet_entries').select('*').in('workspace_id', workspaceIds)
      if (error) throw error
      return data as TimesheetEntry[]
    },
  })
}

interface EntryContext {
  previousDetail: TimesheetEntry[] | undefined
  previousAll: Array<[QueryKey, TimesheetEntry[] | undefined]>
  clientId: string
}

export function useCreateTimesheetEntry(workspaceId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: TimesheetEntryInput & { clientId?: string }) => {
      if (!user) throw new Error('Not signed in')
      const clientId = input.clientId ?? crypto.randomUUID()
      const fields: TimesheetEntryInput = {
        entry_date: input.entry_date,
        minutes: input.minutes,
        start_time: input.start_time,
        end_time: input.end_time,
        topic: input.topic,
        note: input.note,
        mood: input.mood,
      }

      return runOrEnqueue({
        userId: user.id,
        payload: {
          kind: 'timesheet_entry_create',
          workspaceId,
          input: fields,
          clientId,
        },
        offlineResult: {
          id: clientId,
          workspace_id: workspaceId,
          user_id: user.id,
          entry_date: fields.entry_date,
          minutes: fields.minutes,
          start_time: fields.start_time,
          end_time: fields.end_time,
          topic: fields.topic,
          note: fields.note,
          mood: fields.mood ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies TimesheetEntry,
        run: async () => {
          const { data, error } = await supabase
            .from('timesheet_entries')
            .insert({ ...fields, id: clientId, workspace_id: workspaceId, user_id: user.id })
            .select()
            .single()
          if (error) throw error
          return data as TimesheetEntry
        },
      })
    },
    onMutate: async (input): Promise<EntryContext | undefined> => {
      if (!user) return undefined
      await queryClient.cancelQueries({ queryKey: entriesKey(workspaceId) })
      await queryClient.cancelQueries(ALL_ENTRIES_KEY)

      const previousDetail = queryClient.getQueryData<TimesheetEntry[]>(entriesKey(workspaceId))
      const previousAll = queryClient.getQueriesData<TimesheetEntry[]>(ALL_ENTRIES_KEY)
      const clientId = input.clientId ?? crypto.randomUUID()
      input.clientId = clientId
      const now = new Date().toISOString()
      const optimisticEntry: TimesheetEntry = {
        id: clientId,
        workspace_id: workspaceId,
        user_id: user.id,
        entry_date: input.entry_date,
        minutes: input.minutes,
        start_time: input.start_time,
        end_time: input.end_time,
        topic: input.topic,
        note: input.note,
        mood: input.mood ?? null,
        created_at: now,
        updated_at: now,
      }

      queryClient.setQueryData<TimesheetEntry[]>(entriesKey(workspaceId), (old) => [
        ...(old ?? []),
        optimisticEntry,
      ])
      queryClient.setQueriesData<TimesheetEntry[]>(ALL_ENTRIES_KEY, (old) =>
        old ? [...old, optimisticEntry] : old,
      )

      return { previousDetail, previousAll, clientId }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (!context) return
      queryClient.setQueryData(entriesKey(workspaceId), context.previousDetail)
      for (const [key, data] of context.previousAll) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: entriesKey(workspaceId) })
      queryClient.invalidateQueries(ALL_ENTRIES_KEY)
    },
  })
}

export function useUpdateTimesheetEntry(workspaceId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, input }: { id: string; input: Partial<TimesheetEntryInput> }) => {
      if (!user) throw new Error('Not signed in')
      const expectedUpdatedAt = readExpectedUpdatedAt(`timesheet_entry:${id}`)

      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'timesheet_entry_update', workspaceId, id, input },
        expectedUpdatedAt,
        run: async () => {
          const { error } = await supabase.from('timesheet_entries').update(input).eq('id', id)
          if (error) throw error
        },
      })
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: entriesKey(workspaceId) })
      await queryClient.cancelQueries(ALL_ENTRIES_KEY)
      const previousDetail = queryClient.getQueryData<TimesheetEntry[]>(entriesKey(workspaceId))
      const previousAll = queryClient.getQueriesData<TimesheetEntry[]>(ALL_ENTRIES_KEY)
      stashExpectedUpdatedAt(
        `timesheet_entry:${id}`,
        previousDetail?.find((e) => e.id === id)?.updated_at,
      )
      const now = new Date().toISOString()
      queryClient.setQueryData<TimesheetEntry[]>(entriesKey(workspaceId), (old) =>
        old?.map((e) => (e.id === id ? { ...e, ...input, updated_at: now } : e)),
      )
      queryClient.setQueriesData<TimesheetEntry[]>(ALL_ENTRIES_KEY, (old) =>
        old?.map((e) => (e.id === id ? { ...e, ...input, updated_at: now } : e)),
      )
      return { previousDetail, previousAll }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (!context) return
      queryClient.setQueryData(entriesKey(workspaceId), context.previousDetail)
      for (const [key, data] of context.previousAll) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: entriesKey(workspaceId) })
      queryClient.invalidateQueries(ALL_ENTRIES_KEY)
    },
  })
}

export function useDeleteTimesheetEntry(workspaceId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not signed in')
      const expectedUpdatedAt = readExpectedUpdatedAt(`timesheet_entry:${id}`)

      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'timesheet_entry_delete', workspaceId, id },
        expectedUpdatedAt,
        run: async () => {
          const { error } = await supabase.from('timesheet_entries').delete().eq('id', id)
          if (error) throw error
        },
      })
    },
    onMutate: async (id): Promise<EntryContext> => {
      await queryClient.cancelQueries({ queryKey: entriesKey(workspaceId) })
      await queryClient.cancelQueries(ALL_ENTRIES_KEY)

      const previousDetail = queryClient.getQueryData<TimesheetEntry[]>(entriesKey(workspaceId))
      const previousAll = queryClient.getQueriesData<TimesheetEntry[]>(ALL_ENTRIES_KEY)
      stashExpectedUpdatedAt(
        `timesheet_entry:${id}`,
        previousDetail?.find((e) => e.id === id)?.updated_at,
      )

      queryClient.setQueryData<TimesheetEntry[]>(entriesKey(workspaceId), (old) => old?.filter((e) => e.id !== id))
      queryClient.setQueriesData<TimesheetEntry[]>(ALL_ENTRIES_KEY, (old) => old?.filter((e) => e.id !== id))

      return { previousDetail, previousAll, clientId: id }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (!context) return
      queryClient.setQueryData(entriesKey(workspaceId), context.previousDetail)
      for (const [key, data] of context.previousAll) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: entriesKey(workspaceId) })
      queryClient.invalidateQueries(ALL_ENTRIES_KEY)
    },
  })
}
