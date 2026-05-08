import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1B3A5C",
          dark: "#163252",
          light: "#EEF2FF",
        },
        bg: {
          primary: "#ffffff",
          secondary: "#f9fafb",
          tertiary: "#f3f4f6",
          info: "#eff6ff",
          success: "#f0fdf4",
          warning: "#fffbeb",
          danger: "#fef2f2",
        },
        text: {
          primary: "#111827",
          secondary: "#6b7280",
          tertiary: "#9ca3af",
          success: "#15803d",
          warning: "#b45309",
          danger: "#b91c1c",
          info: "#1d4ed8",
        },
        border: {
          tertiary: "rgba(0,0,0,0.08)",
          secondary: "rgba(0,0,0,0.15)",
          primary: "rgba(0,0,0,0.25)",
        },
      },
      borderRadius: {
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
