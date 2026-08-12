import { useEffect, useState, type ReactNode } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  canPromptInstall,
  getInstallPlatform,
  isStandaloneDisplay,
  promptPwaInstall,
  subscribeInstallPrompt,
  type InstallPlatform,
} from '@/lib/pwa'

const TIP_DISMISSED_KEY = 'add-to-home-screen-tip-dismissed'

function TapRing({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full',
        'ring-2 ring-accent-blue bg-accent-blue/20',
        'animate-pulse',
        className,
      )}
    />
  )
}

function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-[220px] overflow-hidden rounded-[22px]',
        'bg-black/[0.04] dark:bg-white/[0.06] ring-1 ring-black/10 dark:ring-white/12',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Safari address-bar ••• menu */
function SafariMoreDiagram() {
  return (
    <PhoneFrame>
      <div className="h-9 flex items-center gap-2 px-3 border-b border-black/5 dark:border-white/8">
        <div className="h-4 flex-1 rounded-full bg-black/8 dark:bg-white/10" />
        <span className="relative flex items-center justify-center size-7 shrink-0">
          <MoreHorizontal className="size-5 text-accent-blue" strokeWidth={2.25} />
          <TapRing />
        </span>
      </div>
      <div className="h-24 flex items-center justify-center">
        <div className="size-8 rounded-xl bg-black/8 dark:bg-white/10" />
      </div>
    </PhoneFrame>
  )
}

