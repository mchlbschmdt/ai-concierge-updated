
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1666bb', // Enterprise Blue
        accent: '#10192A', // Dark navy black
        sidebar: '#10192A', // Sidebar dark
        background: '#fff', // White main background
        card: '#f9fafb', // Light card
        muted: '#d9e5fa', // Soft blue
        button: '#1564c1', // Button blue
        'button-hover': '#1071e8',
        'gray-soft': '#f6f8fa',
        'gray-dark': '#232a36',
        'text-main': '#1a2838',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      boxShadow: {
        card: "0 2px 16px 0 rgba(33,43,66,0.08)",
        nav: "0 2px 8px rgba(16,25,42,0.06)",
        sidebar: "4px 0 16px 0 rgba(0,0,0,0.06)"
      },
    },
  },
  plugins: [],
};
