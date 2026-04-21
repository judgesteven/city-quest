/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cq: {
          bg: '#0b0f14',
          card: '#1a1d24',
          cardElevated: '#22262e',
          border: 'rgba(255,255,255,0.08)',
          muted: '#8b92a0',
          ink: '#f4f6f8',
          blue: '#38bdf8',
          'blue-glow': 'rgba(56, 189, 248, 0.35)',
          nav: 'rgba(15, 23, 42, 0.82)',
          orange: '#f97316',
          cyan: '#22d3ee',
        },
      },
      borderRadius: {
        card: '24px',
        pill: '9999px',
      },
      boxShadow: {
        'nav-pill': '0 12px 40px rgba(0, 0, 0, 0.45)',
        'card-dark': '0 16px 48px rgba(0, 0, 0, 0.55)',
        'tab-active': '0 0 0 1px rgba(56, 189, 248, 0.45), 0 0 24px rgba(56, 189, 248, 0.25)',
      },
    },
  },
  plugins: [],
}
