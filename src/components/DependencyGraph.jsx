import { useState } from 'react'
import { detectRAWHazards } from '../simulation/hazardDetector.js'

const NODE_W = 130
const NODE_H = 38
const ROW_H  = 64
const PAD_X  = 20
const EDGE_OFFSET = 40 // how far right the edge curves

export default function DependencyGraph({ instructions }) {
  const [hoverEdge, setHoverEdge] = useState(null)

  const valid = instructions.filter(i => !i.error)
  const hazards = valid.length > 1 ? detectRAWHazards(valid) : []

  if (!valid.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-300 text-xs text-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2">
          <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
          <line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/>
        </svg>
        <p>Add instructions to see graph</p>
      </div>
    )
  }

  const n = valid.length
  // SVG dimensions: nodes on left, edge curves go right
  const svgW = PAD_X + NODE_W + EDGE_OFFSET + 36
  const svgH = PAD_X + n * ROW_H

  // Node center positions (all same X, stacked vertically)
  const cy = (idx) => PAD_X + idx * ROW_H + NODE_H / 2

  return (
    <div className="flex flex-col h-full">
      {/* Status badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold ${hazards.length ? 'text-red-500' : 'text-emerald-600'}`}>
          {hazards.length === 0 ? '✓ No RAW hazards' : `${hazards.length} RAW hazard${hazards.length > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Legend row */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <span className="w-2 h-2 rounded-sm border border-violet-400 bg-violet-50 inline-block" /> Producer
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <span className="w-2 h-2 rounded-sm border border-red-400 bg-red-50 inline-block" /> Consumer
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <svg width="20" height="6" className="inline-block">
            <line x1="0" y1="3" x2="14" y2="3" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2"/>
            <polygon points="14,1 20,3 14,5" fill="#ef4444"/>
          </svg>
          RAW
        </span>
      </div>

      {/* Graph — fixed width, scrollable if many instructions */}
      <div className="overflow-y-auto flex-1">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <marker id="dg-arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" opacity="0.85"/>
            </marker>
            <marker id="dg-arr-h" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#dc2626"/>
            </marker>
          </defs>

          {/* Edges — curved to the right */}
          {hazards.map((h, i) => {
            const y1 = cy(h.producerIdx) + NODE_H / 2
            const y2 = cy(h.consumerIdx) - NODE_H / 2
            const x  = PAD_X + NODE_W      // right edge of nodes
            const cx = x + EDGE_OFFSET      // control point X
            const isH = hoverEdge === i
            const midY = (y1 + y2) / 2

            return (
              <g key={i}
                onMouseEnter={() => setHoverEdge(i)}
                onMouseLeave={() => setHoverEdge(null)}
                style={{ cursor: 'default' }}>
                {/* invisible wider hit area */}
                <path d={`M${x},${y1} C${cx+8},${y1} ${cx+8},${y2} ${x},${y2}`}
                  fill="none" stroke="transparent" strokeWidth={14}/>
                <path
                  d={`M${x},${y1} C${cx+8},${y1} ${cx+8},${y2} ${x},${y2}`}
                  fill="none"
                  stroke={isH ? '#dc2626' : '#ef444480'}
                  strokeWidth={isH ? 2 : 1.5}
                  strokeDasharray={isH ? undefined : '5 3'}
                  markerEnd={`url(#${isH ? 'dg-arr-h' : 'dg-arr'})`}
                />
                {/* Register label on the right */}
                <text
                  x={cx + 12}
                  y={midY + 4}
                  textAnchor="start"
                  fill={isH ? '#dc2626' : '#f87171'}
                  fontSize={9}
                  fontFamily="monospace"
                  fontWeight="700">
                  {h.register}
                </text>
              </g>
            )
          })}

          {/* Nodes */}
          {valid.map((instr, idx) => {
            const isProducer = hazards.some(h => h.producerIdx === idx)
            const isConsumer = hazards.some(h => h.consumerIdx === idx)
            const y = cy(idx)

            const stroke = (isProducer && isConsumer) ? '#7c3aed'
              : isProducer ? '#7c3aed'
              : isConsumer ? '#dc2626'
              : '#e5e7eb'
            const bg = isProducer ? '#f5f3ff' : isConsumer ? '#fff1f2' : '#ffffff'

            return (
              <g key={idx}>
                <rect
                  x={PAD_X}
                  y={y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill={bg}
                  stroke={stroke}
                  strokeWidth={1.5}
                />
                <text x={PAD_X + 10} y={y - 5}
                  fill="#9ca3af" fontSize={8} fontFamily="monospace" fontWeight="500">
                  I{idx + 1}
                </text>
                <text x={PAD_X + 10} y={y + 9}
                  fill="#374151" fontSize={10} fontFamily="monospace">
                  {instr.raw.length > 17 ? instr.raw.slice(0, 16) + '…' : instr.raw}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
