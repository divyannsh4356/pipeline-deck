# Plaksha Orbital Pipeline Deck

A visual pipeline hazard simulator for computer architecture education.

## Features

- **5-stage and 4-stage pipeline simulation** (IF, ID, EX, MEM, WB)
- **RAW hazard detection** with stall insertion
- **Data forwarding** (EX→EX, MEM→EX bypass)
- **Load-use hazard** handling (1 unavoidable stall with forwarding)
- **WAR / WAW hazard** educational display (no stalls in-order)
- **Side-by-side comparison** — stall-only vs forwarding
- **Dependency graph** (DAG) with SVG arrows
- **Step-by-step animation** with forward/backward navigation
- **Live register file** and pipeline register displays
- **Hazard scoreboard** per register
- **Statistics panel** — CPI, efficiency, stall heatmap
- **Mission Debrief** — rule-based explanation (+ Mistral-7B via HF API)
- **Export** to PNG, JSON, CSV
- **Comparison history** across up to 5 runs

## Running Locally

```bash
cd pipeline-simulator
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables (Optional)

For AI-powered debrief (free, no credit card):

1. Get a free token at https://huggingface.co/settings/tokens
2. Create a `.env` file:

```
VITE_HF_API_KEY=hf_your_token_here
```

The app works fully without an API key using the built-in rule-based explainer.

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to https://vercel.com → New Project → Import repo
3. Vercel auto-detects Vite — just click Deploy
4. Optional: add `VITE_HF_API_KEY` in Vercel Environment Variables

## Deploy to Netlify

1. Push to GitHub
2. New site → Import from Git → set build command `npm run build`, publish dir `dist`
3. Optional: add env var in Site Settings → Environment Variables

## Sample Test Cases

| Instructions | Mode | Expected CPI |
|---|---|---|
| `ADD R1,R2,R3` + `SUB R4,R5,R6` | 5-stage, fwd | 1.0 |
| `ADD R1,R2,R3` + `SUB R4,R1,R5` | 5-stage, no fwd | 2.0 |
| `ADD R1,R2,R3` + `SUB R4,R1,R5` | 5-stage, fwd | 1.5 |
| `LW R1,0(R2)` + `ADD R3,R1,R4` | 5-stage, fwd | 1.5 (1 unavoidable stall) |
| `LW R1,0(R2)` + `ADD R3,R1,R4` | 5-stage, no fwd | 2.0 |
