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
        // User's Exact Custom Palette
        palette: {
          indigo: '#23003F',   // Dark Indigo
          red: '#F94500',      // Red / Vibrant Orange-Red
          purple: '#BCACCE',   // Light Purple / Lavender
          yellow: '#FFFDB4',   // Light Yellow / Cream
        },
        indigo: {
          950: '#150027',
          900: '#23003F', // Dark Indigo base
          800: '#2F0850',
          700: '#3D0E66',
          600: '#541A88',
        },
        red: {
          brand: '#F94500',
          hover: '#DB3C00',
          light: '#FFEDE5',
        },
        purple: {
          lavender: '#BCACCE',
          light: '#FAF8FD',
          border: '#E7E0EE',
        },
        yellow: {
          cream: '#FFFDB4',
          light: '#FFFEEA',
        },
      },
      fontFamily: {
        // Heading & Brand: Plus Jakarta Sans (Modern, Geometric, High-Impact)
        heading: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        // Body & UI: Inter (Clean, Modern, Exceptional Readability)
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        body: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        // Numbers & Metrics: Inter with Tabular Figures
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
