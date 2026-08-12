import type { Todo, TodoTopic } from './types'
import { toDateKey } from './utils'

export const TODO_TOPIC_MAX_LENGTH = 40

/** Trim, collapse whitespace, and cap length to match the DB check. */
export function normalizeTopicName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, TODO_TOPIC_MAX_LENGTH)
}

/** Unique topics from a todo list, sorted by name. */
export function uniqueTopicsFromTodos(todos: Todo[]): TodoTopic[] {
  const map = new Map<string, TodoTopic>()
  for (const todo of todos) {
    for (const topic of todo.topics ?? []) {
      map.set(topic.id, topic)
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export type TodoBucket = 'overdue' | 'today' | 'upcoming' | 'noDate'

export const BUCKET_ORDER: TodoBucket[] = ['overdue', 'today', 'upcoming', 'noDate']

export const BUCKET_LABELS: Record<TodoBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  noDate: 'No date',
}

export function bucketFor(todo: Pick<Todo, 'due_date'>, todayKey: string): TodoBucket {
  if (!todo.due_date) return 'noDate'
  if (todo.due_date < todayKey) return 'overdue'
  if (todo.due_date === todayKey) return 'today'
  return 'upcoming'
}

/** Groups active (not-done) todos into due-date buckets, sorted by importance then position. */
export function groupActiveTodos(todos: Todo[]): Record<TodoBucket, Todo[]> {
  const todayKey = toDateKey(new Date())
  const groups: Record<TodoBucket, Todo[]> = { overdue: [], today: [], upcoming: [], noDate: [] }
  for (const todo of todos) {
    groups[bucketFor(todo, todayKey)].push(todo)
  }
  for (const bucket of BUCKET_ORDER) {
    groups[bucket].sort(
      (a, b) =>
        b.importance - a.importance ||
        a.position - b.position ||
        a.due_date?.localeCompare(b.due_date ?? '') ||
        0,
    )
  }
  return groups
}

export function sortCompletedTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
}
