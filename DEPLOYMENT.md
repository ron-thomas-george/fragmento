# Fragmento Deployment Guide

This guide will walk you through deploying Fragmento to Vercel using GitHub integration.

## Prerequisites

- GitHub account with the Fragmento repository
- Vercel account (free tier available)
- Supabase project set up with the database schema

## Step 1: Prepare Your Repository

Ensure your repository is up to date and contains all necessary files:

```bash
git add .
git commit -m "feat: Add Vercel deployment configuration"
git push origin develop
```

## Step 2: Set Up Supabase

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Import the database schema**:
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase.schema.sql`
   - Run the SQL to create all tables and relationships
3. **Run migrations** (if any):
   - Execute the migration files in `supabase/migrations/` in order
4. **Get your credentials**:
   - Go to Settings → API
   - Copy your Project URL and anon public key

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Import your `fragmento` repository from GitHub
   - Vercel will automatically detect it's a Next.js project

3. **Configure Environment Variables**
   Add the following environment variables in the Vercel dashboard:
   
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   JWT_SECRET=your_secure_random_jwt_secret
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application
   - You'll get a deployment URL like `https://fragmento-xyz.vercel.app`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from your project directory**
   ```bash
   vercel
   ```

4. **Set environment variables**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add JWT_SECRET
   ```

## Step 4: Configure Domain (Optional)

1. **Custom Domain**
   - In Vercel dashboard, go to your project
   - Click "Domains" tab
   - Add your custom domain (e.g., `fragmento.yourdomain.com`)
   - Follow DNS configuration instructions

## Step 5: Set Up Continuous Deployment

Vercel automatically sets up continuous deployment:
- Pushes to `main` branch → Production deployment
- Pushes to other branches → Preview deployments
- Pull requests → Preview deployments with unique URLs

## Step 6: Configure Figma Plugin

Update your Figma plugin configuration to use the production URL:

1. **Update API endpoints** in `figma-plugin/src/plugin/plugin.ts`:
   ```typescript
   const API_BASE_URL = 'https://your-app.vercel.app';
   ```

2. **Update authentication URL**:
   ```typescript
   const authUrl = `https://your-app.vercel.app/auth/figma?state=${state}`;
   ```

3. **Rebuild and republish** the Figma plugin

## Step 7: Test Your Deployment

1. **Visit your deployed app**
2. **Test authentication** (sign up/sign in)
3. **Create a project** and add some tokens
4. **Test Figma plugin** integration
5. **Test GitHub/Slack integrations**

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ0eXAiOiJKV1QiLCJhbGc...` |
| `JWT_SECRET` | Secret for Figma plugin JWT tokens | `your-super-secret-key-here` |

## Troubleshooting

### Build Errors

1. **Check build logs** in Vercel dashboard
2. **Ensure all dependencies** are in `package.json`
3. **Verify TypeScript** compilation locally:
   ```bash
   npm run build
   ```

### Runtime Errors

1. **Check Function logs** in Vercel dashboard
2. **Verify environment variables** are set correctly
3. **Test API endpoints** individually

### Database Connection Issues

1. **Verify Supabase credentials** are correct
2. **Check Supabase project** is active
3. **Ensure database schema** is imported correctly

### Figma Plugin Issues

1. **Update plugin URLs** to production domain
2. **Rebuild and reinstall** the plugin
3. **Check CORS settings** in Supabase if needed

## Performance Optimization

Vercel automatically provides:
- **Global CDN** for static assets
- **Edge functions** for API routes
- **Image optimization** for Next.js images
- **Automatic compression** and caching

## Monitoring

Monitor your deployment:
- **Vercel Analytics** for performance metrics
- **Vercel Logs** for function execution
- **Supabase Dashboard** for database metrics

## Security

Ensure security best practices:
- **Environment variables** are properly set
- **JWT secrets** are strong and unique
- **Supabase RLS policies** are configured
- **API rate limiting** is considered

## Support

If you encounter issues:
1. Check Vercel documentation
2. Review deployment logs
3. Test locally first
4. Contact support if needed
