import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import IntroScreen from './components/IntroScreen.jsx'
import InstructionInput from './components/InstructionInput.jsx'
import PipelineConfigPanel from './components/PipelineConfigPanel.jsx'
import PipelineTable from './components/PipelineTable.jsx'
import SimulationControls from './components/SimulationControls.jsx'
import RegisterFile from './components/RegisterFile.jsx'
import PipelineRegisters from './components/PipelineRegisters.jsx'
import HazardScoreboard from './components/HazardScoreboard.jsx'
import StatsPanel from './components/StatsPanel.jsx'
import DependencyGraph from './components/DependencyGraph.jsx'
import NaturalLanguageExplainer from './components/NaturalLanguageExplainer.jsx'
import ComparisonHistory from './components/ComparisonHistory.jsx'
import { useSimulation } from './hooks/useSimulation.js'
import { useHistory } from './hooks/useHistory.js'
import { exportAsPNG, exportAsJSON, exportAsCSV } from './utils/exportUtils.js'
import { simulate } from './simulation/pipelineSimulator.js'
import { detectWARHazards, detectWAWHazards } from './simulation/hazardDetector.js'

function Card({ title, subtitle, children, className = '', id, action, noPad = false }) {
  return (
    <div id={id} className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-gray-800 leading-tight">{title}</h3>}
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  )
}

