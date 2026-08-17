import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { addDays, format } from 'date-fns'
import { CalendarCog, ChevronLeft, ChevronRight, ListChecks, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TodoItem } from '@/components/todos/TodoItem'
import { CreateTodoModal, type TodoModalMode } from '@/components/todos/CreateTodoModal'
import { DayRoutineBoard } from '@/components/calendar/DayRoutineBoard'
import { RoutinesManagerModal } from '@/components/calendar/RoutinesManagerModal'
import { useDeleteTodo, useTodos } from '@/hooks/useTodos'
import { useCompleteTodoWithTime } from '@/hooks/useCompleteTodoWithTime'
import {
  useCalendarRoutineItems,
  useCalendarRoutineLogs,
  useCalendarRoutineOverride,
  useCalendarRoutines,
  useCreateCalendarRoutine,
  useCreateCalendarRoutineItem,
  useSetCalendarRoutineOverrideRange,
  useToggleCalendarRoutineLog,
} from '@/hooks/useCalendarRoutines'
import { DEFAULT_ROUTINE_PACK_EMOJI, resolveRoutineForDate } from '@/lib/calendarRoutinePacks'
import { sortCompletedTodos } from '@/lib/todoLogic'
import { cn, toDateKey } from '@/lib/utils'
import type { RoutineBlock, Todo } from '@/lib/types'

