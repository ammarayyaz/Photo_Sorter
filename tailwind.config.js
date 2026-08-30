/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FCA311',
          hover: '#E08F0A',
          light: '#FFF8EB',
          dark: '#B07106',
        },
        dark: {
          bg: '#000000',
          surface: '#0A0F1D',
          card: '#14213D',
          sub: '#1A2A4C',
          border: '#223150',
        },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        body: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"Inter"', 'monospace'],
        num: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['9px', { lineHeight: '12px', letterSpacing: '0.04em' }],
        'xs': ['11px', { lineHeight: '15px' }],
        'sm': ['13px', { lineHeight: '18px' }],
        'base': ['14px', { lineHeight: '20px' }],
        'lg': ['16px', { lineHeight: '22px' }],
        'xl': ['18px', { lineHeight: '24px', letterSpacing: '-0.01em' }],
        '2xl': ['22px', { lineHeight: '28px', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
}
