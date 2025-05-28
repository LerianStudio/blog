# Lerian Studio Blog

A technical blog focused on financial technology, software architecture, and engineering best practices. Built with Hugo and powered by Sanity Studio CMS.

## 🚀 Quick Start

### Option 1: Sanity Studio CMS (Recommended)
1. **Start Studio:** `npm run studio` → http://localhost:3333/
2. **Create posts** with rich editor, code blocks, and callouts
3. **Sync content:** `npm run sync` 
4. **Preview:** `npm run preview` → http://localhost:1313/
5. **Deploy:** `git push origin main` (auto-deploys via Amplify)

### Option 2: Direct Markdown (Advanced)
1. Create files in `content/posts/`
2. Write in Hugo markdown format
3. Commit to trigger deployment

### Option 3: Local Development

#### Prerequisites
- **Node.js** 18+ (for Sanity sync)
- **Hugo** v0.147.5+ (auto-installed in builds)  
- **Git**

#### Setup
```bash
# Clone the repository
git clone https://github.com/LerianStudio/blog.git
cd blog

# Install dependencies
npm install

# Start Sanity Studio (port 3333)
npm run studio

# In another terminal: sync content and start Hugo
npm run preview
```

## 📝 Content Management

### 🎨 Sanity Studio Features
- **Rich text editor** with visual formatting
- **Code blocks** with syntax highlighting (Go, TypeScript, Python, etc.)
- **Callouts** (💡 info, ⚠️ warning, ❌ error, ✅ success, 📝 note, 🚀 tip)
- **Image management** with alt text and captions
- **Categories & tags** with predefined options
- **Draft/publish** workflow
- **Portuguese support** with smart slug generation

### 📋 Content Workflow
1. **Write** in Sanity Studio (localhost:3333)
2. **Sync** content: `npm run sync`
3. **Preview** locally: `npm run dev`
4. **Deploy** via git push

### 🏗️ Content Structure
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

## 🛠️ Technical Stack

- **Static Site Generator**: Hugo v0.147.5+
- **CMS**: Sanity Studio v3.68.0
- **Content Sync**: Custom Node.js script
- **Hosting**: AWS Amplify
- **CDN**: AWS CloudFront  
- **CI/CD**: Amplify auto-build

## 📁 Project Structure

```
blog/
├── content/posts/       # Hugo markdown files (auto-generated)
├── sanity/             # Sanity Studio setup
│   ├── schemaTypes/    # Content schemas
│   └── sanity.config.ts
├── scripts/            # Content sync scripts
│   └── sync-from-sanity.js
├── layouts/            # Hugo templates
├── static/             # Static assets
├── themes/             # Hugo theme
├── amplify.yml         # AWS Amplify build config
└── package.json        # npm scripts
```

## 🚀 Deployment

### AWS Amplify (Production)
**Fully automated deployment** - see [AMPLIFY_DEPLOYMENT.md](AMPLIFY_DEPLOYMENT.md)

1. **Connect** GitHub repo to Amplify
2. **Configure** build settings (auto-detected from `amplify.yml`)
3. **Set environment variables** for Sanity
4. **Deploy** - triggered on every git push

### Build Process
```bash
# 1. Install dependencies
npm ci

# 2. Sync content from Sanity  
npm run sync

# 3. Install Hugo
wget https://github.com/gohugoio/hugo/releases/...

# 4. Build site
hugo --minify

# 5. Deploy to CDN
```

## ⚙️ Configuration

### Environment Variables
```bash
SANITY_PROJECT_ID=ouf5coh1
SANITY_DATASET=production  
SANITY_API_VERSION=2023-05-03
```

### Available Scripts
| Command                 | Description                     |
| ----------------------- | ------------------------------- |
| `npm run studio`        | Start Sanity Studio (port 3333) |
| `npm run sync`          | Sync content from Sanity → Hugo |
| `npm run preview`       | Sync + start Hugo dev server    |
| `npm run dev`           | Hugo development server only    |
| `npm run build`         | Build production Hugo site      |
| `npm run studio:deploy` | Deploy Studio to Sanity hosting |

## 🎨 Content Features

### Rich Text Editor
- **Headings** (H1-H4)
- **Bold**, *italic*, `inline code`
- **Lists** (bullet & numbered)
- **Block quotes**
- **Links** with external target options

### Code Blocks 💻
```go
// example.go
func main() {
    fmt.Println("Hello, World!")
}
```

### Callouts 🚨
> 💡 **Info**  
> Use callouts to highlight important information

> ⚠️ **Warning**  
> Critical warnings for readers

### Categories
- Development
- API Design  
- Architecture
- Financial Technology
- Product
- Data Security

## 🔐 Access Control

### Sanity Studio
- **Login**: GitHub OAuth (same as repository access)
- **Permissions**: Repository collaborators auto-have access
- **Security**: All changes tracked and versioned

### Team Access
1. Add collaborators to GitHub repository
2. They automatically get Sanity Studio access
3. All content changes tracked in Sanity + Git

## 🐛 Troubleshooting

### Content Sync Issues
```bash
# Test Sanity connection
npm run sync

# Check environment variables
cd sanity && npx sanity exec --with-user-token 'console.log("Connected!")'
```

### Build Issues
- **Amplify build fails**: Check build logs in AWS console
- **Content not appearing**: Verify `draft: false` in Sanity
- **Sync fails**: Check Sanity environment variables

### Local Development
```bash
# Reset and start fresh
npm install
npm run studio  # Terminal 1
npm run sync    # Terminal 2  
npm run dev     # Terminal 2
```

## 📚 Resources

- **Sanity Setup**: [SANITY_SETUP.md](SANITY_SETUP.md)
- **Amplify Deployment**: [AMPLIFY_DEPLOYMENT.md](AMPLIFY_DEPLOYMENT.md)
- **Sanity Docs**: https://www.sanity.io/docs
- **Hugo Docs**: https://gohugo.io/documentation/

---

**🎉 Powered by Sanity Studio - because content management should be delightful!** ✨