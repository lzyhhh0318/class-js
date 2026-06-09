/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        theme: 'var(--color-theme)',
        background: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        surfaceHover: 'var(--color-surface-hover)',
        main: 'var(--color-text)',
        inverse: 'var(--color-inverse)',
      }
    },
  },
  plugins: [],
};
