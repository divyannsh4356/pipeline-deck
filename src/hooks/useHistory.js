import { useState, useCallback } from 'react'

export function useHistory() {
  const [history, setHistory] = useState([])

  const addEntry = useCallback((instructions, result) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      instructions: instructions.map(i => i.raw),
      config: result.config,
      totalCycles: result.totalCycles,
      cpi: result.totalCycles / instructions.length,
      stalls: result.stallsTotal,
    }
    setHistory(prev => [entry, ...prev].slice(0, 5))
  }, [])

  const clearHistory = useCallback(() => setHistory([]), [])

  return { history, addEntry, clearHistory }
}
