import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function Stat({ label, value, sub, color }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400">{label}</p>
      <p className="font-mono mt-0.5">{payload[0].value} stall{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function StatsPanel({ result, instructions }) {
  if (!result) return <p className="text-sm text-gray-300 text-center py-6">No simulation data</p>
  const n = instructions.length
  const cpi = (result.totalCycles / n).toFixed(2)
  const efficiency = ((n / result.totalCycles) * 100).toFixed(1)
  const stallData = result.schedule.map((s, i) => ({ name: `I${i + 1}`, stalls: s.stallCount }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat label="Total Cycles" value={result.totalCycles} color="text-indigo-600" />
        <Stat label="CPI" value={cpi} color="text-blue-600" sub="cycles / instr" />
        <Stat label="Stalls" value={result.stallsTotal} color={result.stallsTotal > 0 ? 'text-red-500' : 'text-emerald-600'} />
        <Stat label="Saved by Fwd" value={result.stallsSaved} color="text-emerald-600" sub="stall cycles" />
        <Stat label="Efficiency" value={`${efficiency}%`} color="text-violet-600" sub="instr / cycles" />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-3">Stalls per instruction</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stallData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={28}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="stalls" radius={[4, 4, 0, 0]}>
                {stallData.map((e, i) => (
                  <Cell key={i} fill={e.stalls === 0 ? '#10b981' : e.stalls === 1 ? '#f97316' : '#ef4444'} opacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
