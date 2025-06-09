# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (Express + Vite for admin, Hugo static for public)
- `npm run build` - Build complete project (client + Hugo + server)
- `npm run build:client` - Build React admin interface only
- `npm run build:hugo` - Build Hugo static site only
- `npm run build:server` - Build Express server only
- `npm run start` - Start production server
- `npm run dev:hugo` - Start Hugo development server on port 1313
- `npm run sync:content` - Sync content from CMS to Hugo and rebuild
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes (Drizzle)

## Architecture Overview

This is a **Hugo-first blog platform** with a custom React CMS for content management.

### Route Responsibility
- **Hugo Static Site**: `/`, `/posts/*`, `/categories/*`, `/tags/*` (public content)
- **React CMS**: `/admin/*` only (content management interface)

### 1. Hugo Static Site (Public Content)
- Located in `hugo-site/` directory
- Serves all public blog content as static files
- Blog posts stored as markdown files in `hugo-site/content/posts/`
- Built output in `hugo-site/public/` served directly by Express
- Theme located in `hugo-site/themes/techblog/`

### 2. React CMS (Admin Interface)
- Located in `client/` directory - **ADMIN ONLY**
- Uses Wouter for routing, TanStack Query for state management
- Radix UI components with Tailwind CSS styling
- Handles content creation, editing, and management

### 3. Express API Server
- Located in `server/` directory
- File-based storage system using Hugo markdown format
- Google OAuth authentication for admin access
- **Admin-only API endpoints** (public content served by Hugo)
- Auto-rebuilds Hugo site when content is published

## Key Architectural Decisions

- **Hugo-First**: Public content served as static files for performance
- **React CMS**: Rich content management interface for `/admin/*` routes only
- **File-Based Storage**: Posts stored as Hugo-compatible markdown with frontmatter
- **Auto-Sync**: Hugo site rebuilds automatically when content is published
- **Authentication**: Google OAuth for secure admin access only

## File Organization

- `client/` - React admin interface (serves `/admin/*` only)
- `server/` - Express API server (admin endpoints + static file serving)
- `shared/` - Shared TypeScript types and schemas
- `hugo-site/` - Hugo static site generator (serves `/`, `/posts/*`, etc.)
- `hugo-site/public/` - Generated static site (served by Express in production)
- `data/` - JSON file storage for users
- `attached_assets/` - Media uploads (aliased as `@assets`)

## Important Patterns

### Content Flow
1. Admin creates/edits posts via React CMS (`/admin/*`)
2. Posts saved as Hugo markdown files (`hugo-site/content/posts/`)
3. Hugo site auto-rebuilds when content is published
4. Public visitors access static Hugo site (`/`, `/posts/*`)

### Development Workflow
1. Start dev server: `npm run dev` (Express + Vite for admin)
2. Hugo static files served directly from `hugo-site/public/`
3. Admin interface available at `/admin`
4. Content changes trigger Hugo rebuilds

### Production Deployment
1. Build: `npm run build` (builds React CMS + Hugo site + Express server)
2. Hugo static files served from `hugo-site/public/`
3. React CMS served from `dist/public/` for `/admin/*` routes only

## Environment Setup

Required environment variables:
- `SESSION_SECRET` - Secure session secret (minimum 32 characters)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID  
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `AMPLIFY_APP_URL` - Full Amplify app URL (for production OAuth callback)
- `NODE_ENV` - Environment (development/production)

**No database required** - uses file-based storage and memory session store.