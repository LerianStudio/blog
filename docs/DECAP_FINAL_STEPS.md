# Decap CMS Final Configuration

## 1. Update Site URLs
Edit `/static/admin/config.yml` and replace:
```yaml
site_url: https://yourdomain.amplifyapp.com
display_url: https://yourdomain.amplifyapp.com
```
With your actual Amplify URL (e.g., `https://main.d1234567890.amplifyapp.com`)

## 2. Create GitHub OAuth App
Since you want Google SSO, best approach:

### Option A: GitHub Organization (Recommended)
1. Go to your GitHub Organization settings
2. Settings > Security > Authentication security
3. Enable "Require SAML authentication"
4. Configure with Google Workspace as IdP
5. Team members must authenticate with Google to access GitHub

### Option B: Direct GitHub OAuth
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App:
   - **Application name**: Blog CMS
   - **Homepage URL**: Your Amplify URL
   - **Authorization callback URL**: `https://your-amplify-url.com/admin/`
3. Save Client ID (you'll need this)

## 3. Test Locally First
```bash
# Install Decap server for local testing
npm install -g decap-server

# Run local server (no auth required)
npx decap-server

# Open http://localhost:8080/admin/
```

## 4. First Deployment
```bash
# Commit all changes
git add .
git commit -m "feat: add Decap CMS with AWS Amplify"
git push origin main
```

## 5. Access Your CMS
After Amplify deploys (~2-3 min):
1. Go to `https://your-amplify-url.com/admin/`
2. Click "Login with GitHub"
3. Authorize the app
4. Start creating content!

## Troubleshooting
- **404 on /admin/**: Check if files exist in Amplify build logs
- **Auth errors**: Verify GitHub OAuth app URLs match exactly
- **No Google SSO**: Consider using Netlify Identity (free) for easier Google OAuth