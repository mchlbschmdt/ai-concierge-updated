
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
        // HostlyAI color palette from https://www.hostlyai.co
        primary: "#595DFF", // Main Hostly Blue/Purple
        secondary: "#5AF5FF", // Accent Cyan/Blue
        accent: "#374BFF", // Deeper blue
        background: "#F9FAFB", // Subtle gray background
        card: "#fff", // white cards
        muted: "#F3F6FB", // Soft background
        'purple-dark': "#233C7B", // For text/icons
        'purple-light': "#8A95FF",
        'gradient-start': "#595DFF",
        'gradient-end': "#5AF5FF",
        'gray-soft': "#f6f8fa",
        'gray-dark': "#232a36",
        'text-main': "#233C7B",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Playfair Display', 'serif'],
      },
      boxShadow: {
        card: "0 2px 16px 0 rgba(89,93,255,0.10)", // subtle blue glow
        nav: "0 2px 8px rgba(89,93,255,0.06)",
        sidebar: "4px 0 16px 0 rgba(89,93,255,0.09)"
      },
      backgroundImage: {
        'gradient-to-r': 'linear-gradient(90deg, #595DFF 0%, #5AF5FF 100%)',
        'gradient-hostly': 'linear-gradient(90deg, #595DFF 0%, #5AF5FF 100%)',
      },
    },
  },
  plugins: [],
};
