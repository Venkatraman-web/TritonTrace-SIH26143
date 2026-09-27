/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        // "Oceanic Tech" — a luminous cyan/teal accent ramp (unchanged 500/600
        // anchors so existing brand-500/600 usage across the app is untouched)
        // extended with lighter/darker steps for depth, hover, and glow states.
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2", // Primary Cyan
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
        },
        // Deep navy/midnight ramp for dark chrome, hero sections, and heavy
        // accents — pairs with the brand cyan ramp above for the "ops center"
        // look, distinct from Tailwind's cooler default slate.
        navy: {
          700: "#1E293B",
          800: "#111C33",
          900: "#0B1120",
          950: "#020617",
        },
      },
    },
  },
  plugins: [],
};
