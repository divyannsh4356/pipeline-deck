import { useMemo } from 'react'

export default function HazardScoreboard({ result, currentCycle, instructions }) {
  const rows = useMemo(() => {
    if (!result) return []
    const map = {}
    result.schedule.forEach((sched, instrIdx) => {
      const instr = instructions[instrIdx]
      if (!instr?.dest) return
      const wbStage  = sched.stages.find(s => s.name === 'WB' || s.name === 'MEM/WB')
      const exStage  = sched.stages.find(s => s.name === 'EX')
      const memStage = sched.stages.find(s => s.name === 'MEM')

      // The actual cycle the value is available (for forwarding: end of EX; else: end of WB)
      const availCycle = result.config.forwardingEnabled
        ? (instr.op === 'LW' ? memStage?.cycle : exStage?.cycle) ?? wbStage?.cycle
        : wbStage?.cycle

      const cyclesUntilFree = availCycle ? Math.max(0, availCycle - currentCycle) : 0
      const isDirty = availCycle && availCycle > currentCycle

      if (!map[instr.dest] || map[instr.dest].availCycle > (availCycle ?? 0)) {
        map[instr.dest] = {
          register: instr.dest,
          writtenBy: `I${instrIdx + 1}`,
          availCycle: availCycle ?? '—',
          cyclesUntilFree,
          dirty: isDirty,
        }
      }
    })
    return Object.values(map).sort((a, b) => a.register.localeCompare(b.register))
  }, [result, currentCycle, instructions])

  if (!result) return <p className="text-sm text-gray-300 text-center py-6">No simulation data</p>

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-100">
          {['Register', 'Written By', 'Available at Cycle', 'Status'].map(h => (
            <th key={h} className="text-left py-2 pr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.register} className="border-b border-gray-50">
            <td className="py-2.5 pr-3">
              <span className={`px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${row.dirty ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                {row.register}
              </span>
            </td>
            <td className="py-2.5 pr-3 font-mono text-gray-600">{row.writtenBy}</td>
            <td className="py-2.5 pr-3">
              <span className={`font-mono font-bold text-sm ${row.dirty ? 'text-orange-500' : 'text-gray-400'}`}>
                {row.availCycle}
              </span>
              {typeof row.availCycle === 'number' && currentCycle > 0 && (
                <span className="text-gray-300 text-[10px] ml-1">
                  (now: {currentCycle})
                </span>
              )}
            </td>
            <td className="py-2.5">
              {row.cyclesUntilFree > 0
                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-semibold">
                    ⏳ {row.cyclesUntilFree} more
                  </span>
                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold">
                    ✓ free
                  </span>
              }
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={4} className="py-5 text-center text-gray-300">No hazards — all registers clean</td></tr>
        )}
      </tbody>
    </table>
  )
}
