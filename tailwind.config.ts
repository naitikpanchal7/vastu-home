import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // vastu@home design tokens — warm daylight theme
        bg: {
          DEFAULT: "#f7f3ed",
          2: "#ede9e0",
          3: "#e3ddd2",
          4: "#d8d1c4",
        },
        gold: {
          DEFAULT: "#9a7820",
          2: "#735a10",
          3: "#b89040",
        },
        saffron: "#c46c0e",
        vastu: {
          text: "#1c1710",
          "text-2": "#5c4730",
          "text-3": "#9a8060",
          border: "rgba(100,70,20,0.20)",
          "border-2": "rgba(100,70,20,0.12)",
        },
        // Zone colors
        zone: {
          N:   "#4a90c4",
          NNE: "#5ba8d8",
          NE:  "#6ec6e8",
          ENE: "#5aaa6a",
          E:   "#48a858",
          ESE: "#72b872",
          SE:  "#e85050",
          SSE: "#d04848",
          S:   "#c03838",
          SSW: "#c8a028",
          SW:  "#b09020",
          WSW: "#b8b8b8",
          W:   "#a0a8b8",
          WNW: "#8898b0",
          NW:  "#7898b0",
          NNW: "#6890c0",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      animation: {
        "brahma-pulse": "brahma-pulse 1.8s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease forwards",
        "fade-up": "fade-up 0.2s ease forwards",
      },
      keyframes: {
        "brahma-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.6)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
