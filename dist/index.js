// server/index.ts
import express3 from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

// server/routes.ts
import { createServer } from "http";

// server/fileStorage.ts
import { promises as fs } from "fs";
import { join } from "path";
import matter from "gray-matter";
var FileStorage = class {
  contentPath = join(process.cwd(), "hugo-site", "content", "posts");
  usersPath = join(process.cwd(), "data", "users.json");
  constructor() {
    this.ensureDirectories();
  }
  async ensureDirectories() {
    try {
      await fs.mkdir(this.contentPath, { recursive: true });
      await fs.mkdir(join(process.cwd(), "data"), { recursive: true });
    } catch (error) {
      console.error("Error creating directories:", error);
    }
  }
  generateSlug(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  async loadUsers() {
    try {
      const data = await fs.readFile(this.usersPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  async saveUsers(users) {
    await fs.writeFile(this.usersPath, JSON.stringify(users, null, 2));
  }
  // User operations
  async getUser(id) {
    const users = await this.loadUsers();
    return users.find((user) => user.id === id);
  }
  async upsertUser(userData) {
    const users = await this.loadUsers();
    const existingIndex = users.findIndex((user2) => user2.id === userData.id);
    const user = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (existingIndex >= 0) {
      user.createdAt = users[existingIndex].createdAt;
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    await this.saveUsers(users);
    return user;
  }
  // Post operations
  async getAllPosts() {
    try {
      const files = await fs.readdir(this.contentPath);
      const markdownFiles = files.filter((file) => file.endsWith(".md"));
      const posts = await Promise.all(
        markdownFiles.map(async (file) => {
          const filePath = join(this.contentPath, file);
          const fileContent = await fs.readFile(filePath, "utf-8");
          const { data, content } = matter(fileContent);
          const slug = file.replace(".md", "");
          const stats = await fs.stat(filePath);
          return {
            slug,
            title: data.title || slug,
            content,
            excerpt: data.excerpt,
            category: data.category,
            tags: data.tags || [],
            status: data.draft ? "draft" : "published",
            publishedAt: data.date ? new Date(data.date) : void 0,
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
            authorId: data.author_id || "unknown"
          };
        })
      );
      return posts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error("Error reading posts:", error);
      return [];
    }
  }
  async getPublishedPosts() {
    const allPosts = await this.getAllPosts();
    return allPosts.filter((post) => post.status === "published");
  }
  async getPostBySlug(slug) {
    try {
      const filePath = join(this.contentPath, `${slug}.md`);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const { data, content } = matter(fileContent);
      const stats = await fs.stat(filePath);
      return {
        slug,
        title: data.title || slug,
        content,
        excerpt: data.excerpt,
        category: data.category,
        tags: data.tags || [],
        status: data.draft ? "draft" : "published",
        publishedAt: data.date ? new Date(data.date) : void 0,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        authorId: data.author_id || "unknown"
      };
    } catch {
      return void 0;
    }
  }
  async createPost(postData) {
    const slug = this.generateSlug(postData.title);
    const filePath = join(this.contentPath, `${slug}.md`);
    const frontMatter = {
      title: postData.title,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      draft: postData.status === "draft",
      slug,
      excerpt: postData.excerpt,
      category: postData.category,
      tags: postData.tags,
      author_id: postData.authorId
    };
    const fileContent = matter.stringify(postData.content, frontMatter);
    await fs.writeFile(filePath, fileContent);
    const post = await this.getPostBySlug(slug);
    if (!post) {
      throw new Error("Failed to create post");
    }
    return post;
  }
  async updatePost(slug, postData) {
    const existingPost = await this.getPostBySlug(slug);
    if (!existingPost) {
      throw new Error("Post not found");
    }
    const filePath = join(this.contentPath, `${slug}.md`);
    const frontMatter = {
      title: postData.title || existingPost.title,
      date: existingPost.publishedAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
      draft: postData.status === "draft",
      slug,
      excerpt: postData.excerpt || existingPost.excerpt,
      category: postData.category || existingPost.category,
      tags: postData.tags || existingPost.tags,
      author_id: postData.authorId || existingPost.authorId
    };
    const content = postData.content !== void 0 ? postData.content : existingPost.content;
    const fileContent = matter.stringify(content, frontMatter);
    await fs.writeFile(filePath, fileContent);
    const updatedPost = await this.getPostBySlug(slug);
    if (!updatedPost) {
      throw new Error("Failed to update post");
    }
    return updatedPost;
  }
  async deletePost(slug) {
    const filePath = join(this.contentPath, `${slug}.md`);
    await fs.unlink(filePath);
  }
  async searchPosts(query) {
    const allPosts = await this.getAllPosts();
    const lowercaseQuery = query.toLowerCase();
    return allPosts.filter(
      (post) => post.title.toLowerCase().includes(lowercaseQuery) || post.content.toLowerCase().includes(lowercaseQuery) || post.excerpt?.toLowerCase().includes(lowercaseQuery) || post.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)) || post.category?.toLowerCase().includes(lowercaseQuery)
    );
  }
};
var fileStorage = new FileStorage();

// server/googleAuth.ts
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import MemoryStore from "memorystore";
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are required");
}
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required for secure sessions");
}
function getSession() {
  const sessionTtl = 24 * 60 * 60 * 1e3;
  const MemoryStoreSession = MemoryStore(session);
  const sessionStore = new MemoryStoreSession({
    checkPeriod: sessionTtl
    // Prune expired entries every 24h
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // HTTPS in production
      sameSite: "lax",
      maxAge: sessionTtl
    }
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(passport.initialize());
  app2.use(passport.session());
  const strategy = new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.AMPLIFY_APP_URL || "http://localhost:5000"}/api/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google OAuth authentication successful for user ID:", profile.id);
        const user = await fileStorage.upsertUser({
          id: profile.id,
          email: profile.emails?.[0]?.value || null,
          firstName: profile.name?.givenName || null,
          lastName: profile.name?.familyName || null,
          profileImageUrl: profile.photos?.[0]?.value || null
        });
        console.log("User profile updated successfully");
        return done(null, user);
      } catch (error) {
        console.error("OAuth strategy error:", error);
        return done(error, false);
      }
    }
  );
  passport.use(strategy);
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await fileStorage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error("User deserialization error:", error);
      done(null, false);
    }
  });
  app2.get("/api/login", (req, res, next) => {
    console.log("=== STARTING GOOGLE OAUTH ===");
    console.log("Redirect URI will be:", `${process.env.AMPLIFY_APP_URL || "http://localhost:5000"}/api/auth/google/callback`);
    passport.authenticate("google", {
      scope: ["openid", "profile", "email"],
      accessType: "offline",
      prompt: "consent"
    })(req, res, next);
  });
  app2.get("/api/auth/google/callback", (req, res, next) => {
    console.log("=== GOOGLE OAUTH CALLBACK ===");
    console.log("Query params:", req.query);
    console.log("Headers:", req.headers);
    if (req.query.error) {
      console.log("OAuth error from Google:", req.query.error);
      return res.redirect(`/admin/login?error=${req.query.error}`);
    }
    if (!req.query.code) {
      console.log("No authorization code received");
      return res.redirect("/admin/login?error=no_code");
    }
    passport.authenticate("google", (err, user, info) => {
      console.log("Passport authenticate result:", {
        err: err?.message || err,
        user: user ? `User ID: ${user.id}` : null,
        info
      });
      if (err) {
        console.error("Authentication error:", err);
        return res.redirect("/admin/login?error=auth_failed");
      }
      if (!user) {
        console.log("No user returned from authentication");
        return res.redirect("/admin/login?error=no_user");
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.redirect("/admin/login?error=login_failed");
        }
        console.log("User authentication successful");
        res.redirect("/admin");
      });
    })(req, res, next);
  });
  app2.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });
}
var isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// server/routes.ts
import { z } from "zod";
import express from "express";
import { join as join3 } from "path";

