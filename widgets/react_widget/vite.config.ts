import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { writeFileSync } from "fs";
import { resolve } from "path";

function generateWidgetHtml(): Plugin {
  return {
    name: "generate-widget-html",
    writeBundle(options, bundle) {
      const js = Object.keys(bundle).find((f) => f.endsWith(".js"));
      const css = Object.keys(bundle).find((f) => f.endsWith(".css"));
      const lines = [];
      if (css) lines.push(`<link rel="stylesheet" href="./${css}">`);
      if (js) lines.push(`<script type="module" src="./${js}"></script>`);
      writeFileSync(resolve(options.dir!, "index.html"), lines.join("\n") + "\n");
    },
  };
}

export default defineConfig({
  plugins: [react(), generateWidgetHtml()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    lib: {
      entry: "src/main.tsx",
      formats: ["es"],
      fileName: "widget",
    },
    rollupOptions: {
      output: {
        entryFileNames: "widget.[hash].js",
        assetFileNames: "widget.[hash][extname]",
      },
    },
  },
});
