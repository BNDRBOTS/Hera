import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        x4: "1.35rem",
        x5: "1.7rem"
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.22)",
        lift: "0 20px 60px rgba(0,0,0,0.26)"
      }
    }
  },
  plugins: []
} satisfies Config;
