import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fdf2f6',
          100: '#fce7ef',
          200: '#fad0e1',
          300: '#f7a9c8',
          400: '#f07095',
          500: '#E75480',
          600: '#d4366a',
          700: '#b22458',
          800: '#94204d',
          900: '#7c1f44',
          950: '#490c24',
        },
        brand: '#E75480',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
