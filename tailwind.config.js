/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        canvas: {
          bg: '#FFFFFF',
          card: '#FFFFFF',
          sidebar: '#FFFFFF',
          subtle: '#F8FAFC',
          border: '#E2E8F0',
          borderLight: '#F1F5F9',
        },
        slate: {
          850: '#131D31',
          950: '#090E17',
        }
      },
      fontFamily: {
        // Apple San Francisco / SF Pro font for general text (matching "Apple Folder Ui" photo)
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
        // Inter for numbers, stats, tabular data, and metrics
        mono: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
        num: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        none: 'none',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
