import { CircleHelp } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { cn } from '@/lib/utils'

export type FeatureHelpId = 'streaks' | 'todos' | 'timesheet'

const HELP_CONTENT: Record<
  FeatureHelpId,
  {
    title: string
    what: string
    how: string[]
    goodFor: string[]
  }
> = {
  streaks: {
    title: 'About Streaks',
    what: 'Streaks help you build lasting habits by tracking days you show up. Each streak is one habit with its own schedule, calendar, and optional time goals.',
    how: [
      'Create a streak and pick how often it should count — every day, certain weekdays, or a times-per-week goal.',
      'Open a streak to mark today done, add a note or mood, and optionally log minutes if you track time.',
      'Watch your calendar fill in and use stats to see your current run, longest streak, and weekly progress.',
    ],
    goodFor: [
      'Daily habits like reading, exercise, or meditation',
      'Flexible goals such as “gym 3× per week”',
      'Habits where notes, mood, or time spent matter',
    ],
  },
  todos: {
    title: 'About Todos',
    what: 'Todos are a lightweight checklist for things you need to get done. Tasks are grouped by due date so you always see what’s urgent first.',
    how: [
      'Type in the quick-add field and press Enter to create a task instantly.',
      'Use the details button to add notes, a due date, and importance before saving.',
      'Tap a task to view details, or use the pencil to edit notes, due date, and importance.',
      'Check tasks off when done, or reorder items within a group.',
    ],
    goodFor: [
      'One-off tasks and errands',
      'Prioritizing work with due dates and importance',
      'Keeping a clear “today / upcoming / later” list',
    ],
  },
  timesheet: {
    title: 'About Timesheet',
    what: 'Timesheet tracks how you spend time across projects. Each workspace is a project, client, or job, and entries log minutes (optionally with start/end times and topics).',
    how: [
      'Create a workspace for each project you want to track.',
      'Open a workspace and tap a day on the calendar to add or edit time entries.',
      'Use the overview calendar on this page to see time across all workspaces at a glance.',
    ],
    goodFor: [
      'Freelance or client work billing',
      'Understanding where your hours go',
      'Keeping separate logs per project or role',
    ],
  },
}

export function FeatureHelpModal({
  feature,
  open,
  onClose,
}: {
  feature: FeatureHelpId
  open: boolean
  onClose: () => void
}) {
  const content = HELP_CONTENT[feature]

  return (
    <GlassModal open={open} onClose={onClose} title={content.title}>
      <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-black/70 dark:text-white/70">
        <section>
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-black/45 dark:text-white/45 mb-1.5">
            What it is
          </h3>
          <p>{content.what}</p>
        </section>

        <section>
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-black/45 dark:text-white/45 mb-1.5">
            How to use it
          </h3>
          <ol className="list-decimal pl-5 space-y-1.5">
            {content.how.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-black/45 dark:text-white/45 mb-1.5">
            What it’s good for
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            {content.goodFor.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </GlassModal>
  )
}

export function FeatureHelpIconButton({
  onClick,
  className,
  label = 'How this works',
}: {
  onClick: () => void
  className?: string
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'size-8 rounded-full inline-flex items-center justify-center',
        'text-black/40 dark:text-white/40 hover:text-accent-blue hover:bg-accent-blue/10',
        'active:scale-95 transition-all shrink-0',
        className,
      )}
    >
      <CircleHelp className="size-[18px]" />
    </button>
  )
}

export function FeatureGetStartedButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 text-[14px] font-medium text-accent-blue hover:underline underline-offset-2 active:opacity-70 transition-opacity"
    >
      Get started here
    </button>
  )
}
