import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Shared light theme palette
        base: "#F6F7FB",
        ink: "#182033",
        muted: "#667085",
        accent: "#5D75D8",
        accent2: "#E68A4F",
        card: "rgba(255,255,255,0.74)",
        border: "rgba(96,112,145,0.18)",
        blueblob: "#B7C9FF",
        peachblob: "#FFD7AD",
        mintblob: "#B6F0C9",
        pinkblob: "#FFC2E3",
        lavenderblob: "#DCC8FF",
        purple: {
          DEFAULT: "#8F79D8",
          glow: "#DCC8FF",
        },
        crimson: "#D97A8F",
        amber: "#E68A4F",
        cyan: "#5D75D8",
        green: "#7FBF9A",
        glass: {
          DEFAULT: "rgba(255,255,255,0.74)",
          border: "rgba(96,112,145,0.18)",
          strong: "rgba(255,255,255,0.88)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "aurora":
          "linear-gradient(115deg, #5D75D8 0%, #DCC8FF 25%, #B6F0C9 50%, #FFC2E3 75%, #FFD7AD 100%)",
      },
      boxShadow: {
        glow: "0 20px 70px -34px rgba(93,117,216,0.55)",
        "glow-cyan": "0 20px 70px -34px rgba(183,201,255,0.8)",
        "glow-amber": "0 20px 70px -34px rgba(230,138,79,0.45)",
        "card": "0 18px 55px -34px rgba(65,78,119,0.46)",
      },
      keyframes: {
        "aurora-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-18px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "33%": { transform: "translateY(-30px) translateX(20px)" },
          "66%": { transform: "translateY(20px) translateX(-15px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        spin_slow: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "aurora-shift": "aurora-shift 18s ease infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 16s ease-in-out infinite",
        "pulse-glow": "pulse-glow 5s ease-in-out infinite",
        ticker: "ticker 40s linear infinite",
        shimmer: "shimmer 1.6s infinite",
        "fade-up": "fade-up 0.6s ease-out both",
        "spin-slow": "spin_slow 28s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