/** Share row inside the Safari ••• menu */
function SafariShareFromMenuDiagram() {
  return (
    <PhoneFrame>
      <div className="px-3 pt-3 pb-2">
        <div className="rounded-2xl bg-white dark:bg-white/10 shadow-sm overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
          <div className="px-3 py-2.5 flex items-center gap-2.5 border-b border-black/5 dark:border-white/8 opacity-40">
            <span className="size-4 rounded bg-black/10 dark:bg-white/15" />
            <span className="h-2.5 w-16 rounded bg-black/10 dark:bg-white/15" />
          </div>
          <div className="relative px-3 py-2.5 flex items-center gap-2.5 bg-accent-blue/10">
            <Share className="size-4 text-accent-blue shrink-0" strokeWidth={2.25} />
            <span className="text-[12px] font-semibold text-accent-blue">Share…</span>
            <TapRing className="left-auto right-3 translate-x-0" />
          </div>
          <div className="px-3 py-2.5 flex items-center gap-2.5 border-t border-black/5 dark:border-white/8 opacity-40">
            <span className="size-4 rounded bg-black/10 dark:bg-white/15" />
            <span className="h-2.5 w-20 rounded bg-black/10 dark:bg-white/15" />
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}

/** Show More in the share sheet */
function SafariShowMoreDiagram() {
  return (
    <PhoneFrame>
      <div className="px-3 pt-3 pb-2">
        <div className="rounded-2xl bg-white dark:bg-white/10 shadow-sm overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
          <div className="px-3 py-2 flex gap-2 opacity-35">
            <span className="size-9 rounded-xl bg-black/10 dark:bg-white/15" />
            <span className="size-9 rounded-xl bg-black/10 dark:bg-white/15" />
            <span className="size-9 rounded-xl bg-black/10 dark:bg-white/15" />
          </div>
          <div className="px-3 py-2 border-t border-black/5 dark:border-white/8 opacity-40">
            <div className="h-2.5 w-24 rounded bg-black/10 dark:bg-white/15" />
          </div>
          <div className="relative px-3 py-2.5 flex items-center gap-2.5 bg-accent-blue/10 border-t border-black/5 dark:border-white/8">
            <ChevronDown className="size-4 text-accent-blue shrink-0" strokeWidth={2.25} />
            <span className="text-[12px] font-semibold text-accent-blue">Show More</span>
            <TapRing className="left-auto right-3 translate-x-0" />
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}

function SafariAddToHomeDiagram() {
  return (
    <PhoneFrame>
      <div className="px-3 pt-3 pb-2">
        <div className="rounded-2xl bg-white dark:bg-white/10 shadow-sm overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
          <div className="px-3 py-2.5 flex items-center gap-2.5 border-b border-black/5 dark:border-white/8 opacity-45">
            <span className="size-4 rounded bg-black/10 dark:bg-white/15" />
            <span className="h-2.5 w-20 rounded bg-black/10 dark:bg-white/15" />
          </div>
          <div className="relative px-3 py-2.5 flex items-center gap-2.5 bg-accent-blue/10">
            <PlusSquare className="size-4 text-accent-blue shrink-0" strokeWidth={2.25} />
            <span className="text-[12px] font-semibold text-accent-blue">Add to Home Screen</span>
            <TapRing className="left-auto right-3 translate-x-0" />
          </div>
          <div className="px-3 py-2.5 flex items-center gap-2.5 border-t border-black/5 dark:border-white/8 opacity-45">
            <span className="size-4 rounded bg-black/10 dark:bg-white/15" />
            <span className="h-2.5 w-16 rounded bg-black/10 dark:bg-white/15" />
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}

function ChromeMenuDiagram() {
  return (
    <PhoneFrame>
      <div className="h-9 flex items-center justify-between px-3 border-b border-black/5 dark:border-white/8">
        <span className="size-4 rounded-full bg-black/10 dark:bg-white/12" />
        <div className="h-4 w-[55%] rounded-full bg-black/8 dark:bg-white/10" />
        <span className="relative flex items-center justify-center size-7">
          <MoreHorizontal className="size-5 text-accent-blue rotate-90" strokeWidth={2.25} />
          <TapRing />
        </span>
      </div>
      <div className="h-24 flex items-center justify-center">
        <div className="size-8 rounded-xl bg-black/8 dark:bg-white/10" />
      </div>
    </PhoneFrame>
  )
}

function ChromeInstallDiagram() {
  return (
    <PhoneFrame>
      <div className="flex justify-end px-2 pt-2 pb-3">
        <div className="w-[78%] rounded-2xl bg-white dark:bg-white/10 shadow-sm overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
          <div className="px-3 py-2 opacity-40">
            <div className="h-2.5 w-16 rounded bg-black/10 dark:bg-white/15" />
          </div>
          <div className="relative px-3 py-2.5 flex items-center gap-2 bg-accent-blue/10">
            <PlusSquare className="size-3.5 text-accent-blue shrink-0" />
            <span className="text-[11px] font-semibold text-accent-blue leading-tight">
              Install app / Add to Home screen
            </span>
            <TapRing className="left-auto right-2 size-7 translate-x-0" />
          </div>
          <div className="px-3 py-2 opacity-40 border-t border-black/5 dark:border-white/8">
            <div className="h-2.5 w-20 rounded bg-black/10 dark:bg-white/15" />
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}

function ChromeConfirmDiagram() {
  return (
    <PhoneFrame>
      <div className="px-3 py-4 flex flex-col items-center gap-3">
        <div className="size-14 rounded-[14px] bg-black/8 dark:bg-white/10 flex items-center justify-center">
          <Check className="size-6 text-accent-green" strokeWidth={2.5} />
        </div>
        <div className="h-2.5 w-28 rounded-full bg-black/10 dark:bg-white/12" />
        <div className="relative mt-1 h-9 w-full rounded-xl bg-accent-blue text-white text-[12px] font-semibold flex items-center justify-center">
          Install
          <TapRing className="size-10" />
        </div>
      </div>
    </PhoneFrame>
  )
}

function GenericMenuDiagram() {
  return (
    <PhoneFrame>
      <div className="h-9 flex items-center justify-between px-3 border-b border-black/5 dark:border-white/8">
        <Share className="size-4 text-black/30 dark:text-white/30" />
        <div className="h-4 w-[50%] rounded-full bg-black/8 dark:bg-white/10" />
        <span className="relative flex items-center justify-center size-7">
          <MoreHorizontal className="size-5 text-accent-blue" strokeWidth={2.25} />
          <TapRing />
        </span>
      </div>
      <div className="h-20 flex items-center justify-center">
        <div className="size-8 rounded-xl bg-black/8 dark:bg-white/10" />
      </div>
    </PhoneFrame>
  )
}

type GuideStep = {
  title: string
  body: string
  diagram: ReactNode
}

function guideSteps(platform: InstallPlatform): GuideStep[] {
  if (platform === 'ios') {
    return [
      {
        title: 'Tap •••',
        body: 'In Safari, tap the three dots (•••) next to the address bar.',
        diagram: <SafariMoreDiagram />,
      },
      {
        title: 'Tap Share',
        body: 'In the menu, tap Share…',
        diagram: <SafariShareFromMenuDiagram />,
      },
      {
        title: 'Show More',
        body: 'In the share sheet, tap Show More if you don’t see Add to Home Screen yet.',
        diagram: <SafariShowMoreDiagram />,
      },
      {
        title: 'Add to Home Screen',
        body: 'Tap Add to Home Screen, then tap Add to confirm.',
        diagram: <SafariAddToHomeDiagram />,
      },
    ]
  }

  if (platform === 'android') {
    return [
      {
        title: 'Open the menu',
        body: 'In Chrome, tap the ⋮ button in the top-right corner.',
        diagram: <ChromeMenuDiagram />,
      },
      {
        title: 'Install / Add',
        body: 'Tap “Install app” or “Add to Home screen”.',
        diagram: <ChromeInstallDiagram />,
      },
      {
        title: 'Confirm',
        body: 'Tap Install / Add. Mashed appears on your home screen.',
        diagram: <ChromeConfirmDiagram />,
      },
    ]
  }

  return [
    {
      title: 'Open the menu',
      body: 'Tap Share or the ••• / ⋮ menu in your browser.',
      diagram: <GenericMenuDiagram />,
    },
    {
      title: 'Add to Home Screen',
      body: 'Choose “Add to Home Screen” or “Install app”.',
      diagram: <SafariAddToHomeDiagram />,
    },
    {
      title: 'Confirm',
      body: 'Confirm the prompt — Mashed opens fullscreen like an app.',
      diagram: <ChromeConfirmDiagram />,
    },
  ]
}

function useNativeInstallPrompt() {
  const [available, setAvailable] = useState(() => canPromptInstall())
  const [installing, setInstalling] = useState(false)

  useEffect(() => subscribeInstallPrompt(setAvailable), [])

  async function install() {
    setInstalling(true)
    try {
      return await promptPwaInstall()
    } finally {
      setInstalling(false)
    }
  }

  return { available, installing, install }
}

function AddToHomeScreenModal({
  open,
  onClose,
  platform,
}: {
  open: boolean
  onClose: () => void
  platform: InstallPlatform
}) {
  const steps = guideSteps(platform)
  const { available, installing, install } = useNativeInstallPrompt()
  const canAutoInstall = available && platform !== 'ios'

  const subtitle =
    platform === 'ios'
      ? 'Use Safari on iPhone or iPad'
      : platform === 'android'
        ? 'Use Chrome on Android'
        : 'On your phone’s browser'

  async function handleInstall() {
    const outcome = await install()
    if (outcome === 'accepted') onClose()
  }

  return (
    <GlassModal open={open} onClose={onClose} title="Add to Home Screen">
      <div className="flex flex-col gap-4">
        {canAutoInstall ? (
          <>
            <p className="text-[15px] leading-relaxed text-black/70 dark:text-white/70">
              Your browser can install Mashed in one tap — no App Store needed.
            </p>
            <Button loading={installing} onClick={handleInstall} className="w-full">
              <Smartphone className="size-4" />
              Install Mashed
            </Button>
            <p className="text-[13px] text-black/45 dark:text-white/45 text-center">
              Or follow the steps below if the button doesn’t work.
            </p>
          </>
        ) : (
          <p className="text-[15px] leading-relaxed text-black/70 dark:text-white/70">
            {platform === 'ios'
              ? 'Safari can’t install automatically — follow the highlighted taps below.'
              : 'Follow the highlighted taps below — no App Store needed.'}
          </p>
        )}

        <p className="text-[13px] font-semibold uppercase tracking-wide text-black/45 dark:text-white/45 -mb-1">
          {subtitle}
        </p>

        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] p-3.5 ring-1 ring-black/5 dark:ring-white/8"
            >
              <div className="flex items-start gap-2.5 mb-3">
                <span className="size-6 rounded-full bg-accent-blue text-white text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[15px] text-black dark:text-white">{step.title}</p>
                  <p className="text-[13px] leading-snug text-black/55 dark:text-white/55 mt-0.5">
                    {step.body}
                  </p>
                </div>
              </div>
              {step.diagram}
            </li>
          ))}
        </ol>
      </div>
    </GlassModal>
  )
}

