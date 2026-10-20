/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pos: {
          bg: '#14110F',
          surface: '#1E1915',
          raised: '#28211B',
          border: '#3A3028',
          text: '#F5EDE0',
          muted: '#A89A88',
          accent: '#D9A441',
          'accent-hover': '#E5B252',
          success: '#4CAF7A',
          warning: '#E8A33D',
          danger: '#E5594F',
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
          700: '#D9A441',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.3)',
        elevation1: '0 4px 12px rgba(0,0,0,0.25)',
        elevation2: '0 12px 32px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
