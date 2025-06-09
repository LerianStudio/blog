import { promises as fs } from "fs";
import { join } from "path";
import matter from "gray-matter";
import { type User, type UpsertUser } from "@shared/schema";

export interface BlogPost {
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags: string[];
  status: "draft" | "published";
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
}

export interface CreatePostData {
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags: string[];
  status: "draft" | "published";
  authorId: string;
}

export interface IFileStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Post operations
  getAllPosts(): Promise<BlogPost[]>;
  getPublishedPosts(): Promise<BlogPost[]>;
  getPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createPost(post: CreatePostData): Promise<BlogPost>;
  updatePost(slug: string, post: Partial<CreatePostData>): Promise<BlogPost>;
  deletePost(slug: string): Promise<void>;
  searchPosts(query: string): Promise<BlogPost[]>;
}

export class FileStorage implements IFileStorage {
  private contentPath = join(process.cwd(), "hugo-site", "content", "posts");
  private usersPath = join(process.cwd(), "data", "users.json");

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.contentPath, { recursive: true });
      await fs.mkdir(join(process.cwd(), "data"), { recursive: true });
    } catch (error) {
      console.error("Error creating directories:", error);
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private async loadUsers(): Promise<User[]> {
    try {
      const data = await fs.readFile(this.usersPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async saveUsers(users: User[]): Promise<void> {
    await fs.writeFile(this.usersPath, JSON.stringify(users, null, 2));
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const users = await this.loadUsers();
    return users.find(user => user.id === id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const users = await this.loadUsers();
    const existingIndex = users.findIndex(user => user.id === userData.id);
    
    const user: User = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
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
  async getAllPosts(): Promise<BlogPost[]> {
    try {
      const files = await fs.readdir(this.contentPath);
      const markdownFiles = files.filter(file => file.endsWith('.md'));
      
      const posts = await Promise.all(
        markdownFiles.map(async (file) => {
          const filePath = join(this.contentPath, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data, content } = matter(fileContent);
          
          const slug = file.replace('.md', '');
          const stats = await fs.stat(filePath);
          
          return {
            slug,
            title: data.title || slug,
            content,
            excerpt: data.excerpt,
            category: data.category,
            tags: data.tags || [],
            status: data.draft ? 'draft' : 'published',
            publishedAt: data.date ? new Date(data.date) : undefined,
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
            authorId: data.author_id || 'unknown',
          } as BlogPost;
        })
      );

      return posts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error("Error reading posts:", error);
      return [];
    }
  }

  async getPublishedPosts(): Promise<BlogPost[]> {
    const allPosts = await this.getAllPosts();
    return allPosts.filter(post => post.status === 'published');
  }

  async getPostBySlug(slug: string): Promise<BlogPost | undefined> {
    try {
      const filePath = join(this.contentPath, `${slug}.md`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const { data, content } = matter(fileContent);
      const stats = await fs.stat(filePath);

      return {
        slug,
        title: data.title || slug,
        content,
        excerpt: data.excerpt,
        category: data.category,
        tags: data.tags || [],
        status: data.draft ? 'draft' : 'published',
        publishedAt: data.date ? new Date(data.date) : undefined,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        authorId: data.author_id || 'unknown',
      };
    } catch {
      return undefined;
    }
  }

  async createPost(postData: CreatePostData): Promise<BlogPost> {
    const slug = this.generateSlug(postData.title);
    const filePath = join(this.contentPath, `${slug}.md`);
    
    const frontMatter = {
      title: postData.title,
      date: new Date().toISOString(),
      draft: postData.status === 'draft',
      slug,
      excerpt: postData.excerpt,
      category: postData.category,
      tags: postData.tags,
      author_id: postData.authorId,
    };

    const fileContent = matter.stringify(postData.content, frontMatter);
    await fs.writeFile(filePath, fileContent);

    const post = await this.getPostBySlug(slug);
    if (!post) {
      throw new Error("Failed to create post");
    }
    return post;
  }

  async updatePost(slug: string, postData: Partial<CreatePostData>): Promise<BlogPost> {
    const existingPost = await this.getPostBySlug(slug);
    if (!existingPost) {
      throw new Error("Post not found");
    }

    const filePath = join(this.contentPath, `${slug}.md`);
    
    const frontMatter = {
      title: postData.title || existingPost.title,
      date: existingPost.publishedAt?.toISOString() || new Date().toISOString(),
      draft: postData.status === 'draft',
      slug,
      excerpt: postData.excerpt || existingPost.excerpt,
      category: postData.category || existingPost.category,
      tags: postData.tags || existingPost.tags,
      author_id: postData.authorId || existingPost.authorId,
    };

    const content = postData.content !== undefined ? postData.content : existingPost.content;
    const fileContent = matter.stringify(content, frontMatter);
    await fs.writeFile(filePath, fileContent);

    const updatedPost = await this.getPostBySlug(slug);
    if (!updatedPost) {
      throw new Error("Failed to update post");
    }
    return updatedPost;
  }

  async deletePost(slug: string): Promise<void> {
    const filePath = join(this.contentPath, `${slug}.md`);
    await fs.unlink(filePath);
  }

  async searchPosts(query: string): Promise<BlogPost[]> {
    const allPosts = await this.getAllPosts();
    const lowercaseQuery = query.toLowerCase();
    
    return allPosts.filter(post => 
      post.title.toLowerCase().includes(lowercaseQuery) ||
      post.content.toLowerCase().includes(lowercaseQuery) ||
      post.excerpt?.toLowerCase().includes(lowercaseQuery) ||
      post.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      post.category?.toLowerCase().includes(lowercaseQuery)
    );
  }
}

export const fileStorage = new FileStorage();