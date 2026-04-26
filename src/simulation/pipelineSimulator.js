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
 *   Stall bubbles fill every cycle from naturalIF[i]+1 up to (but not including) the
 *   actual ID cycle — this includes both the instruction's own stalls AND any extra
 *   cycles the fetch stage was frozen due to upstream instructions stalling.
 *   ID / EX / MEM / WB are shown at exactly the cycles computed by the model above.
 *
 * This gives the intuitive "instruction is fetched, then stalls until data ready" view
 * while still computing the correct timing for all stages.
 *
 * Stall formulae (verified against all PDF test cases):
 *
 *   No forwarding, 5-stage:  max(0, icp + sp + 4 − icc)
 *   No forwarding, 4-stage:  max(0, icp + sp + 3 − icc)
 *   Forwarding, arithmetic:  max(0, icp + sp + 1 − icc)   [EX→EX, 0 stalls if adjacent]
 *   Forwarding, LW 5-stage:  max(0, icp + sp + 3 − icc)   [WB→ID write-before-read, 2 stalls if adjacent]
 *   Forwarding, LW 4-stage:  max(0, icp + sp + 2 − icc)   [MEM/WB→ID write-before-read, 1 stall if adjacent]
 *
 *   GATE model rationale for 5-stage LW:
 *   The loaded value is NOT available via any bypass path during MEM.
 *   The consumer's ID stage reads the register file — but MEM and ID cannot
 *   overlap because the register file still holds the stale value at that point.
 *   The consumer must wait until the producer's WB stage, then both WB (write)
 *   and ID (read) happen in the same cycle via write-before-read convention.
 *   EX and ID CAN overlap because EX→EX forwarding delivers the correct value
 *   at the consumer's EX stage, bypassing the stale register-file read.
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
          needed = is5Stage
            ? Math.max(0, icp + sp + 3 - icc)   // 5-stage: WB→ID write-before-read (2 stalls if adjacent)
            : Math.max(0, icp + sp + 2 - icc)   // 4-stage: MEM/WB→ID write-before-read (1 stall if adjacent)
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

  // ── Step 2: build schedule with natural-sequential IF display ───────────────
  // IF is always at i+1 (natural fetch order).
  // Stall bubbles fill from naturalIF+1 to actualID-1 (includes both own stalls
  // AND cycles the fetch stage was frozen by upstream stalls).
  const schedule = instructions.map((instr, i) => {
    const ifc = ifCycles[i]
    const sc  = stallCounts[i]

    const naturalIF = i + 1                      // displayed IF cycle (always sequential)
    const actualID  = ifc + sc + 1               // real ID cycle (correct timing)
    const displayStalls = actualID - naturalIF - 1  // bubbles shown: naturalIF+1 … actualID-1

    const stages = [{ name: 'IF', cycle: naturalIF }]
    for (let s = 0; s < displayStalls; s++) {
      stages.push({ name: 'STALL', cycle: naturalIF + 1 + s })
    }
    stageNamesAfterIF.forEach((name, idx) => {
      stages.push({ name, cycle: actualID + idx })
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
          const prodWbCycle  = icp + sp + 4
          const consIdCycle  = icc + sc + 1
          if (consIdCycle === prodWbCycle) {
            forwardingEvents.push({
              producerIdx: p, consumerIdx: c, register: hz.register,
              fromStage: 'WB', toStage: 'ID', cycle: consIdCycle,
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
