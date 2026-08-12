import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useStreaks, useDeleteStreak } from '@/hooks/useStreaks'
import { useStreakEntries, useToggleStreakEntry, useUpdateEntryDetails } from '@/hooks/useStreakEntries'
import { StreakCalendar } from '@/components/streaks/StreakCalendar'
import { StreakStats } from '@/components/streaks/StreakStats'
import { DayDetailModal } from '@/components/streaks/DayDetailModal'
import { CelebrationOverlay } from '@/components/streaks/CelebrationOverlay'
import { CreateStreakModal } from '@/components/streaks/CreateStreakModal'
import { Spinner } from '@/components/ui/Spinner'
import { computeStreakStats, isScheduledDay } from '@/lib/streakLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { fromDateKey } from '@/lib/utils'
import { hapticMilestone } from '@/lib/haptics'
import type { Mood } from '@/lib/types'

const MILESTONES = [7, 14, 30, 50, 100, 365]

export function StreakDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: streaks, isLoading: streaksLoading } = useStreaks()
  const streak = useMemo(() => streaks?.find((s) => s.id === id), [streaks, id])
  const { data: entries, isLoading: entriesLoading } = useStreakEntries(id)
  const toggleEntry = useToggleStreakEntry(id ?? '')
  const updateDetails = useUpdateEntryDetails(id ?? '')
  const deleteStreak = useDeleteStreak()

  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [celebration, setCelebration] = useState<number | null>(null)
  const prevStreakRef = useRef<number | null>(null)

  const stats = useMemo(
    () => (streak ? computeStreakStats(streak, entries ?? []) : null),
    [streak, entries],
  )

  useEffect(() => {
    if (!stats) return
    const prev = prevStreakRef.current
    if (prev !== null && stats.currentStreak > prev && MILESTONES.includes(stats.currentStreak)) {
      setCelebration(stats.currentStreak)
      hapticMilestone()
    }
    prevStreakRef.current = stats.currentStreak
  }, [stats])

  if (streaksLoading || entriesLoading || !streak) {
    return <Spinner />
  }

  const accent = ACCENT_COLOR_MAP[streak.color]
  const selectedEntry = entries?.find((e) => e.entry_date === selectedDayKey)
  const selectedDate = selectedDayKey ? fromDateKey(selectedDayKey) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isSelectedFuture = selectedDate ? selectedDate > today : false
  const isSelectedScheduled = selectedDate ? isScheduledDay(streak, selectedDate) : true

  function handleToggle(dateKey: string, completed: boolean) {
    toggleEntry.mutate({ dateKey, completed })
  }

  function handleSaveDetails(dateKey: string, note: string | null, mood: Mood | null) {
    updateDetails.mutate({ dateKey, note, mood })
  }

  async function handleDelete() {
    if (!id) return
    await deleteStreak.mutateAsync(id)
    navigate('/')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate('/')}
          className="size-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl">{streak.emoji}</span>
          <h1 className="font-bold text-lg sm:text-xl tracking-tight truncate">{streak.name}</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="size-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all"
            aria-label="More options"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-12 z-20 w-48 glass-panel rounded-2xl p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.4)]">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setEditOpen(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <Pencil className="size-4" /> Edit streak
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirmDelete(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm font-medium text-accent-red hover:bg-accent-red/10 transition-colors"
                >
                  <Trash2 className="size-4" /> Delete streak
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-5">
        <StreakStats streak={streak} entries={entries ?? []} />
      </div>

      <StreakCalendar
        streak={streak}
        entries={entries ?? []}
        year={view.year}
        month={view.month}
        onMonthChange={(year, month) => setView({ year, month })}
        onSelectDay={setSelectedDayKey}
      />

      <p className="text-center text-[13px] text-black/40 dark:text-white/40 mt-4">
        Tap a day to open it. Future days are locked.
      </p>

      <DayDetailModal
        open={selectedDayKey !== null}
        onClose={() => setSelectedDayKey(null)}
        streak={streak}
        dateKey={selectedDayKey}
        entry={selectedEntry}
        isFuture={isSelectedFuture}
        isScheduled={isSelectedScheduled}
        accentHex={accent.hex}
        isToggling={toggleEntry.isPending}
        onToggle={handleToggle}
        onSaveDetails={handleSaveDetails}
      />

      <CelebrationOverlay
        open={celebration !== null}
        milestone={celebration ?? 0}
        color={accent.hex}
        onDismiss={() => setCelebration(null)}
      />

      <CreateStreakModal open={editOpen} onClose={() => setEditOpen(false)} editingStreak={streak} />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative glass-panel rounded-[24px] p-5 w-full max-w-sm">
            <h3 className="font-semibold text-lg mb-1">Delete "{streak.name}"?</h3>
            <p className="text-[14px] text-black/55 dark:text-white/55 mb-4">
              This permanently deletes the streak and all its history. This can't be undone.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-11 rounded-2xl bg-black/5 dark:bg-white/10 font-medium active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-11 rounded-2xl bg-accent-red text-white font-medium active:scale-95 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
