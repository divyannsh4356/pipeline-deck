const HF_API_KEY = import.meta.env.VITE_HF_API_KEY
const MODEL = 'mistralai/Mistral-7B-Instruct-v0.3'

export async function generateExplanation(instructions, result) {
  const stageMode = result.config.pipelineStages === 5 ? '5-stage' : '4-stage'
  const fwdMode = result.config.forwardingEnabled ? 'with forwarding enabled' : 'stall-only (no forwarding)'
  const instrList = instructions.map((ins, i) => `I${i + 1}: ${ins.raw}`).join(', ')
  const stallDetails = result.schedule
    .filter(s => s.stallCount > 0)
    .map(s => `I${s.instrIdx + 1} (${s.instr.raw}) stalled ${s.stallCount} cycle(s)`)
    .join('; ')
  const hazardDetails = result.rawHazards
    .map(h => `I${h.producerIdx + 1}→I${h.consumerIdx + 1} on ${h.register}`)
    .join(', ')

  const prompt = `<s>[INST] You are a computer architecture teaching assistant. Explain the following pipeline simulation in plain English for a student.

Instructions: ${instrList}
Pipeline: ${stageMode} ${fwdMode}
RAW Hazards: ${hazardDetails || 'none'}
Stalls: ${stallDetails || 'none'}
Total cycles: ${result.totalCycles}
CPI: ${(result.totalCycles / instructions.length).toFixed(2)}
Stalls saved by forwarding: ${result.stallsSaved}

Give a 3–5 sentence plain English explanation of what happened, why stalls occurred, and how forwarding helped. [/INST]`

  if (!HF_API_KEY) return fallbackExplanation(instructions, result)

  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 300, temperature: 0.7 } }),
    })

    if (!res.ok) return fallbackExplanation(instructions, result)
    const data = await res.json()
    const text = Array.isArray(data)
      ? data[0]?.generated_text?.split('[/INST]').pop()?.trim()
      : data.generated_text?.split('[/INST]').pop()?.trim()
    return text || fallbackExplanation(instructions, result)
  } catch {
    return fallbackExplanation(instructions, result)
  }
}

function fallbackExplanation(instructions, result) {
  const n = instructions.length
  const { totalCycles, stallsTotal, stallsSaved, rawHazards, config } = result
  const cpi = (totalCycles / n).toFixed(2)
  const fwd = config.forwardingEnabled
  const stages = config.pipelineStages

  let text = `This ${stages}-stage pipeline executed ${n} instruction${n > 1 ? 's' : ''} in ${totalCycles} cycles (CPI = ${cpi}). `

  if (rawHazards.length === 0) {
    text += 'No data hazards were detected — all instructions are independent, so the pipeline ran at full efficiency with no stalls. '
  } else {
    const regList = [...new Set(rawHazards.map(h => h.register))].join(', ')
    text += `There ${rawHazards.length === 1 ? 'was' : 'were'} ${rawHazards.length} RAW (Read-After-Write) hazard${rawHazards.length > 1 ? 's' : ''} involving register${rawHazards.length > 1 ? 's' : ''} ${regList}. `

    if (stallsTotal > 0) {
      text += `This caused ${stallsTotal} stall bubble${stallsTotal > 1 ? 's' : ''} to be inserted into the pipeline, padding the pipeline with NOP cycles until the required data was available. `
    }

    if (fwd && stallsSaved > 0) {
      text += `Forwarding (data bypassing) saved ${stallsSaved} stall cycle${stallsSaved > 1 ? 's' : ''} by routing results directly from the EX or MEM stage output back to the EX stage input, avoiding full write-back delays. `
    } else if (!fwd) {
      text += 'Forwarding was disabled, so every RAW hazard required full stall cycles until the result was written back to the register file. '
    }
  }

  const loadUse = result.rawHazards.filter(h => instructions[h.producerIdx]?.op === 'LW')
  if (loadUse.length > 0) {
    text += `A load-use hazard was detected for LW — even with forwarding, 1 stall cycle is unavoidable because memory data is not available until after the MEM stage, which is too late for the immediately following instruction's EX stage. `
  }

  return text.trim()
}
