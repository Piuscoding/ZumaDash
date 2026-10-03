/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0d6b3a',
          dark: '#08502c',
          light: '#e8f5ee',
          50: '#f0fdf4',
          100: '#dcfce7',
          600: '#0d6b3a',
          700: '#08502c',
          800: '#063d22',
        },
        secondary: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
        },
        accent: '#f59e0b',
        lemon: '#c8e63c',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        soft: '0 10px 40px -10px rgb(0 0 0 / 0.12)',
      },
      maxWidth: {
        container: '1200px',
      },
    },
  },
  plugins: [],
};
