import { addDays } from 'date-fns'
import { toDateKey } from './utils'
import type { RoutineBlock } from './types'

export interface QuickCaptureResult {
  title: string
  routine: RoutineBlock
  estimated_minutes: number | null
  due_date: string | null
}

const DURATION_RE = /\b(\d{1,3})\s*(min(ute)?s?|m)\b/i

const ROUTINE_KEYWORDS: Array<{ re: RegExp; routine: RoutineBlock }> = [
  { re: /\b(morning|morgens?|früh)\b/i, routine: 'morning' },
  { re: /\b(afternoon|nachmittags?)\b/i, routine: 'afternoon' },
  { re: /\b(evening|tonight|abends?)\b/i, routine: 'evening' },
]

const DATE_KEYWORDS: Array<{ re: RegExp; days: number }> = [
  { re: /\btoday\b/i, days: 0 },
  { re: /\btomorrow\b/i, days: 1 },
]

const FILLER_RE = /^(in the|at|on|for)\s+|\s+(in the|at|on|for)$/gi

/**
 * Local, non-AI text parser for the dashboard quick-capture header. Pulls out an estimated
 * duration, a routine time-block, and a relative due date from free-form phrasing (e.g.
 * "walk the dog 15m evening"), leaving whatever's left as the task title. Anything it can't
 * confidently parse just falls back to a plain title with no routine/duration/date.
 */
export function parseQuickCapture(raw: string): QuickCaptureResult {
  let text = raw.trim()
  let routine: RoutineBlock = 'anytime'
  let estimated_minutes: number | null = null
  let due_date: string | null = null

  const durationMatch = text.match(DURATION_RE)
  if (durationMatch) {
    const minutes = Number.parseInt(durationMatch[1], 10)
    if (Number.isFinite(minutes) && minutes > 0 && minutes <= 480) {
      estimated_minutes = minutes
      text = text.replace(durationMatch[0], ' ')
    }
  }

  for (const { re, routine: block } of ROUTINE_KEYWORDS) {
    if (re.test(text)) {
      routine = block
      text = text.replace(re, ' ')
      break
    }
  }

  for (const { re, days } of DATE_KEYWORDS) {
    if (re.test(text)) {
      due_date = toDateKey(addDays(new Date(), days))
      text = text.replace(re, ' ')
      break
    }
  }

  const title = text
    .replace(/\s+/g, ' ')
    .replace(FILLER_RE, ' ')
    .trim()

  return { title: title || raw.trim(), routine, estimated_minutes, due_date }
}
