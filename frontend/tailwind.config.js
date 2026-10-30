/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#070a13',
          base: '#0c111d',
          surface: '#131b2e',
          card: '#1a233a',
          border: '#243252',
          muted: '#62729a',
          text: '#e2e8f0',
          accent: '#06b6d4',      // cyan
          emerald: '#10b981',     // safe/verified
          amber: '#f59e0b',       // warning/inconclusive
          rose: '#f43f5e',        // critical/rejected
          purple: '#8b5cf6',      // AI synthesis
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

