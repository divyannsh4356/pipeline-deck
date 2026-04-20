import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function StarCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Stars
    const stars = Array.from({ length: 260 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.4 + 0.2,
      a: Math.random(),
      da: (Math.random() - 0.5) * 0.006,
    }))

    // Shooting stars
    const shoots = []
    const addShoot = () => {
      shoots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        len: Math.random() * 80 + 40,
        speed: Math.random() * 6 + 4,
        a: 1,
        da: 0.025,
        angle: Math.PI / 6 + Math.random() * 0.3,
      })
    }

    let frame = 0
    const draw = () => {
      frame++
      ctx.fillStyle = 'rgba(3,4,12,0.18)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      stars.forEach(s => {
        s.a = Math.max(0.08, Math.min(1, s.a + s.da))
        if (s.a <= 0.08 || s.a >= 1) s.da *= -1
        ctx.beginPath()
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,220,255,${s.a})`
        ctx.fill()
      })

      // Shooting stars
      if (frame % 120 === 0) addShoot()
      for (let i = shoots.length - 1; i >= 0; i--) {
        const sh = shoots[i]
        const ex = sh.x + Math.cos(sh.angle) * sh.len
        const ey = sh.y + Math.sin(sh.angle) * sh.len
        const g = ctx.createLinearGradient(sh.x, sh.y, ex, ey)
        g.addColorStop(0, `rgba(255,255,255,0)`)
        g.addColorStop(1, `rgba(200,220,255,${sh.a})`)
        ctx.beginPath()
        ctx.moveTo(sh.x, sh.y)
        ctx.lineTo(ex, ey)
        ctx.strokeStyle = g
        ctx.lineWidth = 1.5
        ctx.stroke()
        sh.x += Math.cos(sh.angle) * sh.speed
        sh.y += Math.sin(sh.angle) * sh.speed
        sh.a -= sh.da
        if (sh.a <= 0) shoots.splice(i, 1)
      }

      raf = requestAnimationFrame(draw)
    }

    // Initial fill
    ctx.fillStyle = 'rgb(3,4,12)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="fixed inset-0 w-full h-full" />
}

// Orbital ring SVG
function OrbitalRing({ r, duration, color, delay = 0 }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 1 }}
    >
      <motion.div
        style={{ width: r * 2, height: r * 2 }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration, ease: 'linear' }}
      >
        <svg width={r * 2} height={r * 2} viewBox={`0 0 ${r * 2} ${r * 2}`} style={{ overflow: 'visible' }}>
          <ellipse
            cx={r} cy={r}
            rx={r - 2} ry={(r - 2) * 0.28}
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0.35"
          />
          {/* Orbiting dot */}
          <circle cx={r * 2 - 2} cy={r} r="3.5" fill={color} opacity="0.9" />
        </svg>
      </motion.div>
    </motion.div>
  )
}

const PHASES = ['black', 'entering', 'team', 'ready']

export default function IntroScreen({ onEnter }) {
  const [phase, setPhase] = useState('black')
  const [autoTriggered, setAutoTriggered] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('entering'), 800)
    const t2 = setTimeout(() => setPhase('team'), 2400)
    const t3 = setTimeout(() => setPhase('ready'), 4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden select-none">
      <StarCanvas />

      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div className="absolute w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl"
          style={{ top: '10%', left: '20%' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }} />
        <motion.div className="absolute w-80 h-80 rounded-full bg-violet-500/8 blur-3xl"
          style={{ bottom: '15%', right: '15%' }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 1 }} />
      </div>

      {/* Orbital rings centered */}
      <OrbitalRing r={140} duration={18} color="#6366f1" delay={0.8} />
      <OrbitalRing r={200} duration={30} color="#8b5cf6" delay={1.2} />
      <OrbitalRing r={260} duration={45} color="#3b82f6" delay={1.6} />

      {/* Center planet */}
      <motion.div
        className="absolute flex items-center justify-center pointer-events-none"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 via-violet-500 to-blue-600 shadow-[0_0_40px_rgba(99,102,241,0.6)]" />
      </motion.div>

      {/* Text content */}
      <div className="relative z-10 text-center pointer-events-none" style={{ marginTop: 320 }}>
        <AnimatePresence>
          {phase !== 'black' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            >
              <p className="text-[11px] font-semibold tracking-[0.35em] text-indigo-400 uppercase mb-3">
                Entering
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
                The Plaksha<br />
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                  Orbital Pipeline Deck
                </span>
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(phase === 'team' || phase === 'ready') && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="mt-5"
            >
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Built by</p>
              <div className="flex items-center justify-center gap-4">
                {['Dev', 'Divyannsh', 'Krrish'].map((name, i) => (
                  <motion.div key={name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.15, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-900/40">
                      {name[0]}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{name}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === 'ready' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 pointer-events-auto"
            >
              <motion.button
                onClick={onEnter}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-[0_0_30px_rgba(99,102,241,0.45)] transition-colors"
              >
                Launch Simulator →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
