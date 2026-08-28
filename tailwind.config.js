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
          950: '#17002B',
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
          light: '#F4F1F8',
          border: '#D5CBE0',
        },
        yellow: {
          cream: '#FFFDB4',
          light: '#FFFEEA',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          'system-ui',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        mono: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
        num: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
}
