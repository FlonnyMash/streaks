import { useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ChevronDown, ListTodo, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ComingSoonSection } from '@/components/layout/ComingSoonSection'
import { TodoItem } from '@/components/todos/TodoItem'
import { CreateTodoModal } from '@/components/todos/CreateTodoModal'
import { useCreateTodo, useDeleteTodo, useSwapTodoPositions, useToggleTodo, useTodos } from '@/hooks/useTodos'
import { BUCKET_LABELS, BUCKET_ORDER, groupActiveTodos, sortCompletedTodos } from '@/lib/todoLogic'
import { cn } from '@/lib/utils'
import type { Todo } from '@/lib/types'

export function TodosPage() {
  const { data: todos, isLoading } = useTodos()
  const toggleTodo = useToggleTodo()
  const deleteTodo = useDeleteTodo()
  const createTodo = useCreateTodo()
  const swapPositions = useSwapTodoPositions()

  const [quickTitle, setQuickTitle] = useState('')
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const active = useMemo(() => (todos ?? []).filter((t) => !t.done), [todos])
  const completed = useMemo(() => sortCompletedTodos((todos ?? []).filter((t) => t.done)), [todos])
  const grouped = useMemo(() => groupActiveTodos(active), [active])
  const visibleBuckets = BUCKET_ORDER.filter((bucket) => grouped[bucket].length > 0)
  const isEmpty = !isLoading && active.length === 0 && completed.length === 0

  function openEditor(todo: Todo) {
    setEditingTodo(todo)
    setModalOpen(true)
  }

  function closeEditor() {
    setModalOpen(false)
    setEditingTodo(null)
  }

  async function handleQuickAdd(e: FormEvent) {
    e.preventDefault()
    const title = quickTitle.trim()
    if (!title) return
    setQuickTitle('')
    await createTodo.mutateAsync({ title, notes: null, due_date: null })
  }

  function handleMove(bucketTodos: Todo[], index: number, direction: -1 | 1) {
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= bucketTodos.length) return
    swapPositions.mutate({ a: bucketTodos[index], b: bucketTodos[otherIndex] })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight">Todos</h1>
        <p className="text-black/50 dark:text-white/50 text-[15px] mt-0.5">Quick tasks, checked off.</p>
      </div>

      <form onSubmit={handleQuickAdd} className="flex gap-2 mb-6">
        <input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Add a task and hit enter…"
          maxLength={200}
          className={cn(
            'flex-1 h-12 rounded-2xl px-4 text-[16px] outline-none transition-all',
            'bg-black/[0.04] dark:bg-white/[0.06]',
            'border border-black/[0.06] dark:border-white/[0.08]',
            'placeholder:text-black/30 dark:placeholder:text-white/30',
            'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
          )}
        />
        <Button type="submit" size="md" disabled={!quickTitle.trim()} loading={createTodo.isPending}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </form>

      {isLoading && <Spinner />}

      {isEmpty && (
        <ComingSoonSection
          icon={ListTodo}
          title="No tasks yet"
          description="Add your first task above to start your checklist."
        />
      )}

      {!isLoading && !isEmpty && (
        <div className="flex flex-col gap-6">
          {visibleBuckets.map((bucket) => (
            <section key={bucket}>
              <h2 className="text-[13px] font-semibold text-black/45 dark:text-white/45 uppercase tracking-wide mb-2 px-1">
                {BUCKET_LABELS[bucket]} · {grouped[bucket].length}
              </h2>
              <div className="glass-panel rounded-[24px] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
                <AnimatePresence initial={false}>
                  {grouped[bucket].map((todo, index) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={(id, done) => toggleTodo.mutate({ id, done })}
                      onOpen={openEditor}
                      onDelete={(id) => deleteTodo.mutate(id)}
                      onMoveUp={() => handleMove(grouped[bucket], index, -1)}
                      onMoveDown={() => handleMove(grouped[bucket], index, 1)}
                      canMoveUp={index > 0}
                      canMoveDown={index < grouped[bucket].length - 1}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}

          {completed.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-black/45 dark:text-white/45 uppercase tracking-wide mb-2 px-1"
              >
                Completed · {completed.length}
                <ChevronDown className={cn('size-3.5 transition-transform', showCompleted && 'rotate-180')} />
              </button>
              {showCompleted && (
                <div className="glass-panel rounded-[24px] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
                  <AnimatePresence initial={false}>
                    {completed.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={(id, done) => toggleTodo.mutate({ id, done })}
                        onOpen={openEditor}
                        onDelete={(id) => deleteTodo.mutate(id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <CreateTodoModal open={modalOpen} onClose={closeEditor} editingTodo={editingTodo ?? undefined} />
    </div>
  )
}
