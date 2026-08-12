import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface ParticleBurstProps {
  color: string
  onComplete?: () => void
}

const PARTICLE_COUNT = 14

/** A one-shot radial burst of accent-colored dots, meant to be mounted briefly over a completion button. */
export function ParticleBurst({ color, onComplete }: ParticleBurstProps) {
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.4
      const distance = 34 + Math.random() * 30
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: 4 + Math.random() * 5,
        delay: Math.random() * 0.06,
      }
    })
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
      {particles.map((p, i) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{ backgroundColor: color, width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.65, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={i === particles.length - 1 ? onComplete : undefined}
        />
      ))}
    </div>
  )
}
