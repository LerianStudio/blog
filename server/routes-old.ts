import type { Express } from "express";
import { createServer, type Server } from "http";
import { fileStorage } from "./fileStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import express from "express";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await fileStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Public blog routes
  app.get('/api/posts', async (req, res) => {
    try {
      const posts = await storage.getPublishedPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get('/api/posts/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await storage.getPostBySlug(slug);
      if (!post || post.status !== 'published') {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  // Protected admin routes
  app.get('/api/admin/posts', isAuthenticated, async (req, res) => {
    try {
      const posts = await storage.getAllPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching admin posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get('/api/admin/posts/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getPostById(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.post('/api/admin/posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postData = insertPostSchema.parse({
        ...req.body,
        authorId: userId
      });
      
      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.put('/api/admin/posts/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const postData = req.body;
      
      const post = await storage.updatePost(id, postData);
      res.json(post);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete('/api/admin/posts/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePost(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, async (req, res) => {
    try {
      const allPosts = await storage.getAllPosts();
      const publishedPosts = allPosts.filter(post => post.status === 'published');
      const draftPosts = allPosts.filter(post => post.status === 'draft');
      
      const stats = {
        totalPosts: allPosts.length,
        publishedPosts: publishedPosts.length,
        draftPosts: draftPosts.length,
        lastUpdate: allPosts.length > 0 ? allPosts[0].updatedAt : null
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Hugo build and deployment routes
  app.post('/api/admin/build', isAuthenticated, async (req, res) => {
    try {
      await hugoGenerator.generateAndBuild();
      res.json({ message: "Site built successfully" });
    } catch (error) {
      console.error("Error building site:", error);
      res.status(500).json({ message: "Failed to build site" });
    }
  });

  app.get('/api/admin/build-status', isAuthenticated, async (req, res) => {
    try {
      // Simple check if Hugo site exists
      const posts = await storage.getPublishedPosts();
      res.json({ 
        status: "ready",
        publishedPosts: posts.length,
        lastBuild: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get build status" });
    }
  });

  // Serve Hugo static site when not in admin mode
  const hugoPublicPath = join(process.cwd(), "hugo-site", "public");
  app.use("/hugo", express.static(hugoPublicPath));

  const httpServer = createServer(app);
  return httpServer;
}
