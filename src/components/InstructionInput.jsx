import { useState, useEffect } from 'react'
import { parseInstruction, EXAMPLES } from '../simulation/parser.js'

const TEMPLATES = {
  ADD:  'ADD R1, R2, R3',
  SUB:  'SUB R4, R1, R5',
  AND:  'AND R1, R2, R3',
  OR:   'OR  R1, R2, R3',
  ADDI: 'ADDI R1, R2, 5',
  LW:   'LW R1, 0(R2)',
  SW:   'SW R1, 0(R2)',
}

const OP_COLORS = {
  ADD:  'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  SUB:  'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  AND:  'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  OR:   'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
  ADDI: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
  LW:   'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  SW:   'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
}

export default function InstructionInput({ onInstructionsChange, onRun }) {
  const [lines, setLines] = useState(['ADD R1, R2, R3', 'SUB R4, R1, R5', 'AND R6, R4, R7'])
  const [errors, setErrors] = useState([])

  useEffect(() => {
    const parsed = lines.map((l, i) => parseInstruction(l, i))
    setErrors(parsed.map(p => p.error || null))
    onInstructionsChange(parsed.filter(p => !p.error))
  }, [lines])

  const addOp = (op) => {
    if (lines.length >= 10) return
    setLines(p => [...p, TEMPLATES[op]])
  }

  const removeLine = (i) => { if (lines.length > 1) setLines(p => p.filter((_, idx) => idx !== i)) }
  const updateLine = (i, v) => setLines(p => p.map((l, idx) => idx === i ? v : l))

  const validCount = errors.filter(e => !e).length

  return (
    <div className="space-y-3">
      {/* Operation buttons */}
      <div>
        <p className="text-xs text-gray-400 mb-2 font-medium">Add instruction</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(TEMPLATES).map(op => (
            <button key={op} onClick={() => addOp(op)} disabled={lines.length >= 10}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors disabled:opacity-30 ${OP_COLORS[op]}`}>
              {op}
            </button>
          ))}
        </div>
      </div>

      {/* Instruction list */}
      <div className="space-y-1">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-300 font-mono w-4 text-right shrink-0">{i + 1}</span>
            <input
              value={line}
              onChange={e => updateLine(i, e.target.value)}
              className={`flex-1 min-w-0 bg-white border rounded-lg px-3 py-1.5 text-sm font-mono text-gray-800
                placeholder-gray-300 focus:outline-none focus:ring-2 transition-all
                ${errors[i]
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                  : 'border-gray-200 focus:ring-indigo-100 focus:border-indigo-400'
                }`}
            />
            <button onClick={() => removeLine(i)} disabled={lines.length <= 1}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-20 text-base leading-none">
              ×
            </button>
          </div>
        ))}
        {errors.map((e, i) => e ? (
          <p key={i} className="text-[11px] text-red-500 pl-6">{e}</p>
        ) : null)}
      </div>

      {/* Presets + Run */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className="text-xs text-gray-300 shrink-0">Presets:</span>
        {Object.keys(EXAMPLES).map(key => (
          <button key={key} onClick={() => setLines([...EXAMPLES[key]])}
            className="px-2.5 py-1 text-xs rounded-lg bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors">
            {key}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-gray-300">{validCount}/{lines.length}</span>
        <button onClick={onRun} disabled={validCount === 0 || errors.some(Boolean)}
          className="px-5 py-1.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40 shadow-sm">
          Run →
        </button>
      </div>
    </div>
  )
}
