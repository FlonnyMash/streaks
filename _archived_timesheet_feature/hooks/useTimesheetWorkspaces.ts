import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { TimesheetWorkspace, TimesheetWorkspaceInput } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

const WORKSPACES_KEY = ['timesheet-workspaces'] as const

export function useTimesheetWorkspaces() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...WORKSPACES_KEY, user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<TimesheetWorkspace[]> => {
      const { data, error } = await supabase
        .from('timesheet_workspaces')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as TimesheetWorkspace[]
    },
  })
}

export function useCreateTimesheetWorkspace() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TimesheetWorkspaceInput) => {
      if (!user) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('timesheet_workspaces')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data as TimesheetWorkspace
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...WORKSPACES_KEY, user?.id] })
    },
  })
}

export function useUpdateTimesheetWorkspace() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<TimesheetWorkspaceInput> }) => {
      const { data, error } = await supabase.from('timesheet_workspaces').update(input).eq('id', id).select().single()
      if (error) throw error
      return data as TimesheetWorkspace
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...WORKSPACES_KEY, user?.id] })
    },
  })
}

export function useDeleteTimesheetWorkspace() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('timesheet_workspaces').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...WORKSPACES_KEY, user?.id] })
    },
  })
}
