import { detectRAWHazards } from './hazardDetector.js'

/**
 * Pipeline simulator — correct stall computation with natural-sequential IF display.
 *
 * COMPUTATION MODEL (frozen-pipeline — determines correct ID/EX/MEM/WB timing):
 *   ifCycles[i]    = cycle when instruction i actually enters the pipeline
 *   stallCounts[i] = stalls caused by instruction i's own RAW dependency
 *   ifCycles[i]    = ifCycles[i-1] + 1 + stallCounts[i-1]
 *
 * DISPLAY MODEL (what the table shows):
 *   IF is always shown at the natural sequential position: naturalIF[i] = i + 1
 *   ID is always shown one cycle after IF:                 naturalID[i] = i + 2
 *   Stall bubbles fill every cycle from naturalID[i]+1 up to (but not including) the
 *   actual EX cycle — stall appears AFTER ID (where hazard is detected), matching
 *   the lecture slide model. This covers both own stalls and upstream pipeline freezes.
 *   EX / MEM / WB are shown at exactly the cycles computed by the model above.
 *
 * This gives the intuitive "instruction is fetched, then stalls until data ready" view
 * while still computing the correct timing for all stages.
 *
 * Stall formulae (verified against all PDF test cases):
 *
 *   No forwarding, 5-stage:  max(0, icp + sp + 4 − icc)
 *   No forwarding, 4-stage:  max(0, icp + sp + 3 − icc)
 *   Forwarding, arithmetic:  max(0, icp + sp + 1 − icc)   [EX→EX]
 *   Forwarding, LW:          max(0, icp + sp + 2 − icc)   [MEM→EX, 1 unavoidable stall]
 *
 *   where icp = ifCycles[producer], sp = stallCounts[producer], icc = ifCycles[consumer]
 */
export function simulate(instructions, config) {
  if (!instructions || instructions.length === 0) return null

  const { pipelineStages, forwardingEnabled } = config
  const is5Stage = pipelineStages !== 4

  const stageNamesAfterIF = is5Stage
    ? ['ID', 'EX', 'MEM', 'WB']
    : ['ID', 'EX', 'MEM/WB']

  const stageNames = is5Stage
    ? ['IF', 'ID', 'EX', 'MEM', 'WB']
    : ['IF', 'ID', 'EX', 'MEM/WB']

  const n = instructions.length
  const rawHazards = detectRAWHazards(instructions)

  // ── Step 1: compute actual IF cycles and stall counts ──────────────────────
  const ifCycles    = new Array(n).fill(0)  // actual pipeline IF cycle
  const stallCounts = new Array(n).fill(0)  // stalls from THIS instruction's own dependency

  ifCycles[0] = 1

  for (let i = 0; i < n; i++) {
    if (i > 0) {
      ifCycles[i] = ifCycles[i - 1] + 1 + stallCounts[i - 1]
    }

    stallCounts[i] = 0
    for (const hz of rawHazards) {
      if (hz.consumerIdx !== i) continue
      const p   = hz.producerIdx
      const icp = ifCycles[p]
      const sp  = stallCounts[p]
      const icc = ifCycles[i]

      let needed = 0
      if (forwardingEnabled) {
        if (instructions[p].op === 'LW') {
          needed = Math.max(0, icp + sp + 2 - icc)   // MEM→EX, load-use
        } else {
          needed = Math.max(0, icp + sp + 1 - icc)   // EX→EX
        }
      } else {
        const wbOffset = is5Stage ? 4 : 3
        needed = Math.max(0, icp + sp + wbOffset - icc)
      }

      if (needed > stallCounts[i]) stallCounts[i] = needed
    }
  }

  // ── Step 2: build schedule with natural-sequential IF/ID display ────────────
  // IF is always at i+1, ID always at i+2 (natural fetch order, no pre-ID stalls).
  // Stall bubbles fill from naturalID+1 to actualEX-1 — stall appears AFTER ID,
  // where the hazard is detected (matches lecture slide model).
  const schedule = instructions.map((instr, i) => {
    const ifc = ifCycles[i]
    const sc  = stallCounts[i]

    const naturalIF  = i + 1                         // displayed IF cycle (always sequential)
    const naturalID  = i + 2                         // ID always one cycle after IF
    const actualEX   = ifc + sc + 2                  // real EX cycle (correct timing)
    const displayStalls = actualEX - naturalID - 1   // bubbles shown: naturalID+1 … actualEX-1

    const stages = [
      { name: 'IF', cycle: naturalIF },
      { name: 'ID', cycle: naturalID },
    ]
    for (let s = 0; s < displayStalls; s++) {
      stages.push({ name: 'STALL', cycle: naturalID + 1 + s })
    }
    stageNamesAfterIF.slice(1).forEach((name, idx) => {
      stages.push({ name, cycle: actualEX + idx })
    })

    return {
      instrIdx: i,
      instr,
      ifCycle: naturalIF,
      stallCount: displayStalls,    // total bubbles visible in this row
      computedStall: sc,            // stalls from own dependency (used for stats)
      stages,
    }
  })

  // ── Step 3: derive totals ──────────────────────────────────────────────────
  const lastSched   = schedule[n - 1]
  const totalCycles = lastSched.stages[lastSched.stages.length - 1].cycle

  // stallsTotal = sum of each instruction's own dependency stalls (the meaningful metric)
  const stallsTotal = stallCounts.reduce((a, b) => a + b, 0)

  // ── Step 4: forwarding events ──────────────────────────────────────────────
  const forwardingEvents = []
  if (forwardingEnabled) {
    for (const hz of rawHazards) {
      const p   = hz.producerIdx
      const c   = hz.consumerIdx
      const icp = ifCycles[p]
      const sp  = stallCounts[p]
      const icc = ifCycles[c]
      const sc  = stallCounts[c]

      const prodExCycle = icp + sp + 2
      const consExCycle = icc + sc + 2

      if (is5Stage) {
        if (instructions[p].op === 'LW') {
          const prodMemCycle = icp + sp + 3
          if (consExCycle > prodMemCycle) {
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
        // 4-stage
        if (instructions[p].op === 'LW') {
          const prodMWBCycle = icp + sp + 3
          if (consExCycle > prodMWBCycle) {
            forwardingEvents.push({
              producerIdx: p, consumerIdx: c, register: hz.register,
              fromStage: 'MEM/WB', toStage: 'EX', cycle: consExCycle,
            })
          }
        } else {
          const exGap = consExCycle - prodExCycle
          if (exGap >= 1 && exGap <= 2) {
            forwardingEvents.push({
              producerIdx: p, consumerIdx: c, register: hz.register,
              fromStage: exGap === 1 ? 'EX' : 'MEM/WB', toStage: 'EX', cycle: consExCycle,
            })
          }
        }
      }
    }
  }

  // stallsSaved = cycle-count difference (clean and intuitive)
  const stallsSaved = forwardingEnabled
    ? Math.max(0, simulate(instructions, { ...config, forwardingEnabled: false }).totalCycles - totalCycles)
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
