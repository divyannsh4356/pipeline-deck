// Returns list of RAW hazard pairs: { producer, consumer, register }
export function detectRAWHazards(instructions) {
  const hazards = []
  for (let i = 0; i < instructions.length; i++) {
    const prod = instructions[i]
    if (!prod.dest) continue
    for (let j = i + 1; j < instructions.length; j++) {
      const cons = instructions[j]
      const sources = [cons.src1, cons.src2].filter(Boolean)
      if (sources.includes(prod.dest)) {
        hazards.push({ producerIdx: i, consumerIdx: j, register: prod.dest })
      }
    }
  }
  return hazards
}

export function detectWARHazards(instructions) {
  const hazards = []
  for (let i = 0; i < instructions.length; i++) {
    const early = instructions[i]
    const reads = [early.src1, early.src2].filter(Boolean)
    for (let j = i + 1; j < instructions.length; j++) {
      const late = instructions[j]
      if (late.dest && reads.includes(late.dest)) {
        hazards.push({ readerIdx: i, writerIdx: j, register: late.dest, type: 'WAR' })
      }
    }
  }
  return hazards
}

export function detectWAWHazards(instructions) {
  const hazards = []
  for (let i = 0; i < instructions.length; i++) {
    const a = instructions[i]
    if (!a.dest) continue
    for (let j = i + 1; j < instructions.length; j++) {
      const b = instructions[j]
      if (b.dest === a.dest) {
        hazards.push({ firstIdx: i, secondIdx: j, register: a.dest, type: 'WAW' })
      }
    }
  }
  return hazards
}
