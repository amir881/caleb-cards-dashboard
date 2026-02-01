/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Chicago Bears official colors
        bears: {
          navy: '#0B162A',
          orange: '#C83803',
          white: '#FFFFFF',
          gray: '#A5ACAF',
          'navy-light': '#1a2640',
          'orange-light': '#e04a0f',
          'orange-dark': '#a02d00',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
