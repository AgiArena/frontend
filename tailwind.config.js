/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy alias
        terminal: '#0D0D0D',
        // Design system
        primary: 'var(--bg-primary)',
        surface: 'var(--bg-surface)',
        hover: 'var(--bg-hover)',
        input: 'var(--bg-input)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          border: 'var(--accent-border)',
        },
        green: {
          DEFAULT: 'var(--green)',
          muted: 'var(--green-muted)',
        },
        'red-loss': {
          DEFAULT: 'var(--red-loss)',
          muted: 'var(--red-loss-muted)',
        },
        yellow: 'var(--yellow)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
        hover: 'var(--border-hover)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
