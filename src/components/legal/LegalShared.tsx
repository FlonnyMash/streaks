import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LegalPageShell({
  title,
  children,
  otherHref,
  otherLabel,
}: {
  title: string
  children: ReactNode
  otherHref: string
  otherLabel: string
}) {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh safe-top safe-bottom">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) navigate(-1)
              else navigate('/login')
            }}
            className="size-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight">{title}</h1>
        </div>

        <article className="glass-panel rounded-[24px] p-5 sm:p-7 text-[15px] leading-relaxed text-black/75 dark:text-white/75">
          {children}
        </article>

        <p className="mt-5 text-center text-[13px] text-black/45 dark:text-white/45">
          See also{' '}
          <Link to={otherHref} className="text-accent-blue font-medium">
            {otherLabel}
          </Link>
        </p>
      </div>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      <h2 className="text-[17px] font-semibold tracking-tight text-black dark:text-white mb-2">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export function LegalFooterLinks({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Legal"
      className={cn('flex items-center justify-center gap-3 text-[12px] text-black/40 dark:text-white/40', className)}
    >
      <Link to="/privacy" className="hover:text-accent-blue transition-colors">
        Privacy Policy
      </Link>
      <span aria-hidden>·</span>
      <Link to="/imprint" className="hover:text-accent-blue transition-colors">
        Imprint
      </Link>
    </nav>
  )
}
