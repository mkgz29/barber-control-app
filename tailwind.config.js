/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7f1",
          100: "#ffe8d9",
          200: "#f8cfb8",
          300: "#edae8f",
          400: "#de8a62",
          500: "#c76d45",
          600: "#a95334",
          700: "#85402c",
          800: "#6c3729",
          900: "#592f25"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"]
      },
      boxShadow: {
        warm: "0 18px 45px rgba(28, 25, 23, 0.08)",
        soft: "0 10px 30px rgba(28, 25, 23, 0.06)"
      }
    }
  },
  plugins: [],
};
