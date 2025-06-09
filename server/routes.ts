import type { Express } from "express";
import { createServer, type Server } from "http";
import { fileStorage } from "./fileStorage";
import { setupAuth, isAuthenticated } from "./googleAuth";
import { z } from "zod";
import express from "express";
import { join } from "path";
import { hugoBuilder } from "./hugoBuilder";

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
      res.status(500).json({ message: "Authentication error" });
    }
  });

  // Public blog routes are now served by Hugo static files
  // These API endpoints are deprecated - use Hugo-generated content instead

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
      
      // Auto-rebuild Hugo site when content is published
      if (postData.status === 'published') {
        const result = await hugoBuilder.buildSite();
        if (!result.success) {
          console.error("Hugo rebuild failed:", result.error);
          // Don't fail the post creation if Hugo build fails
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

  app.put('/api/admin/posts/:slug', isAuthenticated, async (req: any, res) => {
    try {
      const postData = updatePostSchema.parse(req.body);
      const userId = req.user.id;
      
      const updatedPost = await fileStorage.updatePost(req.params.slug, {
        ...postData,
        authorId: userId,
      });
      
      // Auto-rebuild Hugo site when content is published
      if (postData.status === 'published') {
        const result = await hugoBuilder.buildSite();
        if (!result.success) {
          console.error("Hugo rebuild failed:", result.error);
          // Don't fail the post update if Hugo build fails
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

  app.delete('/api/admin/posts/:slug', isAuthenticated, async (req, res) => {
    try {
      await fileStorage.deletePost(req.params.slug);
      
      // Rebuild Hugo site after deleting post
      const result = await hugoBuilder.buildSite();
      if (!result.success) {
        console.error("Hugo rebuild failed:", result.error);
        // Don't fail the deletion if Hugo build fails
      } else {
        console.log("Hugo site rebuilt after post deletion");
      }
      
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Unable to delete post" });
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

  // Serve Hugo static files in development
  app.use('/hugo', express.static(join(process.cwd(), 'hugo-site', 'public')));

  const httpServer = createServer(app);
  return httpServer;
}