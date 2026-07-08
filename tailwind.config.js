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
        border: "rgba(255, 255, 255, 0.08)",
        background: "var(--bg-color)",
        card: "var(--card-bg)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        accent: {
          DEFAULT: "var(--accent-color)",
          hover: "var(--accent-hover)",
        }
      }
    },
  },
  plugins: [],
}
