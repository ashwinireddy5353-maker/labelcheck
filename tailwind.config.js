/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e', // Primary Deep Teal
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        emerald: {
          50: '#ecfdf5', // Soft Mint
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        brand: {
          primary: '#0f766e',
          secondary: '#059669',
          mint: '#ecfdf5',
          navy: '#0f172a',
          warning: '#d97706',
          hazard: '#dc2626',
          safe: '#16a34a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(15, 118, 110, 0.08)',
        'card': '0 2px 10px rgba(0, 0, 0, 0.04), 0 10px 25px -5px rgba(15, 118, 110, 0.05)',
      }
    },
  },
  plugins: [],
}