// server/hugoBuilder.ts
import { exec } from "child_process";
import { promisify } from "util";
import { resolve } from "path";
import { existsSync } from "fs";
var execAsync = promisify(exec);
var HugoBuilder = class {
  hugoSitePath;
  maxConcurrentBuilds = 1;
  buildInProgress = false;
  constructor() {
    this.hugoSitePath = resolve(process.cwd(), "hugo-site");
    if (!existsSync(this.hugoSitePath)) {
      throw new Error(`Hugo site directory not found: ${this.hugoSitePath}`);
    }
  }
  async buildSite() {
    if (this.buildInProgress) {
      return { success: false, error: "Build already in progress" };
    }
    this.buildInProgress = true;
    try {
      console.log("Building Hugo site...");
      const { stdout, stderr } = await execAsync("hugo", {
        cwd: this.hugoSitePath,
        timeout: 3e4,
        // 30 second timeout
        maxBuffer: 1024 * 1024
        // 1MB buffer
      });
      if (stderr && !stderr.includes("WARN")) {
        console.error("Hugo build stderr:", stderr);
        return { success: false, error: "Hugo build failed", output: stderr };
      }
      console.log("Hugo site built successfully");
      return { success: true, output: stdout };
    } catch (error) {
      console.error("Hugo build error:", error.message);
      return {
        success: false,
        error: error.code === "ENOENT" ? "Hugo not found" : "Build failed",
        output: error.message
      };
    } finally {
      this.buildInProgress = false;
    }
  }
};
var hugoBuilder = new HugoBuilder();

