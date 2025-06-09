import type { Express } from "express";
import { createServer, type Server } from "http";
import { fileStorage } from "./fileStorage";
import { setupAuth, isAuthenticated } from "./googleAuth";
import { z } from "zod";
import express from "express";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Validation schemas for file-based posts
const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
});

const updatePostSchema = createPostSchema.partial();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const posts = await fileStorage.getPublishedPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get('/api/posts/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const posts = await fileStorage.searchPosts(query);
      res.json(posts);
    } catch (error) {
      console.error("Error searching posts:", error);
      res.status(500).json({ message: "Failed to search posts" });
    }
  });

  app.get('/api/posts/:slug', async (req, res) => {
    try {
      const post = await fileStorage.getPostBySlug(req.params.slug);
      if (!post) {
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
      const posts = await fileStorage.getAllPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching admin posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post('/api/admin/posts', isAuthenticated, async (req: any, res) => {
    try {
      const postData = createPostSchema.parse(req.body);
      const userId = req.user.id;
      
      const post = await fileStorage.createPost({
        ...postData,
        authorId: userId,
      });
      
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.put('/api/admin/posts/:slug', isAuthenticated, async (req: any, res) => {
    try {
      const postData = updatePostSchema.parse(req.body);
      const userId = req.user.id;
      
      const updatedPost = await fileStorage.updatePost(req.params.slug, {
        ...postData,
        authorId: userId,
      });
      
      res.json(updatedPost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete('/api/admin/posts/:slug', isAuthenticated, async (req, res) => {
    try {
      await fileStorage.deletePost(req.params.slug);
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, async (req, res) => {
    try {
      const allPosts = await fileStorage.getAllPosts();
      const publishedPosts = allPosts.filter(post => post.status === 'published');
      const draftPosts = allPosts.filter(post => post.status === 'draft');
      
      const stats = {
        totalPosts: allPosts.length,
        publishedPosts: publishedPosts.length,
        draftPosts: draftPosts.length,
        lastUpdate: allPosts.length > 0 ? allPosts[0].updatedAt.toISOString() : null,
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Hugo site build endpoint
  app.post('/api/admin/build', isAuthenticated, async (req, res) => {
    try {
      console.log("Building Hugo site...");
      const { stdout, stderr } = await execAsync('cd hugo-site && hugo');
      
      if (stderr && !stderr.includes('WARN')) {
        console.error("Hugo build error:", stderr);
        return res.status(500).json({ message: "Hugo build failed", error: stderr });
      }
      
      console.log("Hugo build completed:", stdout);
      res.json({ 
        message: "Site built successfully",
        output: stdout,
        warnings: stderr || null
      });
    } catch (error) {
      console.error("Error building Hugo site:", error);
      res.status(500).json({ message: "Failed to build site" });
    }
  });

  // Serve Hugo static files in development
  app.use('/hugo', express.static(join(process.cwd(), 'hugo-site', 'public')));

  const httpServer = createServer(app);
  return httpServer;
}