import { useState } from 'react'

const STAGE_STYLE = {
  IF:       { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700'    },
  ID:       { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  EX:       { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700'  },
  MEM:      { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700'  },
  WB:       { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700'    },
  'MEM/WB': { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700'  },
}

function getCellInfo(result, instrIdx, cycle) {
  if (!result) return null
  const sched = result.schedule[instrIdx]
  if (!sched) return null
  // STALL entries are included in sched.stages with name === 'STALL'
  const stg = sched.stages.find(s => s.cycle === cycle)
  if (!stg) return null
  if (stg.name === 'STALL') return { type: 'stall' }
  const fwd = result.forwardingEvents.find(f => f.consumerIdx === instrIdx && f.cycle === cycle)
  return { type: 'stage', label: stg.name, forwarding: !!fwd }
}

function Cell({ info, isActive, isCurrent }) {
  if (!info) {
    return <div className={`h-8 w-12 rounded-lg ${isCurrent ? 'bg-indigo-50/60' : ''}`} />
  }

  if (info.type === 'stall') {
    return (
      <div className={`h-8 w-12 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center ${isActive ? 'opacity-100' : 'opacity-30'}`}>
        <span className="text-[8px] font-bold text-red-500 tracking-wide">STALL</span>
      </div>
    )
  }

  const s = STAGE_STYLE[info.label] || { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600' }

  if (info.forwarding) {
    return (
      <div className={`h-8 w-12 rounded-lg border-2 border-emerald-400 bg-emerald-50 flex flex-col items-center justify-center gap-0
        ${isActive ? 'opacity-100' : 'opacity-30'}
        ${isCurrent ? 'ring-2 ring-indigo-300 ring-offset-1' : ''}
      `}>
        <span className="text-[9px] font-bold text-emerald-700 leading-none">{info.label}</span>
        <span className="text-[7px] font-bold text-emerald-500 leading-none tracking-wide">FWD</span>
      </div>
    )
  }

  return (
    <div className={`h-8 w-12 rounded-lg border flex items-center justify-center
      ${s.bg} ${s.border}
      ${isActive ? 'opacity-100' : 'opacity-25'}
      ${isCurrent ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}
    `}>
      <span className={`text-[10px] font-bold ${s.text}`}>{info.label}</span>
    </div>
  )
}

function TableView({ result, instructions, currentCycle, label, accent }) {
  const [tip, setTip] = useState(null)
  if (!result) return null

  const cycles = Array.from({ length: result.totalCycles }, (_, i) => i + 1)

  return (
    <div>
      {label && (
        <p className={`text-xs font-semibold mb-2 ${accent || 'text-gray-500'}`}>{label}</p>
      )}
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs text-gray-400 font-normal pb-2 pr-3"
                style={{ width: 148, minWidth: 148 }}>Instruction</th>
              {cycles.map(c => (
                <th key={c} style={{ width: 52, minWidth: 52 }}
                  className={`text-center text-xs pb-2 font-mono font-normal
                    ${c === currentCycle ? 'text-indigo-600 font-semibold' : 'text-gray-300'}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.schedule.map((sched, instrIdx) => (
              <tr key={instrIdx}>
                <td className="pr-3 py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-300 font-mono w-5 text-right shrink-0">I{instrIdx + 1}</span>
                    <span className="text-xs font-mono text-gray-700 truncate" title={sched.instr.raw}>{sched.instr.raw}</span>
                  </div>
                </td>
                {cycles.map(c => {
                  const info = getCellInfo(result, instrIdx, c)
                  return (
                    <td key={c} className="py-0.5 px-0.5 relative"
                      onMouseEnter={() => setTip({ instrIdx, cycle: c, info, raw: sched.instr.raw })}
                      onMouseLeave={() => setTip(null)}>
                      <Cell info={info} isActive={c <= currentCycle} isCurrent={c === currentCycle} />
                      {tip?.instrIdx === instrIdx && tip?.cycle === c && info && (
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                          <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl whitespace-nowrap">
                            <p className="font-mono font-semibold">{sched.instr.raw}</p>
                            <p className="text-gray-400 mt-0.5">Cycle {c} · {info.type === 'stall' ? 'BUBBLE' : info.label}</p>
                            {info.forwarding && <p className="text-emerald-400 font-semibold mt-0.5">⚡ Data forwarded this cycle</p>}
                            {info.type === 'stall' && <p className="text-red-400 mt-0.5">Pipeline stall inserted</p>}
                          </div>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PipelineTable({ result, currentCycle, instructions, resultNoFwd }) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-300">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-3">
          <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>
        </svg>
        <p className="text-sm text-gray-400">Enter instructions and click Run →</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.entries(STAGE_STYLE).filter(([k]) => k !== 'MEM/WB').map(([name, s]) => (
          <div key={name} className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-bold ${s.bg} ${s.border} ${s.text}`}>{name}</div>
        ))}
        <div className="px-2.5 py-0.5 rounded-lg border text-[10px] font-bold bg-red-50 border-red-200 text-red-500">STALL</div>
        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg border-2 border-emerald-400 bg-emerald-50 text-[9px] font-bold text-emerald-700">
          <span>EX</span><span className="text-emerald-500 text-[7px]">FWD</span>
        </div>
        <span className="text-[10px] text-gray-400">← forwarded</span>
      </div>

      {/* Always show both tables side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <TableView
          result={result}
          instructions={instructions}
          currentCycle={currentCycle}
          label={result.config.forwardingEnabled ? '⚡ With Forwarding' : 'Stall-Only'}
          accent={result.config.forwardingEnabled ? 'text-emerald-600' : 'text-red-500'}
        />
        {resultNoFwd && (
          <TableView
            result={resultNoFwd}
            instructions={instructions}
            currentCycle={currentCycle}
            label="🐢 Without Forwarding (Stall-Only)"
            accent="text-red-500"
          />
        )}
      </div>

      {/* RAW hazard list */}
      {result.rawHazards.length > 0 && (
        <div className="pt-3 border-t border-gray-100 space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 mb-1">RAW Dependencies</p>
          {result.rawHazards.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
              <span className="text-red-400">→</span>
              <span className="font-mono text-gray-700">I{h.producerIdx + 1}</span>
              <span className="text-gray-300">writes</span>
              <span className="font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{h.register}</span>
              <span className="text-gray-300">→ read by</span>
              <span className="font-mono text-gray-700">I{h.consumerIdx + 1}</span>
              <span className="text-gray-400 truncate">({instructions[h.consumerIdx]?.raw})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
