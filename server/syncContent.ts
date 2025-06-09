#!/usr/bin/env tsx
import { fileStorage } from "./fileStorage.js";
import { hugoBuilder } from "./hugoBuilder.js";

async function syncContentToHugo() {
  console.log("🔄 Syncing content from CMS to Hugo...");
  
  try {
    // Get all posts from file storage
    const posts = await fileStorage.getAllPosts();
    console.log(`📝 Found ${posts.length} posts to sync`);
    
    // Posts are already stored as Hugo-compatible markdown files
    // in hugo-site/content/posts/ so no additional sync needed
    
    // Build Hugo site
    console.log("🏗️  Building Hugo site...");
    const result = await hugoBuilder.buildSite();
    
    if (!result.success) {
      console.error("❌ Hugo build error:", result.error);
      process.exit(1);
    }
    
    console.log("✅ Hugo site built successfully");
    if (result.output) {
      console.log(result.output);
    }
    
  } catch (error) {
    console.error("❌ Error syncing content:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncContentToHugo();
}