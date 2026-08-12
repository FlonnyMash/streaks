import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { TimesheetEntry, TimesheetEntryInput } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

function entriesKey(workspaceId: string) {
  return ['timesheet-entries', workspaceId] as const
}

const ALL_ENTRIES_KEY = { queryKey: ['timesheet-entries', 'all'], exact: false } as const

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
}

export function useCreateTimesheetEntry(workspaceId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TimesheetEntryInput) => {
      if (!user) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('timesheet_entries')
        .insert({ ...input, workspace_id: workspaceId, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data as TimesheetEntry
    },
    onMutate: async (input): Promise<EntryContext | undefined> => {
      if (!user) return undefined
      await queryClient.cancelQueries({ queryKey: entriesKey(workspaceId) })
      await queryClient.cancelQueries(ALL_ENTRIES_KEY)

      const previousDetail = queryClient.getQueryData<TimesheetEntry[]>(entriesKey(workspaceId))
      const previousAll = queryClient.getQueriesData<TimesheetEntry[]>(ALL_ENTRIES_KEY)
      const optimisticEntry: TimesheetEntry = {
        id: `optimistic-${workspaceId}-${input.entry_date}-${Date.now()}`,
        workspace_id: workspaceId,
        user_id: user.id,
        entry_date: input.entry_date,
        minutes: input.minutes,
        start_time: input.start_time,
        end_time: input.end_time,
        topic: input.topic,
        note: input.note,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<TimesheetEntry[]>(entriesKey(workspaceId), (old) => [...(old ?? []), optimisticEntry])
      queryClient.setQueriesData<TimesheetEntry[]>(ALL_ENTRIES_KEY, (old) => (old ? [...old, optimisticEntry] : old))

      return { previousDetail, previousAll }
    },
    onError: (_err, _vars, context) => {
      if (!context) return
      queryClient.setQueryData(entriesKey(workspaceId), context.previousDetail)
      for (const [key, data] of context.previousAll) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: entriesKey(workspaceId) })
      queryClient.invalidateQueries(ALL_ENTRIES_KEY)
    },
  })
}

export function useUpdateTimesheetEntry(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<TimesheetEntryInput> }) => {
      const { error } = await supabase.from('timesheet_entries').update(input).eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: entriesKey(workspaceId) })
      queryClient.invalidateQueries(ALL_ENTRIES_KEY)
    },
  })
}

export function useDeleteTimesheetEntry(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('timesheet_entries').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id): Promise<EntryContext> => {
      await queryClient.cancelQueries({ queryKey: entriesKey(workspaceId) })
      await queryClient.cancelQueries(ALL_ENTRIES_KEY)

      const previousDetail = queryClient.getQueryData<TimesheetEntry[]>(entriesKey(workspaceId))
      const previousAll = queryClient.getQueriesData<TimesheetEntry[]>(ALL_ENTRIES_KEY)

      queryClient.setQueryData<TimesheetEntry[]>(entriesKey(workspaceId), (old) => old?.filter((e) => e.id !== id))
      queryClient.setQueriesData<TimesheetEntry[]>(ALL_ENTRIES_KEY, (old) => old?.filter((e) => e.id !== id))

      return { previousDetail, previousAll }
    },
    onError: (_err, _vars, context) => {
      if (!context) return
      queryClient.setQueryData(entriesKey(workspaceId), context.previousDetail)
      for (const [key, data] of context.previousAll) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: entriesKey(workspaceId) })
      queryClient.invalidateQueries(ALL_ENTRIES_KEY)
    },
  })
}
