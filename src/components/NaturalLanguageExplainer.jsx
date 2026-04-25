import { useState, useEffect } from 'react'
import { generateExplanation } from '../utils/huggingfaceApi.js'

export default function NaturalLanguageExplainer({ result, instructions }) {
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)
  const [displayed, setDisplayed] = useState('')
  const [usingFallback, setUsingFallback] = useState(false)

  const generate = async () => {
    if (!result || !instructions.length) return
    setLoading(true); setDisplayed('')
    setUsingFallback(!import.meta.env.VITE_HF_API_KEY)
    const text = await generateExplanation(instructions, result)
    setExplanation(text); setLoading(false)
  }

  // Typewriter effect
  useEffect(() => {
    if (!explanation) return
    let i = 0; setDisplayed('')
    const iv = setInterval(() => {
      if (i <= explanation.length) { setDisplayed(explanation.slice(0, i)); i++ }
      else clearInterval(iv)
    }, 16)
    return () => clearInterval(iv)
  }, [explanation])

  // Auto-generate every time result changes (i.e. every Run)
  useEffect(() => { if (result && instructions.length) generate() }, [result])

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <span className="text-xs text-gray-400">{usingFallback ? 'Rule-based analysis' : 'Mistral-7B via Hugging Face'}</span>
        {loading && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-indigo-500">
            <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin inline-block" />
            Analyzing…
          </span>
        )}
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 min-h-[80px]">
        {loading
          ? <div className="flex items-center gap-2 text-gray-400 text-sm"><div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />Analyzing pipeline…</div>
          : displayed
          ? <p className="text-gray-700 text-sm leading-relaxed">{displayed}<span className="animate-pulse text-indigo-500 ml-0.5">|</span></p>
          : <p className="text-gray-300 text-sm italic">Run a simulation to generate the debrief.</p>
        }
      </div>
    </div>
  )
}
