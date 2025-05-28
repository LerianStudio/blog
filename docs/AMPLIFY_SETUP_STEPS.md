# AWS Amplify Setup Steps

## 1. Create Amplify App
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Click "New app" → "Host web app"
3. Choose "GitHub" and authorize AWS to access your repo
4. Select `lerianstudio/blog` repository
5. Select `main` branch

## 2. Configure Build Settings
Amplify should auto-detect Hugo. Verify these settings:
- **Build command**: `hugo --minify --buildDrafts=false`
- **Base directory**: `/`
- **Output directory**: `public`

## 3. Environment Variables (if needed)
Add these in Amplify Console > App settings > Environment variables:
- `HUGO_VERSION`: `0.121.1` (or your preferred version)

## 4. Deploy
Click "Save and deploy". First build takes ~2-3 minutes.

## 5. Get Your URLs
After deployment:
- Main URL: `https://main.{app-id}.amplifyapp.com`
- Admin panel: `https://main.{app-id}.amplifyapp.com/admin/`

## 6. Setup GitHub Secrets (for workflow)
Go to GitHub repo > Settings > Secrets and add:
- `AWS_ROLE_ARN`: (create IAM role with Amplify permissions)
- `AWS_REGION`: `us-east-1` (or your region)
- `AMPLIFY_APP_ID`: (from Amplify console URL)

## 7. Custom Domain (Optional)
In Amplify Console > Domain management:
- Add your custom domain
- Follow DNS configuration steps