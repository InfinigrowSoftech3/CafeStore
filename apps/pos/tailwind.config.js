/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pos: {
          bg: '#F8F6F2',
          surface: '#FFFFFF',
          raised: '#F2EDE4',
          border: '#E5DED5',
          text: '#1C1815',
          muted: '#6E645B',
          accent: '#B87314',
          'accent-hover': '#9C600E',
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
        },
        espresso: {
          50: '#f7f1eb',
          100: '#f0e6dc',
          200: '#d8c2a7',
          300: '#ba8f60',
          400: '#9a6f46',
          500: '#7d5436',
          600: '#66412d',
          700: '#4d3123',
          800: '#2d1f1a',
          900: '#1a0f08',
          950: '#14110F',
        },
        brew: {
          50: '#fef3e7',
          100: '#fce7cd',
          200: '#f7cb8d',
          300: '#f0b15a',
          400: '#dd8a2d',
          500: '#c96b18',
          600: '#9b4d13',
          700: '#B87314',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 16px rgba(0,0,0,0.05)',
        elevation1: '0 2px 8px rgba(0,0,0,0.06)',
        elevation2: '0 12px 32px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
