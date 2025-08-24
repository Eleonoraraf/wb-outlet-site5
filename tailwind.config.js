/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        coinFallOnly: {
          "0%":   { transform: "translateY(-20vh)" },
          "100%": { transform: "translateY(120vh)" },
        },
      },
      animation: {
        fall: "coinFallOnly 7s linear infinite",
      },
    },
  },
  safelist: ["animate-fall"], // пусть останется, не мешает
  plugins: [],
};
