/**
 * Legacy forwarding engine — kept for compatibility.
 * The main simulation logic has been moved into pipelineSimulator.js.
 *
 * These functions are no longer called by the simulator but are preserved
 * in case external code uses them directly.
 */

export function stallsNeededWithForwarding(producer, consumer, prodIfCycle, prodStalls, consIfCycle, stages) {
  if (stages === 5) {
    if (producer.op === 'LW') {
      return Math.max(0, prodIfCycle + prodStalls + 2 - consIfCycle)
    }
    return Math.max(0, prodIfCycle + prodStalls + 1 - consIfCycle)
  } else {
    if (producer.op === 'LW') {
      return Math.max(0, prodIfCycle + prodStalls + 2 - consIfCycle)
    }
    return Math.max(0, prodIfCycle + prodStalls + 1 - consIfCycle)
  }
}

export function stallsNeededNoForwarding(producer, consumer, prodIfCycle, prodStalls, consIfCycle, stages) {
  const wbOffset = stages === 5 ? 4 : 3
  return Math.max(0, prodIfCycle + prodStalls + wbOffset - consIfCycle)
}
