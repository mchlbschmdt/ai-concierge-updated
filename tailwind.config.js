/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', // Blue-600
        sidebar: '#f9fafb',
      },
    },
  },
  plugins: [],
};
