/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Base / Body font (IBM Plex Sans)
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        plex: ['"IBM Plex Sans"', 'sans-serif'],

        // Primary Page & Dashboard Headings, Metric Values (Space Grotesk)
        heading: ['"Space Grotesk"', 'sans-serif'],
        space: ['"Space Grotesk"', 'sans-serif'],

        // Brand Text & Hero Spotlight Titles (Sora)
        brand: ['"Sora"', 'sans-serif'],
        sora: ['"Sora"', 'sans-serif'],

        // Navigation, Buttons, Tabs, Badges & Interactive Controls (Outfit)
        ui: ['"Outfit"', 'sans-serif'],
        outfit: ['"Outfit"', 'sans-serif'],

        // Cybersecurity Badges, Risk Indicators, Status Tags & Section Labels (Rajdhani)
        cyber: ['"Rajdhani"', 'sans-serif'],
        rajdhani: ['"Rajdhani"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
