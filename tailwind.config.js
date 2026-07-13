/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chrome: {
          bg: "#dee1e6",
          toolbar: "#f1f3f4",
          tab: "#dadce0",
          tabActive: "#ffffff",
          border: "#bdc1c6",
          text: "#5f6368",
          textDark: "#202124",
          blue: "#1a73e8",
          hover: "#e8eaed",
        },
      },
    },
  },
  plugins: [],
};
