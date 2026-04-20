import { useMemo } from 'react'

const STAGES = [
  { reg: 'IF/ID',  from: 'IF',  to: 'ID',  color: 'border-blue-200 bg-blue-50',  label: 'text-blue-600',  dot: 'bg-blue-500'  },
  { reg: 'ID/EX',  from: 'ID',  to: 'EX',  color: 'border-emerald-200 bg-emerald-50', label: 'text-emerald-600', dot: 'bg-emerald-500' },
  { reg: 'EX/MEM', from: 'EX',  to: 'MEM', color: 'border-violet-200 bg-violet-50', label: 'text-violet-600', dot: 'bg-violet-500' },
  { reg: 'MEM/WB', from: 'MEM', to: 'WB',  color: 'border-orange-200 bg-orange-50', label: 'text-orange-600', dot: 'bg-orange-500'  },
]
const stageToNextReg = { IF: 'IF/ID', ID: 'ID/EX', EX: 'EX/MEM', MEM: 'MEM/WB' }

export default function PipelineRegisters({ result, currentCycle, instructions }) {
  const state = useMemo(() => {
    const s = {}
    STAGES.forEach(r => { s[r.reg] = null })
    if (!result || currentCycle === 0) return s
    result.schedule.forEach((sched, instrIdx) => {
      sched.stages.forEach(st => {
        if (st.cycle === currentCycle) {
          const reg = stageToNextReg[st.name]
          if (reg) s[reg] = { raw: instructions[instrIdx]?.raw || 'BUBBLE', idx: instrIdx }
        }
      })
    })
    return s
  }, [result, currentCycle, instructions])

  return (
    <div className="space-y-2">
      {/* Pipeline flow arrow */}
      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1 overflow-x-auto pb-1">
        {['IF', 'IF/ID', 'ID', 'ID/EX', 'EX', 'EX/MEM', 'MEM', 'MEM/WB', 'WB'].map((s, i) =>
          i % 2 === 0
            ? <span key={s} className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 text-[10px] font-semibold shrink-0">{s}</span>
            : <span key={s} className="text-gray-300 shrink-0">→</span>
        )}
      </div>

      {/* Register cards */}
      <div className="grid grid-cols-2 gap-2">
        {STAGES.map(({ reg, from, to, color, label, dot }) => {
          const content = state[reg]
          return (
            <div key={reg} className={`rounded-2xl border-2 ${color} px-4 py-3`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
                <span className={`text-xs font-bold font-mono ${label}`}>{reg}</span>
                <span className="text-[9px] text-gray-400 ml-auto">{from} → {to}</span>
              </div>
              {content ? (
                <div>
                  <p className="text-xs font-mono text-gray-700 font-semibold truncate">{content.raw}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">I{content.idx + 1}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-300 italic">empty</p>
              )}
            </div>
          )
        })}
      </div>

      {currentCycle === 0 && (
        <p className="text-xs text-center text-gray-300 pt-1">Step forward to see register contents</p>
      )}
    </div>
  )
}
