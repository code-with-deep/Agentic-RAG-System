// Source - https://stackoverflow.com/a/77557221
// Posted by Suman Khatri, modified by community. See post 'Timeline' for change history
// Retrieved 2026-05-06, License - CC BY-SA 4.0

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
});

