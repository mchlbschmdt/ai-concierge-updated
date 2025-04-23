
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
        // Hostly AI Branding (refined for ADA, per user)
        primary: "#1b3898",         // Navigation & CTA (from user)
        secondary: "#8797c7",       // Soft blue accent for ADA compliance
        accent: "#22305b",          // Deep navy accent (ADA/compliant)
        background: "#dde4ff",      // Main body color (from user)
        card: "#ffffff",            // Card backgrounds
        muted: "#f2f4fa",           // Subtle muted backgrounds
        'nav': "#1b3898",           // Navigation
        'cta': "#1b3898",           // Explicit CTA
        'body': "#dde4ff",          // Body BG
        'heading': "#16213d",       // Deep heading color
        'gray-soft': "#e2e5f3",     // Lighter neutral for panels
        'gray-dark': "#263361",     // For icons/text, if needed
        success: "#41936a",         // ADA green, slightly deeper
        error: "#D5485D",           // ADA error red
        warning: "#c99420",         // ADA yellow
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', '"Plus Jakarta Sans"', 'serif'],
      },
      boxShadow: {
        card: "0 2px 16px 0 rgba(27,56,152,0.09)",
        nav: "0 2px 8px rgba(27,56,152,0.06)",
        sidebar: "4px 0 16px 0 rgba(27,56,152,0.08)",
      },
      backgroundImage: {
        'gradient-to-r': 'linear-gradient(90deg, #1b3898 0%, #8797c7 100%)',
        'gradient-hostly': 'linear-gradient(90deg, #1b3898 0%, #8797c7 100%)',
      },
    },
  },
  plugins: [],
};
