
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
        // Hostly AI Branding from https://www.hostlyai.co (ADA-compliant)
        primary: "#5864AE",         // Muted Hostly blue (softened for ADA)
        secondary: "#53C7E9",       // Soft cyan-blue accent
        accent: "#263361",          // Deep navy, good for contrast
        background: "#F8FAFB",      // Faint gray background, matches hero sections
        card: "#FFFFFF",            // Pure white for cards and surfaces
        muted: "#F0F3FA",           // Soft gray for subtle backgrounds
        'purple-dark': "#232947",   // Dark text, high contrast, brand-compliant
        'purple-light': "#A4B8F5",  // Pastel blue/purple lighten 
        'gradient-start': "#5864AE",// Gradient start (matches primary)
        'gradient-end': "#53C7E9",  // Gradient end (matches secondary)
        'gray-soft': "#ECECF7",     // Soft neutral, slightly blue-gray
        'gray-dark': "#263361",     // Good for text/icons on light backgrounds
        'text-main': "#232947",     // Brand text color
        success: "#4BB977",         // ADA friendly green for success
        warning: "#F7C948",         // ADA yellow for warning
        error: "#E4585C",           // Hostly red for errors, ADA compliant
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Playfair Display', 'serif'],
      },
      boxShadow: {
        card: "0 2px 16px 0 rgba(88,100,174,0.09)", // subtle blue shadow
        nav: "0 2px 8px rgba(88,100,174,0.06)",
        sidebar: "4px 0 16px 0 rgba(88,100,174,0.08)",
      },
      backgroundImage: {
        'gradient-to-r': 'linear-gradient(90deg, #5864AE 0%, #53C7E9 100%)',
        'gradient-hostly': 'linear-gradient(90deg, #5864AE 0%, #53C7E9 100%)',
      },
    },
  },
  plugins: [],
};
