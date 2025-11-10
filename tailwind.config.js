/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        stripe: {
          primary: '#635BFF',
          hover: '#0A2540',
          dark: '#0A2540',
          light: '#F6F9FC',
          border: '#E3E8EF',
        },
      },
    },
  },
  plugins: [],
};
