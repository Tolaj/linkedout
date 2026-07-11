/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          900: "#FFFFFF",
          800: "#FAFAFA",
          700: "#F5F5F5",
          600: "#E5E5E5",
          500: "#D4D4D4",
          400: "#A3A3A3",
          300: "#737373",
          200: "#525252",
          100: "#171717",
        },
        accent: {
          DEFAULT: "#171717",
          light: "#404040",
          dark: "#FFFFFF",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
