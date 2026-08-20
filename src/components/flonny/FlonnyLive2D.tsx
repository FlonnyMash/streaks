import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { FlonnyMoodDriver, type FlonnyCoreModel, type FlonnyMood } from '@/lib/flonny/behaviors'

const MODEL_URL = '/live2d/flonny/flonny_live2d.model3.json'
const CUBISM_CORE_URL = '/live2d/live2dcubismcore.min.js'

declare global {
  interface Window {
    Live2DCubismCore?: unknown
  }
}

let cubismCorePromise: Promise<void> | null = null

/** The Cubism Modern runtime must exist on `window` before the engine module is evaluated. */
function loadCubismCore(): Promise<void> {
  if (window.Live2DCubismCore) return Promise.resolve()
  if (cubismCorePromise) return cubismCorePromise

  cubismCorePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CUBISM_CORE_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Live2D Cubism runtime.')))
      return
    }
    const script = document.createElement('script')
    script.src = CUBISM_CORE_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Live2D Cubism runtime.'))
    document.head.appendChild(script)
  })
  return cubismCorePromise
}

/**
 * Cubism Core 6 renamed the native `csmGetDrawableRenderOrders` export to `csmGetRenderOrders`,
 * which leaves `drawables.renderOrders` undefined on that Core version. The engine (built against
 * Core 5) still reads the old field and crashes mid-render. Re-point its accessor at the raw
 * model's new method until the engine ships official Core 6 support.
 * See https://github.com/Untitled-Story/untitled-pixi-live2d-engine/issues/11
 */
function patchRenderOrdersForCubismCore6(model: { internalModel: { coreModel: object } }) {
  const coreModel = model.internalModel.coreModel as {
    getDrawableRenderOrders?: () => unknown
    _model?: { getRenderOrders?: () => unknown }
  }
  if (coreModel.getDrawableRenderOrders?.() != null) return
  const rawModel = coreModel._model
  if (typeof rawModel?.getRenderOrders !== 'function') return
  coreModel.getDrawableRenderOrders = () => rawModel.getRenderOrders!()
}

interface FlonnyLive2DProps {
  mood: FlonnyMood
  className?: string
}

/**
 * Renders Flonny as a transparent Pixi/Cubism canvas. Eye tracking and blinking come for free from
 * the engine (pointer-follow "focus" + the model's EyeBlink parameter group); everything else
 * (thinking/sleeping/celebrating) is layered on top every frame via `FlonnyMoodDriver`.
 */
export function FlonnyLive2D({ mood, className }: FlonnyLive2DProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const moodRef = useRef(mood)
  moodRef.current = mood

  useEffect(() => {
    let destroyed = false
    let pixiApp: import('pixi.js').Application | null = null

    async function setup() {
      await loadCubismCore()
      if (destroyed) return

      const [{ Application, extensions }, { Live2DModel, Live2DPlugin, cubismReady }] = await Promise.all([
        import('pixi.js'),
        import('untitled-pixi-live2d-engine/cubism'),
      ])
      await cubismReady()
      if (destroyed || !hostRef.current) return

      extensions.add(Live2DPlugin)

      const app = new Application()
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        resizeTo: hostRef.current,
      })
      if (destroyed || !hostRef.current) {
        app.destroy(true)
        return
      }
      pixiApp = app
      hostRef.current.appendChild(app.canvas)

      const model = await Live2DModel.from(MODEL_URL, { useHighPrecisionMask: false })
      if (destroyed) {
        model.destroy()
        app.destroy(true)
        return
      }
      patchRenderOrdersForCubismCore6(model)

      model.anchor.set(0.5, 0.68)
      app.stage.addChild(model)
      void model.motion('Idle', 0, 1, { loop: true })

      const driver = new FlonnyMoodDriver()
      const coreModel = model.internalModel.coreModel as unknown as FlonnyCoreModel
      let wasSleeping = false
      let lastLayoutW = 0
      let lastLayoutH = 0

      function layoutModel() {
        const { width, height } = app.screen
        if (width <= 0 || height <= 0 || model.internalModel.height <= 0) return

        const padTop = height * 0.16
        const renderedH = height * 0.76
        const anchorY = 0.68
        model.scale.set(renderedH / model.internalModel.height)
        model.position.set(width / 2, padTop + renderedH * anchorY)
        lastLayoutW = width
        lastLayoutH = height
      }

      app.ticker.add((ticker) => {
        const { width, height } = app.screen
        if (width > 0 && height > 0 && (width !== lastLayoutW || height !== lastLayoutH)) layoutModel()

        driver.mood = moodRef.current
        driver.apply(coreModel, ticker.deltaMS)

        const sleeping = moodRef.current === 'sleeping'
        if (sleeping !== wasSleeping) {
          model.automator.autoFocus = !sleeping
          if (sleeping) model.focus(0, 0, true)
          wasSleeping = sleeping
        }
      })
    }

    void setup().catch((err) => {
      console.error('Failed to load Flonny', err)
    })

    return () => {
      destroyed = true
      pixiApp?.destroy(true, { children: true, texture: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={hostRef} className={cn('h-full w-full', className)} aria-hidden="true" />
}
