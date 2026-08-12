import type { AccentColor } from './types'

interface AccentColorConfig {
  hex: string
  bg: string
  text: string
  ring: string
  border: string
}

export const ACCENT_COLOR_MAP: Record<AccentColor, AccentColorConfig> = {
  blue: { hex: '#0a84ff', bg: 'bg-accent-blue', text: 'text-accent-blue', ring: 'ring-accent-blue', border: 'border-accent-blue' },
  green: { hex: '#30d158', bg: 'bg-accent-green', text: 'text-accent-green', ring: 'ring-accent-green', border: 'border-accent-green' },
  indigo: { hex: '#5e5ce6', bg: 'bg-accent-indigo', text: 'text-accent-indigo', ring: 'ring-accent-indigo', border: 'border-accent-indigo' },
  orange: { hex: '#ff9f0a', bg: 'bg-accent-orange', text: 'text-accent-orange', ring: 'ring-accent-orange', border: 'border-accent-orange' },
  pink: { hex: '#ff375f', bg: 'bg-accent-pink', text: 'text-accent-pink', ring: 'ring-accent-pink', border: 'border-accent-pink' },
  red: { hex: '#ff453a', bg: 'bg-accent-red', text: 'text-accent-red', ring: 'ring-accent-red', border: 'border-accent-red' },
  teal: { hex: '#64d2ff', bg: 'bg-accent-teal', text: 'text-accent-teal', ring: 'ring-accent-teal', border: 'border-accent-teal' },
  yellow: { hex: '#ffd60a', bg: 'bg-accent-yellow', text: 'text-accent-yellow', ring: 'ring-accent-yellow', border: 'border-accent-yellow' },
}

export const EMOJI_OPTIONS = [
  '🔥', '💪', '🏃', '🏋️', '🧘', '📚', '✍️', '🎨',
  '🎸', '💧', '🥗', '😴', '🚭', '🧠', '☀️', '🎯',
  '💻', '🧹', '🙏', '🚴', '🏊', '🎧', '📷', '🌱',
]
