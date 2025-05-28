# Decap CMS OAuth Provider for Vercel

A simple OAuth provider for Decap CMS hosted on Vercel.

## Setup Instructions

### 1. Deploy to Vercel

```bash
npm install -g vercel
cd decap-oauth-vercel
vercel
```

### 2. Set Environment Variables

After deployment, set your GitHub OAuth app credentials:

```bash
vercel env add OAUTH_CLIENT_ID
vercel env add OAUTH_CLIENT_SECRET
```

### 3. Update GitHub OAuth App

Set your GitHub OAuth app's **Authorization callback URL** to:
```
https://your-vercel-app.vercel.app/api/callback
```

### 4. Update Decap CMS Config

In your `static/admin/config.yml`:

```yaml
backend:
  name: github
  repo: your-username/your-repo
  branch: main
  base_url: https://your-vercel-app.vercel.app
  auth_endpoint: api/auth
```

## Environment Variables

- `OAUTH_CLIENT_ID` - Your GitHub OAuth app client ID
- `OAUTH_CLIENT_SECRET` - Your GitHub OAuth app client secret

## Endpoints

- `/api/auth` - Initiates OAuth flow
- `/api/callback` - Handles OAuth callback from GitHub 