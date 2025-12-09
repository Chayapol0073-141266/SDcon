/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: {
          pastel: {
            orange: '#FFD1A9',
            orangeLight: '#FFE5D9',
            orangeDark: '#FF9E6F',
            text: '#5D4037',
            bg: '#FFF8F3',
            accent: '#FFB347'
          }
        },
        fontFamily: {
          sans: ['Inter', 'Sarabun', 'sans-serif'],
        }
    },
  },
  plugins: [],
}