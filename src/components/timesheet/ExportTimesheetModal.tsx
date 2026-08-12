import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import {
  EXPORT_RANGE_KINDS,
  buildExportStats,
  computePresetRange,
  filterEntriesByRange,
  formatExportRangeLabel,
  shiftAnchor,
  type ExportRange,
  type ExportRangeKind,
} from '@/lib/timesheetLogic'
import { generateTimesheetPdf, type TimesheetPdfWorkspace } from '@/lib/timesheetPdf'
import { cn, formatMinutes, fromDateKey, toDateKey } from '@/lib/utils'
import type { TimesheetEntry } from '@/lib/types'

interface ExportTimesheetModalProps {
  open: boolean
  onClose: () => void
  title: string
  titleEmoji: string
  accentHex: string
  workspaces: TimesheetPdfWorkspace[]
  entries: TimesheetEntry[]
}

const RANGE_LABELS: Record<ExportRangeKind, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
  custom: 'Custom',
}

function todayKey(): string {
  return toDateKey(new Date())
}

export function ExportTimesheetModal({
  open,
  onClose,
  title,
  titleEmoji,
  accentHex,
  workspaces,
  entries,
}: ExportTimesheetModalProps) {
  const [kind, setKind] = useState<ExportRangeKind>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [customStart, setCustomStart] = useState(() => todayKey())
  const [customEnd, setCustomEnd] = useState(() => todayKey())
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!open) return
    setKind('month')
    setAnchor(new Date())
    setCustomStart(todayKey())
    setCustomEnd(todayKey())
    setIsExporting(false)
  }, [open])

  const range: ExportRange = useMemo(() => {
    if (kind === 'custom') {
      const start = fromDateKey(customStart || todayKey())
      const rawEnd = fromDateKey(customEnd || customStart || todayKey())
      const end = rawEnd < start ? start : rawEnd
      return { kind, start, end }
    }
    const { start, end } = computePresetRange(kind, anchor)
    return { kind, start, end }
  }, [kind, anchor, customStart, customEnd])

  const filteredEntries = useMemo(
    () => filterEntriesByRange(entries, range.start, range.end),
    [entries, range.start, range.end],
  )
  const stats = useMemo(() => buildExportStats(filteredEntries), [filteredEntries])
  const hasEntries = filteredEntries.length > 0

  function selectKind(next: ExportRangeKind) {
    setKind(next)
    if (next !== 'custom') setAnchor(new Date())
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      await generateTimesheetPdf({
        title,
        titleEmoji,
        accentHex,
        workspaces,
        entries: filteredEntries,
        range,
      })
      onClose()
    } finally {
      setIsExporting(false)
    }
  }

  const cards = [
    { label: 'Total time', value: formatMinutes(stats.totalMinutes) },
    { label: 'Days worked', value: String(stats.daysWorked) },
    { label: 'Entries', value: String(stats.entryCount) },
    { label: 'Daily avg', value: formatMinutes(stats.avgMinutesPerWorkedDay) },
  ]

  return (
    <GlassModal open={open} onClose={onClose} title="Export timesheet">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          {EXPORT_RANGE_KINDS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => selectKind(option)}
              className={cn(
                'h-9 px-4 rounded-full text-[13px] font-medium transition-all',
                kind === option
                  ? 'text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)]'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
              )}
              style={kind === option ? { backgroundColor: accentHex } : undefined}
            >
              {RANGE_LABELS[option]}
            </button>
          ))}
        </div>

        {kind === 'custom' ? (
          <div className="flex items-center gap-2">
            <label className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-black/45 dark:text-white/45 px-0.5">From</span>
              <input
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-11 w-full rounded-2xl px-3 text-[14px] font-medium outline-none transition-all bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15"
              />
            </label>
            <span className="text-black/30 dark:text-white/30 pt-5">→</span>
            <label className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-black/45 dark:text-white/45 px-0.5">To</span>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-11 w-full rounded-2xl px-3 text-[14px] font-medium outline-none transition-all bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15"
              />
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-between glass-panel rounded-2xl py-2.5 px-2">
            <button
              type="button"
              onClick={() => setAnchor((a) => shiftAnchor(kind, a, -1))}
              aria-label="Previous period"
              className="size-9 shrink-0 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-[14px] font-semibold tracking-tight text-center px-2 truncate">
              {formatExportRangeLabel(range)}
            </span>
            <button
              type="button"
              onClick={() => setAnchor((a) => shiftAnchor(kind, a, 1))}
              aria-label="Next period"
              className="size-9 shrink-0 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-2 py-3 flex flex-col items-center gap-0.5">
              <span
                className="text-[15px] font-bold tabular-nums tracking-tight"
                style={{ color: stats.totalMinutes > 0 ? accentHex : undefined }}
              >
                {card.value}
              </span>
              <span className="text-[10px] font-medium text-black/45 dark:text-white/45 text-center leading-tight">
                {card.label}
              </span>
            </div>
          ))}
        </div>

        {!hasEntries && (
          <p className="text-center text-[13px] text-black/45 dark:text-white/45">
            Nothing logged in this period yet.
          </p>
        )}

        <Button onClick={handleExport} loading={isExporting} disabled={!hasEntries} size="lg" className="w-full">
          {hasEntries ? <Download className="size-4" /> : <FileText className="size-4" />}
          Export PDF
        </Button>
      </div>
    </GlassModal>
  )
}
