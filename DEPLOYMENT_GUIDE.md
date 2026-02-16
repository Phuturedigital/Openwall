# Deployment Guide for Openwall

## Pre-Deployment Checklist

- [x] Console logs removed from production code
- [x] Build completes without errors
- [x] Environment variables configured
- [x] TypeScript compilation passes
- [x] No broken imports or dependencies

## Deploying to Netlify

### Step 1: Connect Your Repository

1. Go to [netlify.com](https://netlify.com)
2. Click **"New site from Git"**
3. Connect your GitHub account
4. Select your repository (e.g., `openwall` or similar)
5. Authorize Netlify to access your repo

### Step 2: Configure Build Settings

Netlify should auto-detect these settings, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18+ (set in `netlify.toml` or Netlify UI)

### Step 3: Add Environment Variables

In Netlify Dashboard:
1. Go to **Site settings** → **Build & deploy** → **Environment**
2. Add these variables:

```
VITE_SUPABASE_URL=https://ixgeuzmbzbfgksxyvkuu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4Z2V1em1iemJmZ2tzeHl2a3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MTEzNjIsImV4cCI6MjA3ODI4NzM2Mn0.yZzCAtax452TO5wqD8oHVBex4YgCyLgqVORUIZ8gds4
```

### Step 4: Deploy

1. Click **Deploy site** in the Netlify dashboard
2. Monitor the build logs in real-time
3. Once deployed, your site will be live at a Netlify URL
4. Configure a custom domain in Site settings → Domain management

### Step 5: Continuous Deployment

After initial deployment:
- Push code to your main branch
- Netlify automatically rebuilds and deploys
- Check deployment status in Netlify dashboard

## Post-Deployment Verification

After deployment:

1. **Test authentication**: Sign up, sign in, password reset
2. **Test posting**: Create a note, verify it appears on the wall
3. **Test profile**: Update profile, verify intent changes are reflected
4. **Test notifications**: Request connections, verify notifications work
5. **Test mobile**: Check responsive design on mobile devices
6. **Check console**: Verify no errors in browser dev tools
7. **Monitor performance**: Use Netlify Analytics

## Monitoring & Troubleshooting

### Enable Netlify Analytics
1. Site settings → Analytics
2. Enable Site analytics for visitor data

### Check Deployment Logs
1. Deployments tab in Netlify dashboard
2. Click any deployment to see build logs
3. Look for warnings or errors

### Common Issues

**Build fails with "VITE_SUPABASE_URL not found"**
- Verify environment variables are set in Netlify
- Rebuild after adding variables

**Blank page on load**
- Check browser console for errors
- Verify Supabase credentials are correct
- Check that `_redirects` file is deployed

**Auth not working**
- Verify Supabase URL and key are correct
- Check Supabase project is running
- Verify browser allows cookies/localStorage

## Rollback Procedure

If deployment breaks:

1. Go to **Deployments** in Netlify dashboard
2. Find the last working deployment
3. Click the three dots menu
4. Select **Publish deploy**

## Custom Domain Setup

1. In Site settings → Domain management
2. Click **Add custom domain**
3. Enter your domain
4. Follow DNS configuration instructions
5. SSL certificate auto-configures within minutes

## Database Backups

Supabase automatically backs up your database:
- Daily automated backups
- Available in Supabase dashboard → Database → Backups
- Can restore from any backup point

## Support

For deployment issues:
- Check [Netlify Docs](https://docs.netlify.com)
- Check [Supabase Docs](https://supabase.com/docs)
- Review deployment logs for specific errors