function useInstallPromptVisibility() {
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<InstallPlatform>('other')

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setVisible(false)
      return
    }
    setPlatform(getInstallPlatform())
    setVisible(true)
  }, [])

  return { visible, platform }
}

/** Dismissible tip on the home dashboard for mobile browser users. */
export function AddToHomeScreenTip() {
  const { visible: canInstall, platform } = useInstallPromptVisibility()
  const { available: nativeInstall } = useNativeInstallPrompt()
  const [dismissed, setDismissed] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(TIP_DISMISSED_KEY) === '1')
  }, [])

  if (!canInstall || dismissed) return null

  function dismiss() {
    localStorage.setItem(TIP_DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="sm:hidden mb-4 relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full glass-panel rounded-[24px] p-4 pr-12 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
      >
        <div className="size-11 rounded-2xl bg-accent-blue/15 flex items-center justify-center shrink-0">
          <Smartphone className="size-5 text-accent-blue" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[15px]">Add to Home Screen</p>
          <p className="text-[13px] text-black/45 dark:text-white/45">
            {nativeInstall && platform !== 'ios'
              ? 'Tap to install Mashed in one step'
              : 'Install Mashed for one-tap access'}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-1/2 right-3 -translate-y-1/2 size-8 rounded-full flex items-center justify-center text-black/35 dark:text-white/35 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X className="size-4" />
      </button>
      <AddToHomeScreenModal open={open} onClose={() => setOpen(false)} platform={platform} />
    </div>
  )
}

/** Mobile-only settings row with install instructions. Hidden when already installed. */
export function AddToHomeScreenSettings() {
  const { visible, platform } = useInstallPromptVisibility()
  const { available: nativeInstall } = useNativeInstallPrompt()
  const [open, setOpen] = useState(false)

  if (!visible) return null

  return (
    <section className="sm:hidden mb-4">
      <h2 className="text-[13px] font-semibold text-black/45 dark:text-white/45 uppercase tracking-wide mb-2 px-1">
        App
      </h2>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full glass-panel rounded-[24px] p-5 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
      >
        <div className="size-12 rounded-2xl bg-accent-blue/15 flex items-center justify-center shrink-0">
          <Smartphone className="size-5 text-accent-blue" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Add to Home Screen</p>
          <p className="text-[13px] text-black/45 dark:text-white/45">
            {nativeInstall && platform !== 'ios'
              ? 'Install Mashed with one tap'
              : 'Install Mashed for quick access'}
          </p>
        </div>
        <ChevronRight className="size-4 text-black/30 dark:text-white/30 shrink-0" />
      </button>
      <AddToHomeScreenModal open={open} onClose={() => setOpen(false)} platform={platform} />
    </section>
  )
}
