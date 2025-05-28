# GitHub OAuth Setup for Decap CMS

## 🎯 Simple 5-Minute Setup

### Step 1: Create GitHub OAuth App
1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/applications/new)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: `Lerian Studio Blog CMS`
   - **Homepage URL**: `https://blog.lerian.studio`
   - **Authorization callback URL**: `https://blog.lerian.studio/admin/`
4. Click "Register application"

### Step 2: Get Your Credentials
1. Copy the **Client ID**
2. Generate a **Client Secret** and copy it

### Step 3: Add to Amplify Environment Variables
1. Go to AWS Amplify Console
2. Select your blog app
3. Go to "Environment variables"
4. Add:
   - `OAUTH_CLIENT_ID` = your Client ID
   - `OAUTH_CLIENT_SECRET` = your Client Secret

### Step 4: Update Decap CMS Config
Add this to your `static/admin/config.yml`:

```yaml
backend:
  name: github
  repo: LerianStudio/blog
  branch: main
  auth_type: pkce
  base_url: https://your-oauth-proxy.com  # Optional: if using auth proxy
```

## 🚀 That's it!

Now when you visit `/admin/`, it will authenticate directly with GitHub using your OAuth app.

## Alternative: Use GitHub's Implicit Flow
If you don't want to set up an OAuth proxy, you can use GitHub's implicit flow by just having the basic config we already set up. GitHub will handle the authentication flow directly.

## Troubleshooting
- Make sure the callback URL exactly matches: `https://blog.lerian.studio/admin/`
- Ensure your site URL in Amplify matches the homepage URL in GitHub OAuth app
- Check that the Client ID is correctly set in environment variables 