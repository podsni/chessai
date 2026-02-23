import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    target: "es2015",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          chess: ["chess.js", "react-chessboard"],
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId
                .split("/")
                .pop()
                ?.replace(".tsx", "")
                .replace(".ts", "")
            : "chunk";
          return `js/${facadeModuleId || "chunk"}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || "asset";
          const info = name.split(".");
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `img/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Optimize performance
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ["vite.dwx.my.id"],
    proxy: {
      "/api/stockfish": {
        target: "https://stockfish.online",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/stockfish/, "/api/s/v2.php"),
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
    proxy: {
      "/api/stockfish": {
        target: "https://stockfish.online",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/stockfish/, "/api/s/v2.php"),
      },
    },
  },
  // Performance optimizations
  optimizeDeps: {
    include: ["react", "react-dom", "chess.js", "react-chessboard"],
  },
});
