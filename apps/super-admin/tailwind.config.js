/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      spacing: {
        '4.5': '1.125rem',
        '9.5': '2.375rem',
      },
      colors: {
        sa: {
          primary: '#20309A',
          'primary-hover': '#1A2A84',
          'primary-pressed': '#15216B',
          accent: '#BB232B',
          'accent-hover': '#9E1D24',
          background: '#FFFFFF',
          surface: '#FFFFFF',
          border: '#E5E7EF',
          foreground: '#1F2433',
          muted: '#5F6675',
        },
        brand: {
          50: '#EFF1FB',
          100: '#DFE2F5',
          200: '#C3C8EB',
          300: '#9BA3DC',
          400: '#6F7AC9',
          500: '#4A57B5',
          600: '#3341A6',
          700: '#20309A',
          800: '#1A2A84',
          900: '#15216B',
          950: '#10194D',
          DEFAULT: '#20309A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
