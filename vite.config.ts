import { defineConfig, LibraryFormats } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const demoConfig = {
  base: "./",
  root: resolve(dirname(fileURLToPath(import.meta.url)), "./"),
  plugins: [react()],
  build: {
    outDir: resolve(dirname(fileURLToPath(import.meta.url)), "docs"),
    emptyOutDir: true,
  },
};

const libConfig = {
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      exclude: ["src/main.tsx", "src/App.tsx", "src/Basic.tsx"],
    }),
  ],
  build: {
    lib: {
      entry: {
        "use-all": resolve(__dirname, "src/index.ts"),
        "use-audio": resolve(__dirname, "src/hooks/audio.ts"),
        "use-media": resolve(__dirname, "src/hooks/media.ts"),
        "use-blob": resolve(__dirname, "src/hooks/blob.ts"),
        "use-interval": resolve(__dirname, "src/hooks/interval.ts"),
        "audio-context": resolve(
          __dirname,
          "src/contextProviders/audioContextProvider.tsx"
        ),
      },
      name: "ReactUseMedia",
      formats: ["es", "cjs"] as LibraryFormats[],
    },
    rollupOptions: {
      external: ["react"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: "React",
        },
      },
    },
  },
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === "demo") {
    return demoConfig;
  } else {
    return libConfig;
  }
});
