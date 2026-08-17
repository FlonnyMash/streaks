import { Moon, Sparkles, Sun, Sunrise } from 'lucide-react'
import type { Todo, RoutineBlock } from './types'

export const ROUTINE_ORDER: RoutineBlock[] = ['morning', 'afternoon', 'evening', 'anytime']

export const ROUTINE_LABELS: Record<RoutineBlock, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
}

export const ROUTINE_SHORT_LABELS: Record<RoutineBlock, string> = {
  morning: 'AM',
  afternoon: 'PM',
  evening: 'Eve',
  anytime: 'Any',
}

export const ROUTINE_ICONS: Record<RoutineBlock, typeof Sun> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
  anytime: Sparkles,
}

/** Tailwind accent classes per routine block, matching the app's existing accent palette. */
export const ROUTINE_ACCENT: Record<RoutineBlock, { hex: string; bg: string; text: string }> = {
  morning: { hex: '#ff9f0a', bg: 'bg-accent-orange/15', text: 'text-accent-orange' },
  afternoon: { hex: '#0a84ff', bg: 'bg-accent-blue/15', text: 'text-accent-blue' },
  evening: { hex: '#5e5ce6', bg: 'bg-accent-indigo/15', text: 'text-accent-indigo' },
  anytime: { hex: '#8e8e93', bg: 'bg-black/[0.06] dark:bg-white/[0.08]', text: 'text-black/50 dark:text-white/50' },
}

export const DURATION_PRESETS = [10, 15, 30, 45, 60] as const

/** Groups todos into their routine time-block, sorted by importance then manual position. */
export function groupTodosByRoutine(todos: Todo[]): Record<RoutineBlock, Todo[]> {
  const groups: Record<RoutineBlock, Todo[]> = { morning: [], afternoon: [], evening: [], anytime: [] }
  for (const todo of todos) {
    groups[todo.routine ?? 'anytime'].push(todo)
  }
  for (const block of ROUTINE_ORDER) {
    groups[block].sort((a, b) => b.importance - a.importance || a.position - b.position)
  }
  return groups
}

/** Total estimated minutes across a list of todos (ignores tasks with no estimate). */
export function totalEstimatedMinutes(todos: Todo[]): number {
  return todos.reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0)
}
