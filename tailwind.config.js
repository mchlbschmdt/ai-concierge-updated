
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
        // Primary Colors
        primary: "#1b3898",
        'primary-foreground': "#ffffff",
        secondary: "#8797c7",
        'secondary-foreground': "#ffffff",
        accent: "#22305b",
        'accent-foreground': "#ffffff",
        
        // Backgrounds
        background: "#f8f9fc",
        foreground: "#16213d",
        card: "#ffffff",
        'card-foreground': "#16213d",
        
        // UI Elements
        muted: "#f2f4fa",
        'muted-foreground': "#6b7280",
        border: "#e2e5f3",
        input: "#ffffff",
        ring: "#1b3898",
        
        // Semantic Colors
        success: "#41936a",
        'success-foreground': "#ffffff",
        error: "#D5485D",
        'error-foreground': "#ffffff",
        warning: "#c99420",
        'warning-foreground': "#ffffff",
        info: "#3b82f6",
        'info-foreground': "#ffffff",
        
        // Additional
        heading: "#16213d",
        disabled: "#9ca3af",
        nav: "#1b3898",
        cta: "#1b3898",
        
        // Sidebar
        sidebar: "#1E2A4A",
        'sidebar-foreground': "#94A3B8",
        'sidebar-active': "#FFFFFF",
        
        // Neutral Scale
        neutral: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        card: "0 2px 16px 0 rgba(27,56,152,0.09)",
        nav: "0 2px 8px rgba(27,56,152,0.06)",
        sidebar: "4px 0 16px 0 rgba(27,56,152,0.08)",
        focus: "0 0 0 3px rgba(27, 56, 152, 0.3)",
      },
      borderRadius: {
        xs: "0.125rem",
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        full: "9999px",
      },
      backgroundImage: {
        'gradient-to-r': 'linear-gradient(90deg, #1b3898 0%, #8797c7 100%)',
        'gradient-hostly': 'linear-gradient(90deg, #1b3898 0%, #8797c7 100%)',
      },
    },
  },
  plugins: [],
};
