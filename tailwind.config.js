/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "sans-serif"],
      },
      colors: {
        border: "var(--border-color)",
        background: "var(--bg-color)",
        card: "var(--card-bg)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "button-secondary": "var(--button-secondary-bg)",
        accent: {
          DEFAULT: "var(--accent-color)",
          hover: "var(--accent-hover)",
        }
      }
    },
  },
  plugins: [],
}
