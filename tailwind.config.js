/** @type {import('tailwindcss').Config} */
module.exports = {
  // T-73: 'dark:' variants track our own data-theme attribute (the daisyUI
  // switcher convention) instead of the OS prefers-color-scheme media query
  // - a visitor's explicit choice in the SideBar toggle should win over
  // their OS setting, and daisyUI's own theme CSS already keys off
  // data-theme the same way.
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  daisyui: {
    themes: [
      {
        light: {
          ...require('daisyui/src/theming/themes')['light'],
          primary: '#FF7622',
          'primary-content': '#ffffff',
          secondary: '#797c8a',
        },
      },
      {
        // T-73: hand-picked "warm charcoal" palette, not daisyUI's stock
        // "dark" preset - keeps the brand orange (lightened one step for
        // AA contrast on a dark surface) and a warm-toned background
        // instead of a neutral/blue-grey one, so dark mode still reads as
        // this brand rather than a generic dark UI. Non-brand tokens
        // (accent, neutral, state colors) come from daisyUI's own "dark"
        // theme as a base, same as `light` above spreads daisyUI's "light".
        dark: {
          ...require('daisyui/src/theming/themes')['dark'],
          primary: '#FF8A3D',
          'primary-content': '#1A1108',
          secondary: '#A8ABBA',
          'secondary-content': '#14151A',
          accent: '#FFC48A',
          neutral: '#2A2420',
          'base-100': '#241D17',
          'base-200': '#201A15',
          'base-300': '#17130F',
          'base-content': '#EDE6DE',
        },
      },
    ],
  },
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [require('daisyui')],
};
