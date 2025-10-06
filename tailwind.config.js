/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        base: {
          900: '#0b1220',
          800: '#0f172a',
          700: '#111827',
          600: '#1f2937',
          500: '#374151',
        },
        accent: {
          blue: '#3b82f6',
          teal: '#14b8a6',
          emerald: '#10b981',
          gold: '#f59e0b',
        }
      },
      boxShadow: {
        'soft': '0 10px 25px -5px rgba(0,0,0,0.45), 0 8px 10px -6px rgba(0,0,0,0.3)',
        'glow-blue': '0 0 24px 4px rgba(59,130,246,0.25)',
      },
      backgroundImage: {
        'radial-dark': 'radial-gradient(1200px circle at 10% 10%, rgba(59,130,246,0.15), transparent 40%), radial-gradient(1000px circle at 90% 20%, rgba(20,184,166,0.12), transparent 40%)',
        'mesh-dark': 'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.22, 1, 0.36, 1)'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 300ms var(--ease, cubic-bezier(0.22, 1, 0.36, 1)) forwards',
      },
    },
  },
  plugins: [],
};
