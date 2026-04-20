import html2canvas from 'html2canvas'

export async function exportAsPNG(elementId) {
  const el = document.getElementById(elementId)
  if (!el) return
  const canvas = await html2canvas(el, { backgroundColor: '#0f172a' })
  const link = document.createElement('a')
  link.download = 'pipeline-simulation.png'
  link.href = canvas.toDataURL()
  link.click()
}

export function exportAsJSON(result, instructions) {
  const data = {
    instructions: instructions.map(i => i.raw),
    config: result.config,
    totalCycles: result.totalCycles,
    cpi: (result.totalCycles / instructions.length).toFixed(2),
    stallsTotal: result.stallsTotal,
    stallsSaved: result.stallsSaved,
    schedule: result.schedule.map(s => ({
      instruction: s.instr.raw,
      startCycle: s.startCycle,
      stages: s.stages,
      stallCount: s.stallCount,
    })),
    rawHazards: result.rawHazards,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.download = 'pipeline-simulation.json'
  link.href = URL.createObjectURL(blob)
  link.click()
}

export function exportAsCSV(result, instructions) {
  const rows = [['Instruction', 'Start Cycle', 'Stalls', ...result.stageNames.map(s => s + ' Cycle')]]
  result.schedule.forEach(s => {
    rows.push([
      s.instr.raw,
      s.startCycle,
      s.stallCount,
      ...s.stages.map(st => st.cycle),
    ])
  })
  rows.push([])
  rows.push(['Total Cycles', result.totalCycles])
  rows.push(['CPI', (result.totalCycles / instructions.length).toFixed(2)])
  rows.push(['Total Stalls', result.stallsTotal])

  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const link = document.createElement('a')
  link.download = 'pipeline-simulation.csv'
  link.href = URL.createObjectURL(blob)
  link.click()
}
