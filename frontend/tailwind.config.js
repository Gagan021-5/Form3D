/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'forma-bg': '#FAFBFC',
        'forma-surface': '#FFFFFF',
        'forma-text': '#17243A',
        'forma-text-secondary': '#687386',
        'forma-accent': '#4568E8',
        'forma-accent-hover': '#3454CC',
        'forma-border': '#E8ECF2',
        'forma-muted': '#F2F5F9',
        'forma-success': '#16835D',
        'forma-error': '#C43D4B',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      boxShadow: {
        'forma-sm': '0 1px 2px 0 rgba(23, 36, 58, 0.04)',
        'forma': '0 1px 3px 0 rgba(23, 36, 58, 0.06), 0 1px 2px -1px rgba(23, 36, 58, 0.06)',
        'forma-md': '0 4px 6px -1px rgba(23, 36, 58, 0.06), 0 2px 4px -2px rgba(23, 36, 58, 0.04)',
        'forma-lg': '0 10px 15px -3px rgba(23, 36, 58, 0.06), 0 4px 6px -4px rgba(23, 36, 58, 0.04)',
      },
      borderRadius: {
        'forma': '0.625rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-left': 'slideLeft 0.25s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
