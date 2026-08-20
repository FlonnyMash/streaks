/**
 * Flonny's Cubism export only ships one motion (idle wink/twink), so every other "expression" is
 * driven by directly pushing values into custom parameters exposed in `flonny_live2d.cdi3.json`
 * (Param6 Celebration, Param7 Thinking??, Param8 SleepingZZZ, ParamCheek CheekRed). None of those
 * three mood params are keyed by the idle motion, so they can be set outright; ParamCheek *is*
 * keyed (flat at 0), so it's nudged with an additive push instead of a direct set.
 */
export type FlonnyMood = 'idle' | 'thinking' | 'sleeping' | 'celebrating'

const PARAM = {
  celebration: 'Param6',
  cheek: 'ParamCheek',
  thinking: 'Param7',
  sleeping: 'Param8',
  eyeLOpen: 'ParamEyeLOpen',
  eyeROpen: 'ParamEyeROpen',
} as const

interface MoodTargets {
  celebration: number
  cheekBoost: number
  thinking: number
  sleeping: number
  eyesClosed: number
}

const MOOD_TARGETS: Record<FlonnyMood, MoodTargets> = {
  idle: { celebration: 0, cheekBoost: 0, thinking: 0, sleeping: 0, eyesClosed: 0 },
  thinking: { celebration: 0, cheekBoost: 0, thinking: 1, sleeping: 0, eyesClosed: 0 },
  celebrating: { celebration: 1, cheekBoost: 0.8, thinking: 0, sleeping: 0, eyesClosed: 0 },
  sleeping: { celebration: 0, cheekBoost: 0, thinking: 0, sleeping: 1, eyesClosed: 1 },
}

export interface FlonnyCoreModel {
  setParameterValueById(id: string, value: number, weight?: number): void
  addParameterValueById(id: string, value: number, weight?: number): void
}

/** Eases every mood parameter toward its target each tick and writes the result into the core model. */
export class FlonnyMoodDriver {
  mood: FlonnyMood = 'idle'
  private current: MoodTargets = { ...MOOD_TARGETS.idle }

  apply(coreModel: FlonnyCoreModel, dtMs: number) {
    const target = MOOD_TARGETS[this.mood]
    const speed = Math.min(1, dtMs / 260)

    for (const key of Object.keys(target) as Array<keyof MoodTargets>) {
      this.current[key] += (target[key] - this.current[key]) * speed
    }

    coreModel.setParameterValueById(PARAM.celebration, this.current.celebration)
    coreModel.setParameterValueById(PARAM.thinking, this.current.thinking)
    coreModel.setParameterValueById(PARAM.sleeping, this.current.sleeping)

    if (this.current.cheekBoost > 0.01) {
      coreModel.addParameterValueById(PARAM.cheek, this.current.cheekBoost)
    }

    if (this.current.eyesClosed > 0.01) {
      coreModel.setParameterValueById(PARAM.eyeLOpen, 1 - this.current.eyesClosed)
      coreModel.setParameterValueById(PARAM.eyeROpen, 1 - this.current.eyesClosed)
    }
  }
}

/** How long Flonny waits with no chat activity before dozing off, in milliseconds. */
export const SLEEP_AFTER_MS = 25_000
/** How long the celebration mood lingers after a successful add, in milliseconds. */
export const CELEBRATE_MS = 1_800
