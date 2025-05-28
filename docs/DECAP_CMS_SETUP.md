# Decap CMS Setup with Google SSO

## Overview
Decap CMS is configured to work with AWS Amplify hosting and provides a user-friendly interface for content management.

## Access the CMS
Once deployed, access the admin interface at: `https://yourdomain.amplifyapp.com/admin/`

## Google SSO Setup

Since we're using GitHub as the backend, Google SSO works through GitHub organization settings:

### Option 1: GitHub Organization SSO (Recommended)
1. Go to your GitHub organization settings
2. Enable SAML SSO with Google Workspace
3. Only organization members with Google accounts can access the CMS

### Option 2: GitHub OAuth App with Domain Restriction
1. Create a GitHub OAuth App:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Click "New OAuth App"
   - Set Authorization callback URL: `https://api.netlify.com/auth/done`
   - Note the Client ID and Client Secret

2. Create a serverless function for OAuth:
   ```javascript
   // amplify/backend/function/githubauth/src/index.js
   exports.handler = async (event) => {
     // OAuth flow implementation
   };
   ```

### Option 3: Use Netlify Identity (Simplest)
1. Deploy to Netlify instead of Amplify (free tier available)
2. Enable Netlify Identity
3. Configure Google as an external provider
4. Invite team members by email

## Local Development
Run `npx decap-server` to test the CMS locally without authentication.

## Features Available
- Visual markdown editor
- Image uploads
- Draft/publish workflow
- Content preview
- Mobile-friendly interface

## Troubleshooting
- Clear browser cache if login issues occur
- Check GitHub permissions for repository access
- Ensure `/admin/` path is not blocked by redirects