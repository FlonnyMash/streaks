import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ChevronDown, ListTodo, Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TodoItem } from '@/components/todos/TodoItem'
import { CreateTodoModal, type TodoModalMode } from '@/components/todos/CreateTodoModal'
import {
  FeatureGetStartedButton,
  FeatureHelpIconButton,
  FeatureHelpModal,
} from '@/components/ui/FeatureHelp'
import { useCreateTodo, useDeleteTodo, useSwapTodoPositions, useTodos } from '@/hooks/useTodos'
import { useCompleteTodoWithTime } from '@/hooks/useTodoTimePrompt'
import { BUCKET_LABELS, BUCKET_ORDER, groupActiveTodos, sortCompletedTodos, uniqueTopicsFromTodos } from '@/lib/todoLogic'
import { cn } from '@/lib/utils'
import type { Todo } from '@/lib/types'

export function TodosPage() {
  const { data: todos, isLoading } = useTodos()
  const completeTodo = useCompleteTodoWithTime()
  const deleteTodo = useDeleteTodo()
  const createTodo = useCreateTodo()
  const swapPositions = useSwapTodoPositions()

  const [quickTitle, setQuickTitle] = useState('')
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null)
  const [modalMode, setModalMode] = useState<TodoModalMode>('create')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalInitialTitle, setModalInitialTitle] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  const active = useMemo(() => (todos ?? []).filter((t) => !t.done), [todos])
  const completed = useMemo(() => sortCompletedTodos((todos ?? []).filter((t) => t.done)), [todos])
  const filterTopics = useMemo(
    () => uniqueTopicsFromTodos(showCompleted ? [...active, ...completed] : active),
    [active, completed, showCompleted],
  )

  useEffect(() => {
    if (selectedTopicId && !filterTopics.some((t) => t.id === selectedTopicId)) {
      setSelectedTopicId(null)
    }
  }, [selectedTopicId, filterTopics])

  const filteredActive = useMemo(
    () => (selectedTopicId ? active.filter((t) => (t.topics ?? []).some((tp) => tp.id === selectedTopicId)) : active),
    [active, selectedTopicId],
  )
  const filteredCompleted = useMemo(
    () =>
      selectedTopicId
        ? completed.filter((t) => (t.topics ?? []).some((tp) => tp.id === selectedTopicId))
        : completed,
    [completed, selectedTopicId],
  )
  const grouped = useMemo(() => groupActiveTodos(filteredActive), [filteredActive])
  const visibleBuckets = BUCKET_ORDER.filter((bucket) => grouped[bucket].length > 0)
  const isEmpty = !isLoading && active.length === 0 && completed.length === 0
  const showHelpIcon = !isEmpty && !isLoading

  function openCreate(prefillTitle = '') {
    setActiveTodo(null)
    setModalMode('create')
    setModalInitialTitle(prefillTitle)
    setModalOpen(true)
  }

  function openView(todo: Todo) {
    setActiveTodo(todo)
    setModalMode('view')
    setModalInitialTitle('')
    setModalOpen(true)
  }

  function openEdit(todo: Todo) {
    setActiveTodo(todo)
    setModalMode('edit')
    setModalInitialTitle('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setActiveTodo(null)
    setModalMode('create')
    setModalInitialTitle('')
  }

  async function handleQuickAdd(e: FormEvent) {
    e.preventDefault()
    const title = quickTitle.trim()
    if (!title) return
    setQuickTitle('')
    await createTodo.mutateAsync({ title, notes: null, due_date: null, importance: 2 })
  }

  function handleOpenDetails() {
    const title = quickTitle.trim()
    setQuickTitle('')
    openCreate(title)
  }

  function handleMove(bucketTodos: Todo[], index: number, direction: -1 | 1) {
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= bucketTodos.length) return
    swapPositions.mutate({ a: bucketTodos[index], b: bucketTodos[otherIndex] })
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight">Todos</h1>
            {showHelpIcon && <FeatureHelpIconButton onClick={() => setHelpOpen(true)} className="sm:hidden" />}
          </div>
          <p className="text-black/50 dark:text-white/50 text-[15px] mt-0.5">Quick tasks, checked off.</p>
        </div>
        {showHelpIcon && (
          <FeatureHelpIconButton onClick={() => setHelpOpen(true)} className="hidden sm:inline-flex mt-1" />
        )}
      </div>

      <form onSubmit={handleQuickAdd} className="flex gap-2 mb-6">
        <input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Add a task and hit enter…"
          maxLength={200}
          className={cn(
            'flex-1 min-w-0 h-12 rounded-2xl px-4 text-[16px] outline-none transition-all',
            'bg-black/[0.04] dark:bg-white/[0.06]',
            'border border-black/[0.06] dark:border-white/[0.08]',
            'placeholder:text-black/30 dark:placeholder:text-white/30',
            'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={handleOpenDetails}
          aria-label="Add with details"
          title="Add with details"
          className="shrink-0 px-3"
        >
          <SlidersHorizontal className="size-4" />
        </Button>
        <Button type="submit" size="md" disabled={!quickTitle.trim()} loading={createTodo.isPending} className="shrink-0">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </form>

      {!isLoading && !isEmpty && filterTopics.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto py-1 mb-4 -mx-1 px-1">
          <button
            type="button"
            onClick={() => setSelectedTopicId(null)}
            className={cn(
              'h-8 px-3 rounded-full text-[12px] font-medium transition-all shrink-0',
              selectedTopicId === null
                ? 'bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
            )}
          >
            All
          </button>
          {filterTopics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => setSelectedTopicId(topic.id)}
              className={cn(
                'h-8 px-3 rounded-full text-[12px] font-medium transition-all shrink-0',
                selectedTopicId === topic.id
                  ? 'bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
              )}
            >
              {topic.name}
            </button>
          ))}
        </div>
      )}

      {isLoading && <Spinner />}

      {isEmpty && (
        <div className="glass-panel rounded-[28px] p-10 flex flex-col items-center text-center gap-3 mt-6">
          <ListTodo className="size-8 text-accent-orange" />
          <h2 className="font-semibold text-lg">No tasks yet</h2>
          <p className="text-black/50 dark:text-white/50 text-[15px] max-w-xs">
            Add your first task to start your checklist.
          </p>
          <button
            onClick={() => openCreate()}
            className="mt-2 inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-accent-blue text-white font-medium active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            Create a task
          </button>
          <FeatureGetStartedButton onClick={() => setHelpOpen(true)} />
        </div>
      )}

      {!isLoading && !isEmpty && (
        <div className="flex flex-col gap-6">
          {selectedTopicId && visibleBuckets.length === 0 && (
            <p className="text-[14px] text-black/45 dark:text-white/45 px-1">No active tasks with this topic.</p>
          )}
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
                      onToggle={(_id, done) => completeTodo(todo, done)}
                      onView={openView}
                      onEdit={openEdit}
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
                Completed · {filteredCompleted.length}
                {selectedTopicId && filteredCompleted.length !== completed.length && (
                  <span className="normal-case tracking-normal font-medium text-black/35 dark:text-white/35">
                    of {completed.length}
                  </span>
                )}
                <ChevronDown className={cn('size-3.5 transition-transform', showCompleted && 'rotate-180')} />
              </button>
              {showCompleted && filteredCompleted.length > 0 && (
                <div className="glass-panel rounded-[24px] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
                  <AnimatePresence initial={false}>
                    {filteredCompleted.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={(_id, done) => completeTodo(todo, done)}
                        onView={openView}
                        onEdit={openEdit}
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

      <CreateTodoModal
        open={modalOpen}
        onClose={closeModal}
        todo={activeTodo ?? undefined}
        mode={modalMode}
        initialTitle={modalInitialTitle}
      />
      <FeatureHelpModal feature="todos" open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
