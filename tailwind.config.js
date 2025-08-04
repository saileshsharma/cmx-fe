/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "chubb-blue": "#005EB8",        // Primary Blue
        "chubb-darkBlue": "#003D73",    // Dark Blue
        "chubb-green": "#78BE20",       // Green
        "chubb-gray": "#E5E5E5",        // Light Gray
        "chubb-darkGray": "#5A5A5A",    // Dark Gray
        "chubb-purple": "#9B26B6",      // Accent Purple
        "chubb-cyan": "#00A9CE",        // Cyan Accent
      },
    },
  },
  plugins: [],
};
