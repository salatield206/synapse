/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        'synapse-soft-pink': '#FCF0F5',
        'synapse-bg': '#F3EDF7',
        'synapse-primary': '#835592',
        'synapse-secondary': '#F3A6C6',
        'synapse-text': '#2D1B33'
      }
    }
  },
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}']
};
