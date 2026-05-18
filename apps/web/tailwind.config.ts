import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f8fa',
          100: '#eceff4',
          200: '#d8dde6',
          300: '#b6bdcc',
          400: '#7e879a',
          500: '#566073',
          600: '#3a4257',
          700: '#262d3f',
          800: '#171b2a',
          900: '#0c0f1a',
        },
        accent: {
          400: '#7aa2ff',
          500: '#5b8bff',
          600: '#3f6fe0',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
