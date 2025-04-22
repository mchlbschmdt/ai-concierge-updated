
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', // Blue-600
        accent: '#8B5CF6',   // Vivid Purple
        card: '#f9fafb',
        dark: '#212332',
        sidebar: '#ffffff',
        secondary: '#7E69AB',
        'gray-soft': '#f1f0fb',
        'gray-light': '#F7FAFC',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      boxShadow: {
        card: "0 4px 20px rgba(30,41,59,0.08), 0 1.5px 3px rgba(40,40,115,0.03)"
      },
      transitionProperty: {
        colors: 'background-color, border-color, color, fill, stroke',
      },
    },
  },
  plugins: [],
};
