import { detectRAWHazards } from './hazardDetector.js'

/**
 * Simulate the pipeline and return a complete execution schedule.
 *
 * Model (matches standard textbook / PDF test-case representation):
 *   - ifCycle[i]    = the cycle when instruction i is in the IF stage
 *   - stallCount[i] = stall (bubble) cycles inserted BETWEEN IF and ID for instruction i
 *   - ifCycle[i]    = ifCycle[i-1] + 1 + stallCount[i-1]   (pipeline frozen while i-1 stalls)
 *
 * Stage cycles for instruction i (5-stage example):
 *   IF  → ifCycle[i]
 *   STALL × stallCount[i]  (cycles ifCycle[i]+1 … ifCycle[i]+stallCount[i])
 *   ID  → ifCycle[i] + stallCount[i] + 1
 *   EX  → ifCycle[i] + stallCount[i] + 2
 *   MEM → ifCycle[i] + stallCount[i] + 3
 *   WB  → ifCycle[i] + stallCount[i] + 4
 *
 * Stall formulae (derived from and verified against all PDF test cases):
 *
 *   No forwarding, 5-stage:  max(0, prodWB + 1 − consID_natural)
 *     = max(0, (icp + sp + 4) + 1 − (icc + 1))
 *     = max(0, icp + sp + 4 − icc)
 *
 *   No forwarding, 4-stage:  same but WB = icp + sp + 3
 *     = max(0, icp + sp + 3 − icc)
 *
 *   Forwarding, arithmetic:  EX→EX — consEX must be strictly after prodEX
 *     = max(0, (icp + sp + 2) + 1 − (icc + 2))
 *     = max(0, icp + sp + 1 − icc)
 *
 *   Forwarding, LW (load-use): MEM→EX — consEX must be strictly after prodMEM
 *     = max(0, (icp + sp + 3) + 1 − (icc + 2))
 *     = max(0, icp + sp + 2 − icc)
 */
export function simulate(instructions, config) {
  if (!instructions || instructions.length === 0) return null

  const { pipelineStages, forwardingEnabled } = config
  const is5Stage = pipelineStages !== 4

  // Stage names after IF (stalls slot between IF and these)
  const stageNamesAfterIF = is5Stage
    ? ['ID', 'EX', 'MEM', 'WB']
    : ['ID', 'EX', 'MEM/WB']

  const stageNames = is5Stage
    ? ['IF', 'ID', 'EX', 'MEM', 'WB']
    : ['IF', 'ID', 'EX', 'MEM/WB']

  const n = instructions.length
  const rawHazards = detectRAWHazards(instructions)

  const ifCycles    = new Array(n).fill(0)
  const stallCounts = new Array(n).fill(0)

  ifCycles[0] = 1

  for (let i = 0; i < n; i++) {
    // Set IF cycle based on previous instruction's release
    if (i > 0) {
      ifCycles[i] = ifCycles[i - 1] + 1 + stallCounts[i - 1]
    }

    // Compute stalls needed for instruction i (max over all RAW producers)
    stallCounts[i] = 0
    for (const hz of rawHazards) {
      if (hz.consumerIdx !== i) continue
      const p   = hz.producerIdx   // always < i
      const icp = ifCycles[p]
      const sp  = stallCounts[p]
      const icc = ifCycles[i]

      let needed = 0
      if (forwardingEnabled) {
        if (instructions[p].op === 'LW') {
          // load-use: MEM→EX forwarding, 1 unavoidable stall when adjacent
          needed = Math.max(0, icp + sp + 2 - icc)
        } else {
          // arithmetic: EX→EX forwarding
          needed = Math.max(0, icp + sp + 1 - icc)
        }
      } else {
        // No forwarding: wait for WB to complete
        const wbOffset = is5Stage ? 4 : 3
        needed = Math.max(0, icp + sp + wbOffset - icc)
      }

      if (needed > stallCounts[i]) stallCounts[i] = needed
    }
  }

  // Build schedule — stages array includes explicit STALL entries
  const schedule = instructions.map((instr, i) => {
    const ifc = ifCycles[i]
    const sc  = stallCounts[i]

    const stages = [{ name: 'IF', cycle: ifc }]
    for (let s = 0; s < sc; s++) {
      stages.push({ name: 'STALL', cycle: ifc + 1 + s })
    }
    stageNamesAfterIF.forEach((name, idx) => {
      stages.push({ name, cycle: ifc + sc + 1 + idx })
    })

    return { instrIdx: i, instr, ifCycle: ifc, stallCount: sc, stages }
  })

  // Total cycles = last stage of last instruction
  const lastSched = schedule[n - 1]
  const totalCycles = lastSched.stages[lastSched.stages.length - 1].cycle

  const stallsTotal = stallCounts.reduce((a, b) => a + b, 0)

  // Forwarding events — mark consumer's EX stage when data is forwarded
  const forwardingEvents = []
  if (forwardingEnabled) {
    for (const hz of rawHazards) {
      const p   = hz.producerIdx
      const c   = hz.consumerIdx
      const icp = ifCycles[p]
      const sp  = stallCounts[p]
      const icc = ifCycles[c]
      const sc  = stallCounts[c]

      const prodExCycle  = icp + sp + 2
      const consExCycle  = icc + sc + 2

      if (is5Stage) {
        if (instructions[p].op === 'LW') {
          const prodMemCycle = icp + sp + 3
          const fwdGap = consExCycle - prodMemCycle
          if (fwdGap >= 1) {
            forwardingEvents.push({
              producerIdx: p, consumerIdx: c, register: hz.register,
              fromStage: 'MEM', toStage: 'EX', cycle: consExCycle,
            })
          }
        } else {
          const exGap = consExCycle - prodExCycle
          if (exGap === 1) {
            forwardingEvents.push({
              producerIdx: p, consumerIdx: c, register: hz.register,
              fromStage: 'EX', toStage: 'EX', cycle: consExCycle,
            })
          } else if (exGap === 2) {
            forwardingEvents.push({
              producerIdx: p, consumerIdx: c, register: hz.register,
              fromStage: 'MEM', toStage: 'EX', cycle: consExCycle,
            })
          }
        }
      } else {
        // 4-stage: similar logic
        const exGap = consExCycle - prodExCycle
        if (instructions[p].op === 'LW') {
          const prodMWBCycle = icp + sp + 3
          if (consExCycle - prodMWBCycle >= 1) {
            forwardingEvents.push({
              producerIdx: p, consumerIdx: c, register: hz.register,
              fromStage: 'MEM/WB', toStage: 'EX', cycle: consExCycle,
            })
          }
        } else if (exGap >= 1 && exGap <= 2) {
          forwardingEvents.push({
            producerIdx: p, consumerIdx: c, register: hz.register,
            fromStage: exGap === 1 ? 'EX' : 'MEM/WB', toStage: 'EX', cycle: consExCycle,
          })
        }
      }
    }
  }

  // Stalls saved = no-forwarding stalls minus forwarding stalls
  const stallsSaved = forwardingEnabled
    ? Math.max(0, simulate(instructions, { ...config, forwardingEnabled: false }).stallsTotal - stallsTotal)
    : 0

  return {
    schedule,
    totalCycles,
    stallsTotal,
    stallsSaved,
    rawHazards,
    forwardingEvents,
    stageNames,
    config,
  }
}
