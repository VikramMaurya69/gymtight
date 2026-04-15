/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(203.8863 88.2845% 53.1373%)',
          dark: 'hsl(202.8169 89.1213% 45%)',
          light: 'hsl(211.5789 51.3514% 92.7451%)',
        },
        secondary: 'hsl(210 25% 7.8431%)',
        accent: {
          DEFAULT: 'hsl(211.5789 51.3514% 92.7451%)',
          hover: 'hsl(203.8863 88.2845% 53.1373%)',
        },
        warning: 'hsl(42.0290 92.8251% 56.2745%)',
        danger: 'hsl(356.3033 90.5579% 54.3137%)',
        success: 'hsl(147.1429 78.5047% 41.9608%)',
        background: 'hsl(0 0% 100%)',
        surface: 'hsl(180 6.6667% 97.0588%)',
        border: 'hsl(201.4286 30.4348% 90.9804%)',
        muted: 'hsl(240 1.9608% 90%)',
      },
      fontFamily: {
        sans: ['Open Sans', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'sidebar': '280px',
        'sidebar-collapsed': '70px',
        'header': '70px',
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
      },
      borderRadius: {
        'sm': 'calc(1.3rem - 4px)',
        'md': 'calc(1.3rem - 2px)',
        'lg': '1.3rem',
        'xl': 'calc(1.3rem + 4px)',
        '2xl': 'calc(1.3rem + 8px)',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
