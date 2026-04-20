function Btn({ onClick, disabled, variant = 'default', children }) {
  const base = 'px-4 py-2 text-sm rounded-xl font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed'
  const v = {
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    warning: 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100',
    ghost:   'bg-white border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200',
  }
  return <button onClick={onClick} disabled={disabled} className={`${base} ${v[variant]}`}>{children}</button>
}

export default function SimulationControls({
  currentCycle, totalCycles, isRunning,
  onStepForward, onStepBackward, onAutoRun, onPause, onReset,
}) {
  const pct = totalCycles > 0 ? (currentCycle / totalCycles) * 100 : 0
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Btn onClick={onStepBackward} disabled={currentCycle === 0}>← Back</Btn>
        {isRunning
          ? <Btn onClick={onPause} variant="warning">⏸ Pause</Btn>
          : <Btn onClick={onAutoRun} disabled={!totalCycles} variant="primary">▶ Auto-Run</Btn>
        }
        <Btn onClick={onStepForward} disabled={currentCycle >= totalCycles}>Fwd →</Btn>
        <Btn onClick={onReset} variant="ghost">↺ Reset</Btn>
        <div className="ml-auto flex items-center gap-1 text-sm">
          <span className="text-gray-400">Cycle</span>
          <span className="font-bold text-indigo-600 font-mono text-base w-8 text-right">{currentCycle}</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-400 font-mono">{totalCycles}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-400 font-mono w-9 text-right">{Math.round(pct)}%</span>
      </div>
    </div>
  )
}
