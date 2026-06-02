import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#152033",
        steel: "#536174",
        line: "#d8e0ea",
        sand: "#f4efe7",
        accent: "#b55233",
        accentDark: "#7f381f",
        panel: "#fffdf8",
        navy: "#1f365c"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Georgia", "Times New Roman", "serif"]
      },
      boxShadow: {
        card: "0 18px 50px rgba(27, 40, 66, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
