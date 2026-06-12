/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        navy: {
          900: '#0F1923',
          800: '#1B2A4A',
          700: '#2A3F5F',
          600: '#3A4F6F',
        },
        gold: {
          500: '#D4A843',
          600: '#B8912E',
          400: '#E0B85A',
        }
      },
    },
  },
  plugins: [],
};
