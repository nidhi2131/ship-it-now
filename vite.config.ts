import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

function tunnelHmrPlugin(): Plugin {
  return {
    name: "tunnel-hmr-support",
    enforce: "post",
    transform(code, id) {
      if (id.includes("vite/dist/client/client.mjs") || id.endsWith("@vite/client")) {
        return code
          .replace(
            "`${__HMR_HOSTNAME__ || importMetaUrl.hostname}:${hmrPort || importMetaUrl.port}${__HMR_BASE__}`",
            "`${__HMR_HOSTNAME__ || importMetaUrl.hostname}${hmrPort ? `:${hmrPort}` : (importMetaUrl.port ? `:${importMetaUrl.port}` : (importMetaUrl.protocol === 'https:' ? ':443' : ''))}${__HMR_BASE__}`",
          )
          .replace(
            "const directSocketHost = __HMR_DIRECT_TARGET__;",
            "const directSocketHost = (importMetaUrl.hostname === 'localhost' || importMetaUrl.hostname === '127.0.0.1') ? __HMR_DIRECT_TARGET__ : null;",
          );
      }
    },
  };
}

export default defineConfig({
  server: {
    host: "0.0.0.0",
    allowedHosts: [
      "overreadily-rhematic-danuta.ngrok-free.dev",
      ".ngrok-free.dev",
      ".ngrok.app",
    ],
  },
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-start", "@tanstack/react-router"],
  },
  optimizeDeps: {
    exclude: [
      "@tanstack/react-start",
      "@tanstack/react-router",
      "@tanstack/react-router-devtools",
      "@tanstack/start-static-server-functions",
    ],
    include: [
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "react-dom/server",
      "@tanstack/react-router > @tanstack/react-store",
    ],
  },
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    tunnelHmrPlugin(),
  ],
});
