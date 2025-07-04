/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f3ff',
          100: '#ebe9fe',
          200: '#d9d6fe',
          300: '#beb5fd',
          400: '#9f8afa',
          500: '#8b5cf6',
          600: '#6A3DE8',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3c1361',
        },
        accent: {
          50: '#fff8f5',
          100: '#ffeee6',
          200: '#ffd6c1',
          300: '#ffb894',
          400: '#FF6B35',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        teal: {
          50: '#f0fdfc',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#00A9A5',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #5b21b6 0%, #4c1d95 50%, #3c1361 100%)',
        'card-gradient': 'linear-gradient(135deg, #f3f4f6 0%, #ffffff 100%)',
      },
      lineHeight: {
        'body': '1.5',
        'heading': '1.2',
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'slideIn': 'slideIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'search': '0 10px 25px -3px rgba(0, 0, 0, 0.1)',
      },
      transitionDuration: {
        '300': '300ms',
      },
    },
  },
  plugins: [],
} 