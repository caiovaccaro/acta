import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        primary: '#6C7A89', // Slate Gray from Landing
        'primary-blue': '#5E8B9D', // Blue from Detail
        'accent-teal': '#4A908A',
        'background-light': '#F9F9F7',
        'background-lighter': '#F9F6F2',
        'background-dark': '#111621',
        'text-main': '#333333',
        'text-muted': '#666666',
        'card-light': '#FFFFFF',
        'border-light': '#EAE8E1',
        
        // Verdict Colors
        'verdict-yes': '#4A7C59', // Green
        'verdict-no': '#A95C52', // Red
        'verdict-split': '#B0A160', // Yellow/Gold
        'verdict-unclear': '#CA8A04', // Darker Yellow
      },
    },
  },
  plugins: [],
}
export default config
