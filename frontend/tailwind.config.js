/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0056B3', // Azul institucional
          600: '#004085',
          700: '#003366',
        },
        aging: {
          normal: '#2E7D32', // Verde
          warning: '#F57C00', // Naranja/Amarillo
          critical: '#D32F2F', // Rojo
        }
      },
    },
  },
  plugins: [],
};
