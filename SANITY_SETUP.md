# 🚀 Sanity Studio Setup Guide

**Lerian Studio Blog** now uses **Sanity Studio** as the CMS! 🎉

## 🔧 **What's Set Up**

✅ **Sanity Studio** - Modern headless CMS  
✅ **Custom Schema** - Matches Hugo frontmatter structure  
✅ **Content Sync** - Automated Hugo markdown generation  
✅ **Rich Editor** - Code blocks, callouts, images  
✅ **Portuguese Support** - Smart slug generation with accents  

## 🏃‍♂️ **Quick Start**

### 1. **Access Sanity Studio**
```bash
npm run studio
```
**🌐 Open:** http://localhost:3333/

### 2. **Create Your First Post**
1. Click **"Create"** → **"Blog Post"**
2. Fill in title, content, categories, tags
3. Toggle **Draft: false** to publish
4. **Save & Publish**

### 3. **Sync to Hugo**
```bash
npm run sync
```

### 4. **Preview Blog**
```bash
npm run preview  # Syncs + starts Hugo dev server
```

## 📋 **Available Scripts**

| Command                 | Description                     |
| ----------------------- | ------------------------------- |
| `npm run studio`        | Start Sanity Studio (port 3333) |
| `npm run studio:deploy` | Deploy Studio to Sanity hosting |
| `npm run sync`          | Pull content from Sanity → Hugo |
| `npm run preview`       | Sync + start Hugo dev server    |
| `npm run dev`           | Hugo development server only    |
| `npm run build`         | Build production Hugo site      |

## 🎨 **Content Features**

### **Rich Text Editor**
- **Headings** (H1-H4)
- **Bold**, *italic*, `inline code`
- **Lists** (bullet & numbered)
- **Block quotes**
- **Links** with external target options

### **Code Blocks** 💻
- **Syntax highlighting** (Go, TypeScript, Python, etc.)
- **Filename headers**
- **Line highlighting** (coming soon)

### **Callouts** 🚨
- 💡 **Info** - General information
- ⚠️ **Warning** - Important notices  
- ❌ **Error** - Error examples
- ✅ **Success** - Success cases
- 📝 **Note** - Additional notes
- 🚀 **Tip** - Pro tips

### **Images** 🖼️
- **Featured images** with alt text & captions
- **Inline images** within content
- **Automatic optimization** (via Sanity CDN)

## 🔄 **Content Workflow**

### **Development Workflow**
1. **Write** in Sanity Studio (localhost:3333)
2. **Sync** content (`npm run sync`)
3. **Preview** locally (`npm run dev`)
4. **Deploy** Hugo site

### **Production Workflow**
1. **Create/Edit** posts in Sanity Studio
2. **Auto-sync** via webhook (coming soon)
3. **Auto-deploy** via Amplify

## 🏗️ **Schema Structure**

### **Post Fields**
```typescript
{
  title: string              // Post title
  slug: slug                 // Auto-generated from title
  date: datetime             // Publication date
  draft: boolean             // Draft/Published status
  featured_image: image      // Hero image with alt/caption
  categories: string[]       // Predefined categories
  tags: string[]            // Custom tags
  series: string            // Series name (optional)
  body: blockContent        // Rich content
}
```

### **Categories**
- Development
- API Design  
- Architecture
- Financial Technology
- Product
- Data Security

## 🌍 **Deployment**

### **Sanity Studio Hosting**
```bash
npm run studio:deploy
```
**Result:** Your studio will be available at:  
`https://[project-id].sanity.studio/`

### **Hugo Site**
Content syncs automatically to `content/posts/*.md` files that Hugo processes normally.

## 🔑 **Environment Variables**

Add to your `.env` file:
```bash
# Sanity Configuration
SANITY_PROJECT_ID=ouf5coh1
SANITY_DATASET=production
SANITY_API_VERSION=2023-05-03
```

## 🐛 **Troubleshooting**

### **Sync Issues**
```bash
# Check Sanity connection
cd sanity && npx sanity exec --with-user-token 'console.log("Connected!")'

# Manual sync
npm run sync
```

### **Studio Access**
- **URL:** http://localhost:3333/
- **Login:** GitHub OAuth (same as repository access)
- **Permissions:** Repository collaborators auto-have access

### **Content Not Appearing**
1. Check `draft: false` in Sanity
2. Run `npm run sync` 
3. Verify files in `content/posts/`
4. Restart Hugo server (`npm run dev`)

## 🔗 **Useful Links**

- **Studio:** http://localhost:3333/
- **Sanity Docs:** https://www.sanity.io/docs
- **GROQ Queries:** https://www.sanity.io/docs/groq
- **Hugo Documentation:** https://gohugo.io/documentation/

---

**🎉 Sanity Studio is SO much better than Decap CMS!**  
*No more blank admin pages, just pure authoring bliss!* ✨ 