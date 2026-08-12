import type { jsPDF as JsPDFType } from 'jspdf'
import { format } from 'date-fns'
import brandIconWhite from '@/assets/brand-icon-white.png'
import type { TimesheetEntry } from './types'
import { buildExportStats, formatClockTime, formatExportRangeLabel, type ExportRange } from './timesheetLogic'
import { formatMinutes, fromDateKey, toDateKey } from './utils'
import { LEGAL } from './legalInfo'

export interface TimesheetPdfWorkspace {
  id: string
  name: string
  emoji: string
}

export interface GenerateTimesheetPdfOptions {
  /** Report title — a workspace name, or "All Workspaces" for the cross-workspace export. */
  title: string
  titleEmoji: string
  /** Hex accent color used for the header bar and highlights. */
  accentHex: string
  /** Workspaces referenced by `entries.workspace_id`, used to label the breakdown/detail tables. */
  workspaces: TimesheetPdfWorkspace[]
  /** Entries already filtered to the selected export range. */
  entries: TimesheetEntry[]
  range: ExportRange
}

interface JsPDFWithAutoTable extends JsPDFType {
  lastAutoTable?: { finalY: number }
}

const PAGE_MARGIN = 40
const BRAND = `Created with ${LEGAL.appName}`
const BRAND_SHORT = 'Mashed'

/** Blends a hex color towards white — `amount` 1 = full color, 0 = white. */
function tint(hex: string, amount: number): string {
  const clean = hex.replace('#', '')
  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)
  const mix = (channel: number) => Math.round(channel * amount + 255 * (1 - amount))
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

function sanitizeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Loads a Vite-bundled image URL into a data URL jsPDF can embed. */
async function imageUrlToDataUrl(src: string): Promise<string> {
  const response = await fetch(src)
  const blob = await response.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Generates a styled PDF timesheet report for the given range and triggers a browser download. */
export async function generateTimesheetPdf(options: GenerateTimesheetPdfOptions): Promise<void> {
  // Loaded lazily — jsPDF pulls in a sizeable HTML-rendering dependency chain we don't need
  // for the rest of the app, so keep it out of the main bundle until an export is requested.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])

  const { title, accentHex, workspaces, entries, range } = options
  const workspaceMap = new Map(workspaces.map((w) => [w.id, w]))
  const showWorkspaceColumn = workspaces.length > 1
  const stats = buildExportStats(entries)

  const doc = new jsPDF({ unit: 'pt', format: 'a4' }) as JsPDFWithAutoTable
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - PAGE_MARGIN * 2

  let brandIconDataUrl: string | null = null
  try {
    brandIconDataUrl = await imageUrlToDataUrl(brandIconWhite)
  } catch {
    brandIconDataUrl = null
  }

  function ensureSpace(y: number, needed: number): number {
    if (y + needed <= pageHeight - PAGE_MARGIN - 24) return y
    doc.addPage()
    return PAGE_MARGIN
  }

  function sectionTitle(text: string, y: number): number {
    const nextY = ensureSpace(y, 40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor('#111111')
    doc.text(text, PAGE_MARGIN, nextY)
    return nextY + 14
  }

  function table(startY: number, head: string[], body: (string | number)[][], columnStyles?: Record<number, { halign: 'left' | 'right' | 'center' }>): number {
    autoTable(doc, {
      startY,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN },
      head: [head],
      body,
      theme: 'plain',
      styles: {
        fontSize: 9.5,
        textColor: '#222222',
        cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
        lineColor: '#e8e8ea',
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: tint(accentHex, 0.14),
        textColor: '#111111',
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: '#f8f8f9' },
      columnStyles,
    })
    return (doc.lastAutoTable?.finalY ?? startY) + 26
  }

  // Header — brand mark + workspace title (no emoji: Helvetica can't render them)
  const headerHeight = 96
  doc.setFillColor(accentHex)
  doc.rect(0, 0, pageWidth, headerHeight, 'F')

  const iconSize = 16
  if (brandIconDataUrl) {
    try {
      doc.addImage(brandIconDataUrl, 'PNG', PAGE_MARGIN, 18, iconSize, iconSize)
    } catch {
      brandIconDataUrl = null
    }
  }

  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(
    `${BRAND_SHORT.toUpperCase()}  ·  TIMESHEET REPORT`,
    PAGE_MARGIN + (brandIconDataUrl ? iconSize + 8 : 0),
    30,
  )

  doc.setFontSize(21)
  doc.text(title, PAGE_MARGIN, 58)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11.5)
  doc.text(formatExportRangeLabel(range), PAGE_MARGIN, 78)

  doc.setFontSize(8.5)
  doc.text(`Generated ${format(new Date(), 'MMM d, yyyy · h:mm a')}`, pageWidth - PAGE_MARGIN, 78, { align: 'right' })

  let y = headerHeight + 34

  if (entries.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor('#666666')
    doc.text('No time was logged in this period.', pageWidth / 2, y + 20, { align: 'center' })
    doc.save(`timesheet-${sanitizeFilenamePart(title)}-${toDateKey(range.start)}_${toDateKey(range.end)}.pdf`)
    return
  }

  // Summary stat cards
  const cards: Array<{ label: string; value: string }> = [
    { label: 'Total time', value: formatMinutes(stats.totalMinutes) },
    { label: 'Days worked', value: String(stats.daysWorked) },
    { label: 'Entries logged', value: String(stats.entryCount) },
    { label: 'Daily average', value: formatMinutes(stats.avgMinutesPerWorkedDay) },
  ]
  const cardGap = 12
  const cardWidth = (contentWidth - cardGap * (cards.length - 1)) / cards.length
  const cardHeight = 58
  cards.forEach((card, index) => {
    const x = PAGE_MARGIN + index * (cardWidth + cardGap)
    doc.setFillColor(tint(accentHex, 0.09))
    doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor('#111111')
    doc.text(card.value, x + cardWidth / 2, y + 26, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor('#666666')
    doc.text(card.label.toUpperCase(), x + cardWidth / 2, y + 42, { align: 'center' })
  })
  y += cardHeight + 30

  // By workspace (only meaningful for multi-workspace exports)
  if (showWorkspaceColumn && stats.byWorkspace.length > 0) {
    y = sectionTitle('By workspace', y)
    y = table(
      y,
      ['Workspace', 'Time', '% of total'],
      stats.byWorkspace.map((w) => {
        const ws = workspaceMap.get(w.workspaceId)
        const pct = stats.totalMinutes > 0 ? Math.round((w.minutes / stats.totalMinutes) * 100) : 0
        return [ws?.name ?? 'Unknown', formatMinutes(w.minutes), `${pct}%`]
      }),
      { 1: { halign: 'right' }, 2: { halign: 'right' } },
    )
  }

  // By topic
  const hasTopics = entries.some((e) => e.topic?.trim())
  if (hasTopics) {
    y = sectionTitle('By topic', y)
    y = table(
      y,
      ['Topic', 'Time', '% of total'],
      stats.byTopic.map((t) => {
        const pct = stats.totalMinutes > 0 ? Math.round((t.minutes / stats.totalMinutes) * 100) : 0
        return [t.topic, formatMinutes(t.minutes), `${pct}%`]
      }),
      { 1: { halign: 'right' }, 2: { halign: 'right' } },
    )
  }

  // Single chronological log — date, weekday, range, duration, topic, note
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.entry_date !== b.entry_date) return a.entry_date.localeCompare(b.entry_date)
    return (a.start_time ?? '').localeCompare(b.start_time ?? '')
  })
  y = sectionTitle('Entries', y)
  const durationCol = showWorkspaceColumn ? 4 : 3
  table(
    y,
    [
      'Date',
      'Weekday',
      ...(showWorkspaceColumn ? ['Workspace'] : []),
      'Time range',
      'Duration',
      'Topic',
      'Note',
    ],
    sortedEntries.map((entry) => {
      const ws = workspaceMap.get(entry.workspace_id)
      const date = fromDateKey(entry.entry_date)
      const startLabel = formatClockTime(entry.start_time)
      const endLabel = formatClockTime(entry.end_time)
      const timeRange = startLabel && endLabel ? `${startLabel} – ${endLabel}` : '—'
      return [
        format(date, 'MMM d, yyyy'),
        format(date, 'EEEE'),
        ...(showWorkspaceColumn ? [ws?.name ?? 'Unknown'] : []),
        timeRange,
        formatMinutes(entry.minutes),
        entry.topic || '—',
        entry.note || '—',
      ]
    }),
    { [durationCol]: { halign: 'right' } },
  )

  // Footer on every page
  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor('#9a9a9a')
    doc.text(BRAND, PAGE_MARGIN, pageHeight - 20)
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 20, { align: 'right' })
  }

  doc.save(`timesheet-${sanitizeFilenamePart(title)}-${toDateKey(range.start)}_${toDateKey(range.end)}.pdf`)
}
