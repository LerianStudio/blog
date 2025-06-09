import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Serve Hugo static files for public routes in development
  const hugoPath = path.resolve(import.meta.dirname, "..", "hugo-site", "public");
  if (fs.existsSync(hugoPath)) {
    app.use(express.static(hugoPath));
  }

  app.use(vite.middlewares);
  
  // Only serve React app for /admin routes in development
  app.use("/admin*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  const hugoPath = path.resolve(import.meta.dirname, "..", "hugo-site", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  if (!fs.existsSync(hugoPath)) {
    throw new Error(
      `Could not find Hugo build directory: ${hugoPath}, make sure to build Hugo first`,
    );
  }

  // Serve React admin app for /admin routes
  app.use("/admin", express.static(distPath));
  
  // Serve Hugo static site for all other routes
  app.use(express.static(hugoPath));

  // Admin fallback to React SPA
  app.use("/admin*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  // Public fallback to Hugo 404
  app.use("*", (_req, res) => {
    const hugo404 = path.resolve(hugoPath, "404.html");
    if (fs.existsSync(hugo404)) {
      res.status(404).sendFile(hugo404);
    } else {
      res.status(404).sendFile(path.resolve(hugoPath, "index.html"));
    }
  });
}