export function CalendarPage() {
  const { data: todos, isLoading: todosLoading } = useTodos()
  const completeTodo = useCompleteTodoWithTime()
  const deleteTodo = useDeleteTodo()

  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null)
  const [modalMode, setModalMode] = useState<TodoModalMode>('create')
  const [modalOpen, setModalOpen] = useState(false)
  const [routinesModalOpen, setRoutinesModalOpen] = useState(false)
  const [editRoutineId, setEditRoutineId] = useState<string | null>(null)
  const [createRoutineOpen, setCreateRoutineOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const editRoutine = searchParams.get('editRoutine')
    if (!editRoutine) return
    setEditRoutineId(editRoutine)
    setRoutinesModalOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('editRoutine')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const todayKey = toDateKey(new Date())
  const selectedKey = toDateKey(selectedDate)
  const isToday = selectedKey === todayKey

  const { data: routines, isLoading: packsLoading } = useCalendarRoutines()
  const { data: routineItems, isLoading: routinesLoading } = useCalendarRoutineItems()
  const { data: routineLogs, isLoading: logsLoading } = useCalendarRoutineLogs(selectedKey)
  const { data: dayOverride, isLoading: overrideLoading } = useCalendarRoutineOverride(selectedKey)
  const createRoutine = useCreateCalendarRoutine()
  const createRoutineItem = useCreateCalendarRoutineItem()
  const toggleRoutineLog = useToggleCalendarRoutineLog(selectedKey)
  const setOverrideRange = useSetCalendarRoutineOverrideRange()
  const dayPackPromiseRef = useRef<Promise<string> | null>(null)

  const activePacks = useMemo(() => (routines ?? []).filter((r) => !r.archived), [routines])

  const activeRoutine = useMemo(
    () => resolveRoutineForDate(routines ?? [], dayOverride, selectedDate),
    [routines, dayOverride, selectedDate],
  )

  const activeRoutineItems = useMemo(
    () => (routineItems ?? []).filter((i) => i.routine_id === activeRoutine?.id),
    [routineItems, activeRoutine],
  )

  const completedItemIds = useMemo(
    () => new Set((routineLogs ?? []).filter((l) => l.completed).map((l) => l.item_id)),
    [routineLogs],
  )

  // Todos only show up on the calendar when they carry an explicit due_date for this day —
  // that's the one intentional link; otherwise todos and calendar routines are unrelated.
  const dayTodos = useMemo(() => {
    if (!todos) return []
    return todos.filter((t) => t.due_date === selectedKey)
  }, [todos, selectedKey])

  const activeTodos = useMemo(() => dayTodos.filter((t) => !t.done), [dayTodos])
  const completedTodos = useMemo(() => sortCompletedTodos(dayTodos.filter((t) => t.done)), [dayTodos])

  const isLoading = todosLoading || packsLoading || routinesLoading || logsLoading || overrideLoading

  function openCreate() {
    setActiveTodo(null)
    setModalMode('create')
    setModalOpen(true)
  }

  function openView(todo: Todo) {
    setActiveTodo(todo)
    setModalMode('view')
    setModalOpen(true)
  }

  function openEdit(todo: Todo) {
    setActiveTodo(todo)
    setModalMode('edit')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setActiveTodo(null)
    setModalMode('create')
  }

  useEffect(() => {
    dayPackPromiseRef.current = null
  }, [selectedKey, activeRoutine?.id])

  function handleAddRoutineItem(block: Exclude<RoutineBlock, 'anytime'>, title: string, emoji: string) {
    void (async () => {
      let routineId = activeRoutine?.id
      if (!routineId) {
        if (!dayPackPromiseRef.current) {
          const pending = (async () => {
            const pack = await createRoutine.mutateAsync({
              name: format(selectedDate, 'EEE MMM d'),
              emoji: DEFAULT_ROUTINE_PACK_EMOJI,
              auto_apply_days: null,
            })
            await setOverrideRange.mutateAsync({
              routineId: pack.id,
              startDate: selectedKey,
              endDate: selectedKey,
            })
            return pack.id
          })()
          dayPackPromiseRef.current = pending
          pending.catch(() => {
            if (dayPackPromiseRef.current === pending) dayPackPromiseRef.current = null
          })
        }
        try {
          routineId = await dayPackPromiseRef.current
        } catch {
          return
        }
      }
      createRoutineItem.mutate({ routine_id: routineId, title, emoji, block })
    })()
  }

  const selectedDateLabel = isToday ? 'today' : format(selectedDate, 'MMM d')

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-black/50 dark:text-white/50 text-[15px] mt-0.5">
            {activeRoutine ? `Showing your ${activeRoutine.name} routine.` : 'Your Morning, Afternoon, and Evening routines.'}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setCreateRoutineOpen(false)
            setRoutinesModalOpen(true)
          }}
        >
          <CalendarCog className="size-4" />
          Routines
        </Button>
      </div>

      <div className="glass-panel rounded-[24px] p-3 flex flex-col gap-2 mb-6">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate((d) => addDays(d, -1))}
            aria-label="Previous day"
            className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[15px] font-semibold">{format(selectedDate, 'EEEE, MMM d')}</span>
            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(new Date())}
                className="text-[12px] font-medium text-accent-blue mt-0.5"
              >
                Jump to today
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            aria-label="Next day"
            className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {activePacks.length > 0 && (
          <div className="flex items-center gap-2 px-1 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
            <span className="text-[12px] font-medium text-black/45 dark:text-white/45 shrink-0">
              Routine for this day
            </span>
            <select
              aria-label="Switch routine for this day"
              value={activeRoutine?.id ?? ''}
              onChange={(e) => {
                if (e.target.value === '__create__') {
                  setEditRoutineId(null)
                  setCreateRoutineOpen(true)
                  setRoutinesModalOpen(true)
                  return
                }
                if (!e.target.value) {
                  setOverrideRange.mutate({
                    routineId: null,
                    startDate: selectedKey,
                    endDate: selectedKey,
                  })
                  return
                }
                setOverrideRange.mutate({
                  routineId: e.target.value,
                  startDate: selectedKey,
                  endDate: selectedKey,
                })
              }}
              className="flex-1 min-w-0 h-9 rounded-lg px-2.5 text-[13px] font-medium outline-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15"
            >
              <option value="">No routine for this day</option>
              {activePacks.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.emoji} {pack.name}
                </option>
              ))}
              <option value="__create__">+ Create new…</option>
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-8">
          {!activeRoutine && (
            <div className="glass-panel rounded-[24px] px-4 py-5 flex flex-col items-center gap-3 text-center">
              <p className="text-[14px] text-black/50 dark:text-white/50">
                No routine set up yet for this day. Create one to start building your Morning,
                Afternoon, and Evening blocks — or add items below just for {selectedDateLabel}.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  setCreateRoutineOpen(true)
                  setRoutinesModalOpen(true)
                }}
              >
                <CalendarCog className="size-4" />
                Set up a routine
              </Button>
            </div>
          )}

          <DayRoutineBoard
            items={activeRoutineItems}
            completedItemIds={completedItemIds}
            onToggle={(itemId, completed) => toggleRoutineLog.mutate({ itemId, completed })}
            onAddItem={handleAddRoutineItem}
          />

          <section>
            <div className="flex items-center gap-2 mb-2 px-1">
              <ListChecks className="size-4 text-black/40 dark:text-white/40" />
              <h2 className="text-[13px] font-semibold text-black/45 dark:text-white/45 uppercase tracking-wide">
                Tasks due {isToday ? 'today' : format(selectedDate, 'MMM d')}
                {dayTodos.length > 0 ? ` · ${dayTodos.length}` : ''}
              </h2>
            </div>

            {activeTodos.length > 0 && (
              <div className="glass-panel rounded-[24px] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden mb-3">
                <AnimatePresence initial={false}>
                  {activeTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={(_id, done) => void completeTodo(todo, done)}
                      onView={openView}
                      onEdit={openEdit}
                      onDelete={(id) => deleteTodo.mutate(id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {completedTodos.length > 0 && (
              <div className="mb-3">
                <p className="text-[12px] font-medium text-black/40 dark:text-white/40 px-1 mb-1.5">
                  Completed · {completedTodos.length}
                </p>
                <div className="glass-panel rounded-[24px] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
                  <AnimatePresence initial={false}>
                    {completedTodos.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={(_id, done) => void completeTodo(todo, done)}
                        onView={openView}
                        onEdit={openEdit}
                        onDelete={(id) => deleteTodo.mutate(id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {dayTodos.length === 0 && (
              <div className="glass-panel rounded-[20px] px-4 py-3 text-[13px] text-black/40 dark:text-white/40 mb-3">
                No tasks due {isToday ? 'today' : 'this day'}. Tasks only show up here if you give them a due date.
              </div>
            )}

            <Button type="button" variant="secondary" size="md" className={cn('self-start')} onClick={openCreate}>
              <Plus className="size-4" />
              Add a task
            </Button>
          </section>
        </div>
      )}

      <CreateTodoModal
        open={modalOpen}
        onClose={closeModal}
        todo={activeTodo ?? undefined}
        mode={modalMode}
        initialDueDate={selectedKey}
      />

      <RoutinesManagerModal
        open={routinesModalOpen}
        onClose={() => {
          setRoutinesModalOpen(false)
          setEditRoutineId(null)
          setCreateRoutineOpen(false)
        }}
        selectedDateKey={selectedKey}
        selectedDateLabel={selectedDateLabel}
        startEditingId={editRoutineId}
        startCreate={createRoutineOpen}
      />
    </div>
  )
}
