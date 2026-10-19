/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        brew: {
          50: '#FDF9F2',
          100: '#F6EBD5',
          200: '#EDD7AC',
          300: '#E3C182',
          400: '#D6AB5E',
          500: '#C8963E',
          600: '#A87420',
          700: '#885B17',
          800: '#6B4511',
          900: '#4F320C',
        },
        espresso: {
          50: '#F9F7F5',
          100: '#EFEBE7',
          200: '#E2DBD4',
          300: '#C4B8AD',
          400: '#9B8D80',
          500: '#7A6F64',
          600: '#5C5248',
          700: '#423A33',
          800: '#2C241E',
          900: '#1C1612',
          950: '#17110C',
        },
        cream: '#FAF6EF',
        foam: '#F6EBD5',
        sand: {
          50: '#FAF6EF',
          100: '#F6EBD5',
          200: '#E9E0D2',
          300: '#D8C7B0',
        },
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'sans-serif'],
        display: ['Sora', 'Playfair Display', 'Cormorant Garamond', 'Georgia', 'serif'],
        body: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'xs': '0 1px 2px 0 rgba(15, 23, 42, 0.06)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'steam': 'steam 2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        steam: {
          '0%': { opacity: 0, transform: 'translateY(0) scaleX(1)' },
          '50%': { opacity: 1, transform: 'translateY(-10px) scaleX(1.2)' },
          '100%': { opacity: 0, transform: 'translateY(-20px) scaleX(0.8)' },
        },
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
