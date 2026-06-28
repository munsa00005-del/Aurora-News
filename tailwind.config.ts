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
        // Core palette (from design spec)
        ink: "#050505", // Deep Black
        midnight: "#0F172A", // Midnight Blue
        purple: {
          DEFAULT: "#7C3AED", // Electric Purple
          glow: "#A855F7", // Neon Violet
        },
        crimson: "#DC2626", // Deep Crimson
        amber: "#F59E0B", // Golden Amber
        cyan: "#06B6D4", // Neon Cyan
        // Glass surfaces
        glass: {
          DEFAULT: "rgba(255,255,255,0.04)",
          border: "rgba(255,255,255,0.08)",
          strong: "rgba(255,255,255,0.07)",
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
          "linear-gradient(115deg, #7C3AED 0%, #A855F7 25%, #06B6D4 50%, #DC2626 75%, #F59E0B 100%)",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(124,58,237,0.5)",
        "glow-cyan": "0 0 40px -10px rgba(6,182,212,0.5)",
        "glow-amber": "0 0 40px -10px rgba(245,158,11,0.45)",
        "card": "0 8px 40px -12px rgba(0,0,0,0.6)",
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
