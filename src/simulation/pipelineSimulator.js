import { detectRAWHazards } from './hazardDetector.js'
import { stallsNeededWithForwarding, stallsNeededNoForwarding } from './forwardingEngine.js'

/**
 * Simulate the pipeline and return a complete execution schedule.
 *
 * Returns:
 *  schedule[i] = { instrIdx, startCycle, stages: [{name, cycle}], stalls: number, forwardingEvents: [] }
 *  totalCycles, stallsTotal, forwardingEvents, rawHazards
 */
export function simulate(instructions, config) {
  const { pipelineStages, forwardingEnabled } = config
  const stageNames = pipelineStages === 5
    ? ['IF', 'ID', 'EX', 'MEM', 'WB']
    : ['IF', 'ID', 'EX', 'MEM/WB']

  const startCycles = new Array(instructions.length).fill(0)
  const stallsBefore = new Array(instructions.length).fill(0) // stalls accumulated before this instruction

  // Assign start cycles sequentially, each instruction starts 1 cycle after previous
  for (let i = 0; i < instructions.length; i++) {
    startCycles[i] = i === 0 ? 1 : startCycles[i - 1] + 1
  }

  const rawHazards = detectRAWHazards(instructions)

  // Compute required stalls for each instruction (max over all its producers)
  const extraStalls = new Array(instructions.length).fill(0)

  for (const hz of rawHazards) {
    const { producerIdx, consumerIdx } = hz
    const prodStart = startCycles[producerIdx]
    const consStartNaive = startCycles[consumerIdx]

    let needed
    if (forwardingEnabled) {
      needed = stallsNeededWithForwarding(
        instructions[producerIdx],
        instructions[consumerIdx],
        prodStart,
        consStartNaive,
        pipelineStages
      )
    } else {
      needed = stallsNeededNoForwarding(
        instructions[producerIdx],
        instructions[consumerIdx],
        prodStart,
        consStartNaive,
        pipelineStages
      )
    }

    if (needed > extraStalls[consumerIdx]) {
      extraStalls[consumerIdx] = needed
    }
  }

  // Now apply stalls: push start cycles forward propagating through subsequent instructions
  let cumulativeDelay = 0
  for (let i = 0; i < instructions.length; i++) {
    cumulativeDelay += extraStalls[i]
    startCycles[i] = i + 1 + cumulativeDelay
    stallsBefore[i] = cumulativeDelay
  }

  // Re-check stalls with updated start cycles (iterative until stable)
  let changed = true
  let iters = 0
  while (changed && iters < 20) {
    changed = false
    iters++
    for (const hz of rawHazards) {
      const { producerIdx, consumerIdx } = hz
      const prodStart = startCycles[producerIdx]
      const consStart = startCycles[consumerIdx]

      let needed
      if (forwardingEnabled) {
        needed = stallsNeededWithForwarding(
          instructions[producerIdx],
          instructions[consumerIdx],
          prodStart,
          consStart,
          pipelineStages
        )
      } else {
        needed = stallsNeededNoForwarding(
          instructions[producerIdx],
          instructions[consumerIdx],
          prodStart,
          consStart,
          pipelineStages
        )
      }

      if (needed > 0) {
        const newStart = consStart + needed
        if (newStart > startCycles[consumerIdx]) {
          const delta = newStart - startCycles[consumerIdx]
          // Push this and all subsequent instructions
          for (let k = consumerIdx; k < instructions.length; k++) {
            startCycles[k] += delta
          }
          changed = true
        }
      }
    }
  }

  // Build schedule
  const schedule = instructions.map((instr, i) => {
    const start = startCycles[i]
    const stages = stageNames.map((name, s) => ({ name, cycle: start + s }))

    // Stall bubbles occupy cycles between previous instruction's IF and this instruction's IF
    const prevEnd = i === 0 ? 0 : startCycles[i - 1]
    const stallCount = start - prevEnd - 1
    const stallCycles = []
    for (let s = 0; s < stallCount; s++) {
      stallCycles.push(prevEnd + 1 + s)
    }

    return {
      instrIdx: i,
      instr,
      startCycle: start,
      stages,
      stallCycles,
      stallCount: Math.max(0, stallCount),
    }
  })

  // Determine forwarding events
  const forwardingEvents = []
  if (forwardingEnabled) {
    for (const hz of rawHazards) {
      const { producerIdx, consumerIdx, register } = hz
      const prodStart = startCycles[producerIdx]
      const consStart = startCycles[consumerIdx]
      const gap = consStart - prodStart

      if (pipelineStages === 5) {
        if (instructions[producerIdx].op === 'LW') {
          // MEM→EX forwarding (after 1 stall)
          if (gap >= 2) {
            forwardingEvents.push({
              producerIdx,
              consumerIdx,
              register,
              fromStage: 'MEM',
              toStage: 'EX',
              cycle: consStart + 2,
            })
          }
        } else {
          if (gap === 2) {
            // EX→EX forwarding
            forwardingEvents.push({
              producerIdx,
              consumerIdx,
              register,
              fromStage: 'EX',
              toStage: 'EX',
              cycle: consStart + 2,
            })
          } else if (gap >= 3) {
            // MEM→EX forwarding
            forwardingEvents.push({
              producerIdx,
              consumerIdx,
              register,
              fromStage: 'MEM',
              toStage: 'EX',
              cycle: consStart + 2,
            })
          }
        }
      }
    }
  }

  const lastInstr = schedule[schedule.length - 1]
  const totalCycles = lastInstr ? lastInstr.stages[lastInstr.stages.length - 1].cycle : 0
  const stallsTotal = schedule.reduce((sum, s) => sum + s.stallCount, 0)

  // Stalls saved by forwarding = stalls without forwarding minus stalls with forwarding
  const scheduleNoFwd = forwardingEnabled
    ? simulate(instructions, { ...config, forwardingEnabled: false })
    : null
  const stallsSaved = scheduleNoFwd ? scheduleNoFwd.stallsTotal - stallsTotal : 0

  return {
    schedule,
    totalCycles,
    stallsTotal,
    stallsSaved: Math.max(0, stallsSaved),
    rawHazards,
    forwardingEvents,
    stageNames,
    config,
  }
}
