
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
        // Hostly AI Branding (ADA refined)
        primary: "#1b3898",    // Navigation & CTA - deep blue
        cta: "#1b3898",        // CTA - same deep blue as navigation
        secondary: "#22305b",  // Accent/deep navy
        accent: "#8797c7",     // Soft blue accent, ADA compliant
        background: "#dde4ff", // Main body color
        card: "#ffffff",
        muted: "#f2f4fa",
        body: "#dde4ff",
        heading: "#16213d",
        'gray-soft': "#e2e5f3",
        'gray-dark': "#263361",
        success: "#23663a",    // Deeper ADA green
        error: "#922024",      // Darker error red for contrast
        warning: "#ad8a1b",    // Deep gold ADA
      },
      fontFamily: {
        sans: ['Montserrat', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Playfair Display', 'Plus Jakarta Sans', 'serif'],
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