// server/routes.ts
var createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "published"]).default("draft")
});
var updatePostSchema = createPostSchema.partial();
async function registerRoutes(app2) {
  await setupAuth(app2);
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await fileStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Authentication error" });
    }
  });
  app2.get("/api/admin/posts", isAuthenticated, async (req, res) => {
    try {
      const posts = await fileStorage.getAllPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching admin posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });
  app2.post("/api/admin/posts", isAuthenticated, async (req, res) => {
    try {
      const postData = createPostSchema.parse(req.body);
      const userId = req.user.id;
      const post = await fileStorage.createPost({
        ...postData,
        authorId: userId
      });
      if (postData.status === "published") {
        const result = await hugoBuilder.buildSite();
        if (!result.success) {
          console.error("Hugo rebuild failed:", result.error);
        } else {
          console.log("Hugo site rebuilt after post creation");
        }
      }
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Unable to create post" });
    }
  });
  app2.put("/api/admin/posts/:slug", isAuthenticated, async (req, res) => {
    try {
      const postData = updatePostSchema.parse(req.body);
      const userId = req.user.id;
      const updatedPost = await fileStorage.updatePost(req.params.slug, {
        ...postData,
        authorId: userId
      });
      if (postData.status === "published") {
        const result = await hugoBuilder.buildSite();
        if (!result.success) {
          console.error("Hugo rebuild failed:", result.error);
        } else {
          console.log("Hugo site rebuilt after post update");
        }
      }
      res.json(updatedPost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Unable to update post" });
    }
  });
  app2.delete("/api/admin/posts/:slug", isAuthenticated, async (req, res) => {
    try {
      await fileStorage.deletePost(req.params.slug);
      const result = await hugoBuilder.buildSite();
      if (!result.success) {
        console.error("Hugo rebuild failed:", result.error);
      } else {
        console.log("Hugo site rebuilt after post deletion");
      }
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Unable to delete post" });
    }
  });
  app2.get("/api/admin/stats", isAuthenticated, async (req, res) => {
    try {
      const allPosts = await fileStorage.getAllPosts();
      const publishedPosts = allPosts.filter((post) => post.status === "published");
      const draftPosts = allPosts.filter((post) => post.status === "draft");
      const stats = {
        totalPosts: allPosts.length,
        publishedPosts: publishedPosts.length,
        draftPosts: draftPosts.length,
        lastUpdate: allPosts.length > 0 ? allPosts[0].updatedAt.toISOString() : null
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  app2.post("/api/admin/build", isAuthenticated, async (req, res) => {
    try {
      const result = await hugoBuilder.buildSite();
      if (!result.success) {
        return res.status(500).json({
          message: "Hugo build failed",
          error: result.error
        });
      }
      res.json({
        message: "Site built successfully",
        output: result.output
      });
    } catch (error) {
      console.error("Error building Hugo site:", error);
      res.status(500).json({ message: "Failed to build site" });
    }
  });
  app2.use("/hugo", express.static(join3(process.cwd(), "hugo-site", "public")));
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var vite_config_default = defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  const hugoPath = path2.resolve(import.meta.dirname, "..", "hugo-site", "public");
  if (fs2.existsSync(hugoPath)) {
    app2.use(express2.static(hugoPath));
  }
  app2.use(vite.middlewares);
  app2.use("/admin*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  const hugoPath = path2.resolve(import.meta.dirname, "..", "hugo-site", "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  if (!fs2.existsSync(hugoPath)) {
    throw new Error(
      `Could not find Hugo build directory: ${hugoPath}, make sure to build Hugo first`
    );
  }
  app2.use("/admin", express2.static(distPath));
  app2.use(express2.static(hugoPath));
  app2.use("/admin*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
  app2.use("*", (_req, res) => {
    const hugo404 = path2.resolve(hugoPath, "404.html");
    if (fs2.existsSync(hugo404)) {
      res.status(404).sendFile(hugo404);
    } else {
      res.status(404).sendFile(path2.resolve(hugoPath, "index.html"));
    }
  });
}

// server/index.ts
var app = express3();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
  // Allow embedding for admin interface
}));
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? [process.env.AMPLIFY_APP_URL] : ["http://localhost:5000", "http://localhost:1313"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
var adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 100,
  // Limit each IP to 100 requests per windowMs
  message: { message: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api/admin", adminLimiter);
app.use(express3.json({ limit: "1mb" }));
app.use(express3.urlencoded({ extended: false, limit: "1mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    let message = "Internal Server Error";
    if (status < 500) {
      message = err.message || "Bad Request";
    } else if (process.env.NODE_ENV === "development") {
      message = err.message || "Internal Server Error";
    }
    console.error("Error:", {
      status,
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : void 0,
      url: _req.url,
      method: _req.method
    });
    res.status(status).json({ message });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
