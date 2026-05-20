import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          primary: "#0F766E",
          light: "#14B8A6",
          dark: "#0D5F58",
        },
        amber: {
          accent: "#D97706",
        },
      },
    },
  },
  plugins: [],
};
export default config;
