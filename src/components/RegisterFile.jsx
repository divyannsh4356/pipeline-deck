import { useMemo } from 'react'

export default function RegisterFile({ result, currentCycle, instructions }) {
  const registers = useMemo(() => {
    const regs = {}
    for (let i = 0; i <= 15; i++) regs[`R${i}`] = { value: 0, dirty: false, forwarding: false }
    if (!result || currentCycle === 0) return regs
    result.schedule.forEach((sched, instrIdx) => {
      const wbStage = sched.stages.find(s => s.name === 'WB' || s.name === 'MEM/WB')
      const exStage = sched.stages.find(s => s.name === 'EX')
      const instr = instructions[instrIdx]
      if (!instr?.dest) return
      if (wbStage?.cycle < currentCycle) {
        regs[instr.dest] = { value: instrIdx + 1, dirty: false, forwarding: false }
      } else if (wbStage?.cycle === currentCycle) {
        regs[instr.dest] = { value: instrIdx + 1, dirty: true, forwarding: false }
      } else if (exStage?.cycle <= currentCycle) {
        if (!regs[instr.dest].dirty) regs[instr.dest] = { ...regs[instr.dest], forwarding: true }
      }
    })
    return regs
  }, [result, currentCycle, instructions])

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {Object.entries(registers).map(([reg, info]) => (
        <div key={reg}
          className={`rounded-xl border px-2 py-2 text-center transition-colors ${
            info.dirty      ? 'border-orange-200 bg-orange-50' :
            info.forwarding ? 'border-emerald-200 bg-emerald-50' :
                              'border-gray-100 bg-gray-50'
          }`}>
          <p className={`text-[10px] font-mono font-bold ${
            info.dirty ? 'text-orange-600' : info.forwarding ? 'text-emerald-700' : 'text-gray-400'
          }`}>{reg}</p>
          <p className="text-xs font-mono text-gray-700 mt-0.5">{info.value}</p>
        </div>
      ))}
    </div>
  )
}
