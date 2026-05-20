/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#09090b",
        secondary: "#18181b",
        tertiary: "#27272a",
        
        text: {
          primary: "#fafafa",
          secondary: "#a1a1aa",
          muted: "#71717a",
        },
        
        border: {
          default: "#27272a",
          subtle: "#18181b",
          strong: "#3f3f46",
        },
        
        brand: {
          primary: "#8b5cf6",
          secondary: "#ec4899",
        },
        hover: "#27272a", // zinc-800, used for hover states
        
        semantic: {
          success: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444",
          info: "#3b82f6",
        }
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(139, 92, 246, 0.3)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
};