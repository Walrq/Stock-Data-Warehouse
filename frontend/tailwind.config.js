/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0F172A',
          card: '#1E293B',
          bor: '#334155',
          text: '#F8FAFC',
          muted: '#94A3B8'
        },
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
        },
        success: '#10B981',
        danger: '#EF4444'
      }
    },
  },
  plugins: [],
}
