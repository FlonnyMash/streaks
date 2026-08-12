import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GlassModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function GlassModal({ open, onClose, title, children, className }: GlassModalProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn(
              'relative w-full sm:max-w-md max-h-[88vh] overflow-y-auto',
              'glass-panel rounded-t-[28px] sm:rounded-[28px]',
              'p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5',
              'shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]',
              className,
            )}
          >
            <div className="flex items-center justify-between mb-4">
              {title ? <h2 className="text-lg font-semibold tracking-tight">{title}</h2> : <span />}
              <button
                onClick={onClose}
                aria-label="Close"
                className="size-8 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
