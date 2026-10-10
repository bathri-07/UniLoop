/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#0B0F12', // Ultra-deep background
        surface: {
          DEFAULT: '#131920', // Standard card & container background
          elevated: '#1A232E', // Modals, dropdowns, popovers
          input: '#10161D' // Input fields
        },
        border: {
          subtle: '#1F2937', // Inactive borders and dividers
          highlight: '#374151' // Hover and focused borders
        },
        brand: {
          emerald: '#10B981', // Primary emerald accent
          hover: '#059669', // Hover state
          dark: '#064E3B' // Badges & pill background tint
        }
      },
      textColor: {
        primary: '#F9FAFB', // Headings & high-contrast titles
        secondary: '#E2E8F0', // Body text & descriptions
        muted: '#94A3B8', // Lighter muted gray (slate-400) for readability
        dimmed: '#64748B' // Strikethrough MRP and timestamps (slate-500)
      }
    }
  },
  plugins: []
};
