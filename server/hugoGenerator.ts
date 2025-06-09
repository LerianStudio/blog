import { storage } from "./storage";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";

export class HugoGenerator {
  private hugoPath = join(process.cwd(), "hugo-site");
  private contentPath = join(this.hugoPath, "content", "posts");
  private publicPath = join(this.hugoPath, "public");

  async generateContent() {
    try {
      // Ensure content directory exists
      await mkdir(this.contentPath, { recursive: true });

      // Get all published posts from database
      const posts = await storage.getPublishedPosts();

      // Generate markdown files for each post
      for (const post of posts) {
        const frontMatter = this.generateFrontMatter(post);
        const content = `${frontMatter}\n\n${post.content}`;
        const filename = `${post.slug}.md`;
        const filepath = join(this.contentPath, filename);
        
        await writeFile(filepath, content, "utf-8");
      }

      console.log(`Generated ${posts.length} Hugo content files`);
      return posts.length;
    } catch (error) {
      console.error("Error generating Hugo content:", error);
      throw error;
    }
  }

  private generateFrontMatter(post: any) {
    const frontMatter = {
      title: post.title,
      date: post.publishedAt || post.createdAt,
      draft: false,
      slug: post.slug,
      ...(post.excerpt && { excerpt: post.excerpt }),
      ...(post.category && { category: post.category }),
      ...(post.tags && post.tags.length > 0 && { tags: post.tags }),
      ...(post.featuredImage && { featuredImage: post.featuredImage }),
    };

    const yamlContent = Object.entries(frontMatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}:\n${value.map(v => `  - "${v}"`).join("\n")}`;
        } else if (value instanceof Date) {
          return `${key}: ${value.toISOString()}`;
        } else {
          return `${key}: "${value}"`;
        }
      })
      .join("\n");

    return `---\n${yamlContent}\n---`;
  }

  async buildSite() {
    try {
      console.log("Building Hugo site...");
      const output = execSync("hugo --source hugo-site --destination public", {
        cwd: process.cwd(),
        encoding: "utf-8"
      });
      console.log("Hugo build completed:", output);
      return true;
    } catch (error) {
      console.error("Error building Hugo site:", error);
      throw error;
    }
  }

  async generateAndBuild() {
    await this.generateContent();
    await this.buildSite();
    return true;
  }
}

export const hugoGenerator = new HugoGenerator();