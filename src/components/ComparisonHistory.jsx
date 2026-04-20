import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400">{label}</p>
      <p className="font-mono mt-0.5">CPI: {payload[0].value}</p>
    </div>
  )
}

export default function ComparisonHistory({ history }) {
  if (!history.length) return <p className="text-sm text-gray-300 text-center py-6">No runs yet.</p>

  const chartData = [...history].reverse().map((h, i) => ({ name: `#${i + 1}`, cpi: parseFloat(h.cpi.toFixed(2)) }))

  return (
    <div className="space-y-3">
      {history.map((run, i) => (
        <div key={run.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Run {history.length - i} · {run.timestamp}</span>
            <div className="flex gap-3 text-xs font-mono">
              <span className="font-semibold text-indigo-600">CPI {run.cpi.toFixed(2)}</span>
              <span className="text-gray-400">{run.totalCycles}c</span>
              <span className={run.stalls > 0 ? 'text-red-500' : 'text-emerald-600'}>{run.stalls} stalls</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {run.instructions.map((ins, j) => (
              <span key={j} className="text-[10px] font-mono bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-lg">{ins}</span>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-3">CPI comparison</p>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={24}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="cpi" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
