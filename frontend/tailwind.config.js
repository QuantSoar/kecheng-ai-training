/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#fffdf9',
          100: '#faf6f0',
          200: '#f0e6d8',
          300: '#e8dcc8',
          400: '#c4a882',
          500: '#9a7b5f',
          600: '#7a6555',
          700: '#5c4a3d',
          800: '#4a382c',
          900: '#3d2c1e',
        },
        accent: {
          primary: '#c45c26',
          secondary: '#d97706',
          gold: '#b8860b',
          orange: '#e85d04',
          green: '#6b8f3c',
          blue: '#5b7fa5',
        },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        warm: '0 4px 24px rgba(196, 92, 38, 0.08)',
        card: '0 2px 12px rgba(61, 44, 30, 0.06)',
      },
    },
  },
  plugins: [],
}
