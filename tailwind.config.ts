import type { Config } from 'tailwindcss'

export default {
  // 'class' strategy: dark mode activates only when a .dark class is present
  // on <html>. No toggle exists yet, so this is structural readiness only —
  // it changes nothing visible until a toggle mechanism is added later.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // StreetRise brand palette
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1a56db', // brand blue
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        success: {
          50:  '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50:  '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50:  '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
        // Availability status colors
        available: '#22c55e',
        limited:   '#f59e0b',
        full:      '#ef4444',
        unknown:   '#94a3b8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '375px', // iPhone SE
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        map: '0 10px 25px -5px rgb(0 0 0 / 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.2s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(1rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
