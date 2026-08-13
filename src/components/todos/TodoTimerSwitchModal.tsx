import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { useTodoTimer } from '@/hooks/useTodoTimer'
import { useTodos } from '@/hooks/useTodos'

export function TodoTimerSwitchModal() {
  const { pendingSwitchTodoId, runningTimer, confirmSwitch, cancelSwitch, isSyncing } = useTodoTimer()
  const { data: todos } = useTodos()
  const runningTodo = todos?.find((t) => t.id === runningTimer?.todoId)
  const nextTodo = todos?.find((t) => t.id === pendingSwitchTodoId)
  const open = Boolean(pendingSwitchTodoId)

  return (
    <GlassModal open={open} onClose={cancelSwitch} title="Switch timer?">
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-black/55 dark:text-white/55 -mt-1">
          A timer is already running on{' '}
          <span className="font-medium text-black/80 dark:text-white/80">
            {runningTodo?.title ?? 'another task'}
          </span>
          . Starting
          {nextTodo ? (
            <>
              {' '}
              <span className="font-medium text-black/80 dark:text-white/80">{nextTodo.title}</span>
            </>
          ) : (
            ' this one'
          )}{' '}
          will pause it.
        </p>
        <Button size="lg" className="w-full" onClick={() => void confirmSwitch()} loading={isSyncing}>
          Pause and start this task
        </Button>
        <Button variant="secondary" size="lg" className="w-full" onClick={cancelSwitch} disabled={isSyncing}>
          Keep current timer
        </Button>
      </div>
    </GlassModal>
  )
}
