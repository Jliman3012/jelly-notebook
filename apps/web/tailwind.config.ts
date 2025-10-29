import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff2d55',
          foreground: '#ffffff'
        },
        secondary: {
          DEFAULT: '#1a1b4b',
          foreground: '#f4f4f5'
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'sans-serif']
      }
    }
  },
  plugins: [animate]
};

export default config;