export default function App() {
  const [launched, setLaunched] = useState(false)
  const [validInstructions, setValidInstructions] = useState([])
  const [resultNoFwd, setResultNoFwd] = useState(null)

  const {
    config, setConfig,
    instructions, setInstructions,
    result, currentCycle,
    isRunning, speed, setSpeed,
    maxCycles, setMaxCycles,
    run, stepForward, stepBackward,
    reset, startAutoRun, pause,
  } = useSimulation()

  const { history, addEntry } = useHistory()

  const handleInstructionsChange = (valid) => {
    setValidInstructions(valid)
    setInstructions(valid)
  }

  const handleRun = () => {
    if (!validInstructions.length) return
    const res = run(validInstructions, config)
    if (res) {
      addEntry(validInstructions, res)
      // Always compute no-forwarding result for side-by-side comparison
      const noFwd = simulate(validInstructions, { ...config, forwardingEnabled: false })
      setResultNoFwd(noFwd)
      // Auto-run must cover the longer of the two tables
      setMaxCycles(Math.max(res.totalCycles, noFwd?.totalCycles || 0))
    }
  }

  const warHazards = config.detectWAR && validInstructions.length ? detectWARHazards(validInstructions) : []
  const wawHazards = config.detectWAW && validInstructions.length ? detectWAWHazards(validInstructions) : []

  return (
    <>
      {/* Intro overlay */}
      <AnimatePresence>
        {!launched && (
          <motion.div
            key="intro"
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          >
            <IntroScreen onEnter={() => setLaunched(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main app — fades in after launch */}
      <AnimatePresence>
        {launched && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="min-h-screen bg-slate-50"
          >
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
              <div className="max-w-screen-xl mx-auto px-6 h-12 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="1" width="4" height="4" rx="1.2" fill="white" opacity="0.95"/>
                      <rect x="7" y="1" width="4" height="4" rx="1.2" fill="white" opacity="0.6"/>
                      <rect x="1" y="7" width="4" height="4" rx="1.2" fill="white" opacity="0.6"/>
                      <rect x="7" y="7" width="4" height="4" rx="1.2" fill="white" opacity="0.3"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-none">Plaksha Orbital Pipeline Deck</p>
                    <p className="text-[10px] text-gray-400 leading-none mt-0.5">Dev · Divyannsh · Krrish</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {result && (
                    <>
                      <span className="text-[11px] text-gray-300 mr-1">Export</span>
                      {[
                        { l: 'PNG',  f: () => exportAsPNG('pipeline-table') },
                        { l: 'JSON', f: () => exportAsJSON(result, validInstructions) },
                        { l: 'CSV',  f: () => exportAsCSV(result, validInstructions) },
                      ].map(({ l, f }) => (
                        <button key={l} onClick={f}
                          className="px-3 py-1 text-xs rounded-lg bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 transition-colors font-medium">
                          {l}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </header>

            <main className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">

              {/* ── Row 1: Instructions + DAG + Config ── */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px_180px] gap-4 items-start">
                <Card title="Instructions" subtitle="Click an operation to add, then edit values">
                  <InstructionInput onInstructionsChange={handleInstructionsChange} onRun={handleRun} />
                </Card>

                <Card title="Dependency Graph" subtitle="Live · updates as you type">
                  <DependencyGraph instructions={validInstructions} />
                </Card>

                <Card title="Config">
                  <PipelineConfigPanel config={config} setConfig={setConfig} speed={speed} setSpeed={setSpeed} />
                </Card>
              </div>

              {/* Hazard notices */}
              <AnimatePresence>
                {(warHazards.length > 0 || wawHazards.length > 0) && (
                  <motion.div className="flex flex-wrap gap-2"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {warHazards.length > 0 && (
                      <div className="flex gap-2 items-center px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                        <span className="font-bold">WAR</span> {warHazards.length} detected · no stalls in-order
                      </div>
                    )}
                    {wawHazards.length > 0 && (
                      <div className="flex gap-2 items-center px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                        <span className="font-bold">WAW</span> {wawHazards.length} detected · no stalls in-order
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Main simulation block ── */}
              {result && (
                <Card noPad>
                  {/* Controls */}
                  <div className="px-5 py-3 border-b border-gray-100">
                    <SimulationControls
                      currentCycle={currentCycle}
                      totalCycles={maxCycles}
                      isRunning={isRunning}
                      onStepForward={stepForward}
                      onStepBackward={stepBackward}
                      onAutoRun={startAutoRun}
                      onPause={pause}
                      onReset={reset}
                    />
                  </div>

                  {/* Table — always shows both forwarding and stall-only side by side */}
                  <div id="pipeline-table" className="px-5 pt-4 pb-4 border-b border-gray-100">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-gray-800">Pipeline Execution</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {result.totalCycles} cycles (fwd) · CPI {(result.totalCycles / validInstructions.length).toFixed(2)} · {result.stallsTotal} stall{result.stallsTotal !== 1 ? 's' : ''}
                        {result.stallsSaved > 0 && <span className="text-emerald-600"> · {result.stallsSaved} saved by forwarding</span>}
                        {resultNoFwd && <span className="text-gray-400"> · {resultNoFwd.totalCycles} cycles (no-fwd)</span>}
                      </p>
                    </div>
                    <PipelineTable
                      result={result}
                      currentCycle={currentCycle}
                      instructions={validInstructions}
                      resultNoFwd={resultNoFwd}
                    />
                  </div>

                  {/* Pipeline Registers + Hazard Scoreboard */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                    <div className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-800 mb-0.5">Pipeline Registers</p>
                      <p className="text-[11px] text-gray-400 mb-3">Inter-stage register contents at cycle {currentCycle}</p>
                      <PipelineRegisters result={result} currentCycle={currentCycle} instructions={validInstructions} />
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-800 mb-0.5">Hazard Scoreboard</p>
                      <p className="text-[11px] text-gray-400 mb-3">Step through cycles to track register availability</p>
                      <HazardScoreboard result={result} currentCycle={currentCycle} instructions={validInstructions} />
                    </div>
                  </div>
                </Card>
              )}

              {/* Stats + Register File */}
              {result && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
                  <Card title="Performance Statistics"
                    subtitle={`${validInstructions.length} instructions · ${result.config.pipelineStages}-stage · forwarding ${result.config.forwardingEnabled ? 'on' : 'off'}`}>
                    <StatsPanel result={result} instructions={validInstructions} />
                  </Card>
                  <Card title="Register File" subtitle="R0–R15 live values">
                    <RegisterFile result={result} currentCycle={currentCycle} instructions={validInstructions} />
                  </Card>
                </div>
              )}

              {/* Debrief + History */}
              {result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card title="Analysis Debrief" subtitle="Plain-English explanation · auto-generated on Run">
                    <NaturalLanguageExplainer result={result} instructions={validInstructions} />
                  </Card>
                  <Card title="Run History" subtitle="Up to 5 previous runs">
                    <ComparisonHistory history={history} />
                  </Card>
                </div>
              )}

              <div className="h-4" />
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
