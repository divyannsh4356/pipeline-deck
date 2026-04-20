/**
 * Given a producer start cycle and a consumer start cycle (before stall adjustment),
 * compute how many stall cycles are needed with forwarding enabled.
 *
 * 5-stage: IF ID EX MEM WB
 *   producer WB at: start + 4
 *   EX result ready at: start + 2  → forward to consumer EX (start + 2) → 0 stalls if gap >= 2
 *   MEM result ready at: start + 3 → forward to consumer EX (start + 2) → 0 stalls if gap >= 1 (i.e. adjacent)
 *   Load-use: producer is LW, result only at MEM (start+3), needs consumer EX (start+2) → 1 stall
 *
 * 4-stage: IF ID EX MEM/WB
 *   stages are 0-indexed positions: IF=0 ID=1 EX=2 MEM/WB=3
 *   EX result ready at start+2, forward to consumer EX (start+2)
 */
export function stallsNeededWithForwarding(producer, consumer, prodStart, consStart, stages) {
  const gap = consStart - prodStart // how many cycles apart they start

  if (stages === 5) {
    if (producer.op === 'LW') {
      // load-use: need 1 stall even with forwarding
      if (gap === 1) return 1
      if (gap <= 0) return 2
      return 0
    }
    // arithmetic: EX result ready after 2 cycles
    if (gap >= 2) return 0
    if (gap === 1) return 1
    return 2
  } else {
    // 4-stage
    if (producer.op === 'LW') {
      if (gap === 1) return 1
      if (gap <= 0) return 1
      return 0
    }
    if (gap >= 2) return 0
    if (gap === 1) return 0 // MEM/WB forward covers it
    return 1
  }
}

export function stallsNeededNoForwarding(producer, consumer, prodStart, consStart, stages) {
  const gap = consStart - prodStart

  if (stages === 5) {
    // WB completes at prodStart + 4, consumer needs at ID = consStart + 1
    const wbCycle = prodStart + 4
    const idCycle = consStart + 1
    return Math.max(0, wbCycle - idCycle)
  } else {
    // 4-stage: WB at prodStart + 3
    const wbCycle = prodStart + 3
    const idCycle = consStart + 1
    return Math.max(0, wbCycle - idCycle)
  }
}
