import { useState, useCallback, useRef, useEffect } from 'react'
import { simulate } from '../simulation/pipelineSimulator.js'

export function useSimulation() {
  const [config, setConfig] = useState({
    pipelineStages: 5,
    forwardingEnabled: true,
    detectWAR: false,
    detectWAW: false,
  })

  const [instructions, setInstructions] = useState([])
  const [result, setResult] = useState(null)
  const [currentCycle, setCurrentCycle] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  // maxCycles = max(fwdCycles, noFwdCycles) — set by App after computing both results
  const [maxCycles, setMaxCycles] = useState(0)
  const timerRef = useRef(null)

  const run = useCallback((instrs, cfg) => {
    const activeInstrs = instrs || instructions
    const activeCfg = cfg || config
    if (!activeInstrs.length) return
    const res = simulate(activeInstrs, activeCfg)
    setResult(res)
    setMaxCycles(res.totalCycles) // will be bumped by App once noFwd is computed
    setCurrentCycle(0)
    setIsRunning(false)
    return res
  }, [instructions, config])

  const stepForward = useCallback(() => {
    if (!result) return
    setCurrentCycle(c => Math.min(c + 1, maxCycles))
  }, [result, maxCycles])

  const stepBackward = useCallback(() => {
    setCurrentCycle(c => Math.max(c - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setCurrentCycle(0)
    setIsRunning(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const startAutoRun = useCallback(() => {
    if (!result) return
    setIsRunning(true)
  }, [result])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  useEffect(() => {
    if (isRunning && result) {
      timerRef.current = setInterval(() => {
        setCurrentCycle(c => {
          if (c >= maxCycles) {
            setIsRunning(false)
            return c
          }
          return c + 1
        })
      }, 1000 / speed)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRunning, result, speed, maxCycles])

  return {
    config,
    setConfig,
    instructions,
    setInstructions,
    result,
    setResult,
    currentCycle,
    setCurrentCycle,
    isRunning,
    speed,
    setSpeed,
    maxCycles,
    setMaxCycles,
    run,
    stepForward,
    stepBackward,
    reset,
    startAutoRun,
    pause,
  }
}
