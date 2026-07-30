/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-strong": "hsl(var(--surface-strong) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        "primary-foreground": "hsl(var(--primary-foreground) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-foreground": "hsl(var(--accent-foreground) / <alpha-value>)",
        gold: "hsl(var(--gold) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)"
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "LXGW WenKai",
          "Noto Serif SC",
          "Songti SC",
          "serif"
        ],
        display: [
          "var(--font-display)",
          "STKaiti",
          "KaiTi",
          "Noto Serif SC",
          "serif"
        ],
        script: [
          "var(--font-script)",
          "STXingkai",
          "Xingkai SC",
          "KaiTi",
          "serif"
        ]
      },
      boxShadow: {
        soft: "0 24px 80px hsl(var(--foreground) / 0.08)",
        line: "0 1px 0 hsl(var(--foreground) / 0.06)"
      },
      keyframes: {
        floatY: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        floatY: "floatY 7s ease-in-out infinite",
        fadeUp: "fadeUp 0.7s ease forwards"
      }
    }
  },
  plugins: []
};
