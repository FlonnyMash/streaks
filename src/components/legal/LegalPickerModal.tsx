import { useNavigate } from 'react-router-dom'
import { ChevronRight, Scale } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'

const LEGAL_ITEMS = [
  { to: '/privacy', label: 'Privacy Policy', hint: 'How we handle your data' },
  { to: '/legal', label: 'Legal', hint: 'Imprint and contact details' },
] as const

export function LegalPickerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()

  return (
    <GlassModal open={open} onClose={onClose} title="Legal">
      <div className="flex flex-col gap-2">
        {LEGAL_ITEMS.map((item) => (
          <button
            key={item.to}
            type="button"
            onClick={() => {
              onClose()
              navigate(item.to)
            }}
            className="flex items-center gap-3 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] px-3.5 py-3.5 text-left hover:bg-black/[0.07] dark:hover:bg-white/[0.1] active:scale-[0.99] transition-all"
          >
            <div className="size-10 rounded-xl bg-accent-teal/15 flex items-center justify-center shrink-0">
              <Scale className="size-4 text-accent-teal" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.label}</p>
              <p className="text-[13px] text-black/45 dark:text-white/45">{item.hint}</p>
            </div>
            <ChevronRight className="size-4 text-black/30 dark:text-white/30 shrink-0" />
          </button>
        ))}
      </div>
    </GlassModal>
  )
}
