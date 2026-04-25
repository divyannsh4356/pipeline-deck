// Parse a single instruction string into a structured object
export function parseInstruction(text, index) {
  const raw = text.trim()
  if (!raw) return { error: 'Empty instruction' }

  const upper = raw.toUpperCase().replace(/\s+/g, ' ')

  // R-type: ADD, SUB, MUL, DIV, AND, OR, NOR, XOR, SLT  →  OP Rd, Rs1, Rs2
  const rType = upper.match(/^(ADD|SUB|MUL|DIV|AND|OR|NOR|XOR|SLT)\s+(R\d+),\s*(R\d+),\s*(R\d+)$/)
  if (rType) {
    return {
      id: index,
      raw,
      op: rType[1],
      dest: rType[2],
      src1: rType[3],
      src2: rType[4],
      type: 'R',
    }
  }

  // I-type immediate: ADDI, SUBI, ANDI, ORI  →  OP Rd, Rs, imm
  const iType = upper.match(/^(ADDI|SUBI|ANDI|ORI)\s+(R\d+),\s*(R\d+),\s*(-?\d+)$/)
  if (iType) {
    return {
      id: index,
      raw,
      op: iType[1],
      dest: iType[2],
      src1: iType[3],
      src2: null,
      imm: iType[4],
      type: 'I',
    }
  }

  // LW R1, offset(R2)
  const lw = upper.match(/^LW\s+(R\d+),\s*(-?\d+)\((R\d+)\)$/)
  if (lw) {
    return {
      id: index,
      raw,
      op: 'LW',
      dest: lw[1],
      src1: lw[3],
      src2: null,
      type: 'LOAD',
    }
  }

  // SW R1, offset(R2)
  const sw = upper.match(/^SW\s+(R\d+),\s*(-?\d+)\((R\d+)\)$/)
  if (sw) {
    return {
      id: index,
      raw,
      op: 'SW',
      dest: null,
      src1: sw[3],   // base-address register
      src2: sw[1],   // data register (the one being stored)
      type: 'STORE',
    }
  }

  return { error: `Unrecognized instruction: "${raw}"` }
}

export function parseAll(lines) {
  return lines.map((line, i) => parseInstruction(line, i))
}

export const EXAMPLES = {
  'No Hazards': [
    'ADD R1, R2, R3',
    'SUB R4, R5, R6',
    'AND R7, R8, R9',
    'OR R10, R11, R12',
  ],
  'RAW Hazard': [
    'ADD R1, R2, R3',
    'SUB R4, R1, R5',
    'AND R6, R4, R7',
  ],
  'Load-Use': [
    'LW R1, 0(R2)',
    'ADD R3, R1, R4',
    'SUB R5, R6, R7',
  ],
  'MUL/DIV Chain': [
    'LW R1, 0(R2)',
    'MUL R3, R1, R4',
    'DIV R5, R3, R6',
    'ADD R7, R5, R8',
  ],
}
