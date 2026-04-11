/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8eb",
          100: "#ffefc7",
          200: "#ffe08b",
          300: "#ffd067",
          400: "#f4b647",
          500: "#d99727",
          600: "#b9781e",
          700: "#8c5918",
          800: "#6e4717",
          900: "#593c18"
        }
      },
      fontFamily: {
        sans: ["'Segoe UI'", "system-ui", "sans-serif"]
      },
      boxShadow: {
        warm: "0 20px 50px rgba(15, 23, 42, 0.18)"
      }
    }
  },
  plugins: [],
};
