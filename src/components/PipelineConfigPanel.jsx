export default function PipelineConfigPanel({ config, setConfig, speed, setSpeed }) {
  const toggle = (key) => setConfig(prev => ({ ...prev, [key]: !prev[key] }))
  return (
    <div className="space-y-3">
      {/* Stage selector */}
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

      {/* WAR / WAW detection toggles */}
      <div className="grid grid-cols-2 gap-0 py-1 border-t border-gray-100">
        <button onClick={() => toggle('detectWAR')} className="flex items-center gap-2 py-1.5">
          <div className={`relative w-7 h-3.5 rounded-full transition-colors ${config.detectWAR ? 'bg-amber-400' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${config.detectWAR ? 'translate-x-3.5' : ''}`} />
          </div>
          <span className="text-xs text-gray-600">WAR</span>
        </button>
        <button onClick={() => toggle('detectWAW')} className="flex items-center gap-2 py-1.5">
          <div className={`relative w-7 h-3.5 rounded-full transition-colors ${config.detectWAW ? 'bg-amber-400' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${config.detectWAW ? 'translate-x-3.5' : ''}`} />
          </div>
          <span className="text-xs text-gray-600">WAW</span>
        </button>
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

      {/* Info badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">Both modes always shown</span>
      </div>
    </div>
  )
}
