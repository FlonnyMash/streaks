import { supabase } from '@/lib/supabaseClient'
import type { TodoTopic } from '@/lib/types'
import { normalizeTopicName } from '@/lib/todoLogic'

async function fetchUserTopics(userId: string): Promise<TodoTopic[]> {
  const { data, error } = await supabase.from('todo_topics').select('*').eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as TodoTopic[]
}

async function resolveTopicIds(userId: string, topicNames: string[]): Promise<string[]> {
  const names = [...new Set(topicNames.map(normalizeTopicName).filter(Boolean))]
  if (names.length === 0) return []

  const existing = await fetchUserTopics(userId)
  const byLower = new Map(existing.map((t) => [t.name.toLowerCase(), t]))
  const ids: string[] = []

  for (const name of names) {
    const found = byLower.get(name.toLowerCase())
    if (found) {
      ids.push(found.id)
      continue
    }

    const { data, error } = await supabase
      .from('todo_topics')
      .insert({ user_id: userId, name })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        const retry = await fetchUserTopics(userId)
        const match = retry.find((t) => t.name.toLowerCase() === name.toLowerCase())
        if (!match) throw error
        byLower.set(match.name.toLowerCase(), match)
        ids.push(match.id)
        continue
      }
      throw error
    }

    const created = data as TodoTopic
    byLower.set(created.name.toLowerCase(), created)
    ids.push(created.id)
  }

  return ids
}

export async function syncTodoTopics(userId: string, todoId: string, topicNames: string[]): Promise<void> {
  const topicIds = await resolveTopicIds(userId, topicNames)

  const { error: deleteError } = await supabase.from('todo_topic_links').delete().eq('todo_id', todoId)
  if (deleteError) throw deleteError

  if (topicIds.length === 0) return

  const { error: insertError } = await supabase
    .from('todo_topic_links')
    .insert(topicIds.map((topic_id) => ({ todo_id: todoId, topic_id })))
  if (insertError) throw insertError
}
