/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {
  keyframes: {
    fall: {
      '0%':   { transform: 'translateY(-20%)', opacity: '0' },
      '10%':  { opacity: '1' },
      '100%': { transform: 'translateY(110%)', opacity: '1' },
    },
  },
  animation: {
    fall: 'fall 6s linear infinite',
  },
} },
  plugins: [],
};
