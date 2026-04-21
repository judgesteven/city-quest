import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5174,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "assets/icon.png", "assets/adaptive-icon.png"],
      manifest: {
        name: "City Quest",
        short_name: "CityQuest",
        description: "Location-aware city exploration game for tourists.",
        theme_color: "#0D111B",
        background_color: "#0D111B",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/assets/icon.png",
            sizes: "1024x1024",
            type: "image/png",
          },
          {
            src: "/assets/adaptive-icon.png",
            sizes: "1024x1024",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
