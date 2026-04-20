/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        stage: {
          if: '#3b82f6',
          id: '#22c55e',
          ex: '#eab308',
          mem: '#f97316',
          wb: '#a855f7',
          stall: '#ef4444',
        },
      },
      animation: {
        pulse: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        typewriter: 'typewriter 2s steps(40) forwards',
        'glow-move': 'glowMove 3s ease-in-out infinite',
      },
      keyframes: {
        glowMove: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
