import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
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
      formats: ["es", "cjs"],
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
});
