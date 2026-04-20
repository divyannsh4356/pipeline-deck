function Toggle({ checked, onChange, label, color = 'bg-indigo-500' }) {
  return (
    <button onClick={onChange} className="flex items-center justify-between w-full py-1.5">
      <span className="text-xs text-gray-700 font-medium">{label}</span>
      <div className={`relative w-8 h-4 rounded-full transition-colors duration-150 shrink-0 ${checked ? color : 'bg-gray-200'}`}>
        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-150 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </button>
  )
}

export default function PipelineConfigPanel({ config, setConfig, speed, setSpeed }) {
  const toggle = (key) => setConfig(prev => ({ ...prev, [key]: !prev[key] }))
  return (
    <div className="space-y-3">
      {/* Stage */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 h-8">
        {[4, 5].map(n => (
          <button key={n} onClick={() => setConfig(p => ({ ...p, pipelineStages: n }))}
            className={`flex-1 text-xs font-semibold transition-colors ${
              config.pipelineStages === n ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}>
            {n}-Stage
          </button>
        ))}
      </div>

      {/* Toggles */}
      <div className="divide-y divide-gray-100">
        <Toggle checked={config.forwardingEnabled} onChange={() => toggle('forwardingEnabled')}
          label="Data Forwarding" color="bg-emerald-500" />
        <div className="grid grid-cols-2 gap-0 py-1.5">
          <button onClick={() => toggle('detectWAR')} className="flex items-center gap-2">
            <div className={`relative w-7 h-3.5 rounded-full transition-colors ${config.detectWAR ? 'bg-amber-400' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${config.detectWAR ? 'translate-x-3.5' : ''}`} />
            </div>
            <span className="text-xs text-gray-600">WAR</span>
          </button>
          <button onClick={() => toggle('detectWAW')} className="flex items-center gap-2">
            <div className={`relative w-7 h-3.5 rounded-full transition-colors ${config.detectWAW ? 'bg-amber-400' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${config.detectWAW ? 'translate-x-3.5' : ''}`} />
            </div>
            <span className="text-xs text-gray-600">WAW</span>
          </button>
        </div>
      </div>

      {/* Speed */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Speed</span>
          <span className="text-xs font-mono font-bold text-gray-700">{speed}×</span>
        </div>
        <input type="range" min={0.5} max={4} step={0.5} value={speed}
          onChange={e => setSpeed(parseFloat(e.target.value))}
          className="w-full accent-indigo-600 cursor-pointer h-1 rounded-full" />
        <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
          <span>0.5×</span><span>4×</span>
        </div>
      </div>
    </div>
  )
}
