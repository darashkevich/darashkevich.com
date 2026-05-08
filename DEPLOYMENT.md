# 🚀 Deployment Guide for darashkevich.com

## Quick Deploy to Netlify (Recommended)

### Step 1: Build Your Project
```bash
npm run build
```

### Step 2: Deploy to Netlify

#### Option A: Drag & Drop (Easiest)
1. Go to [netlify.com](https://netlify.com)
2. Sign up/login with your account
3. Drag the `dist` folder from your project to Netlify's dashboard
4. Wait for deployment to complete
5. Click "Domain settings" → "Add custom domain"
6. Enter `darashkevich.com`
7. Follow DNS setup instructions

#### Option B: GitHub Integration (Best for updates)
1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Connect your GitHub account
5. Select your repository
6. Set build command: `npm run build`
7. Set publish directory: `dist`
8. Deploy and connect your domain

### Step 3: DNS Configuration
You'll need to update your domain's DNS settings to point to Netlify:
- Add a CNAME record: `darashkevich.com` → `your-site.netlify.app`
- Or add A records pointing to Netlify's IP addresses

## Alternative: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your project from GitHub
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Deploy and connect your domain

## Alternative: Traditional Web Hosting

1. Upload contents of `dist` folder to your hosting provider's `public_html` folder
2. Point your domain to your hosting provider

## Updating Your Site

After making changes:
1. Run `npm run build` to rebuild
2. If using Netlify/GitHub: Just push to GitHub (auto-deploy)
3. If using drag & drop: Upload the new `dist` folder
4. If using traditional hosting: Upload the new files

## Need Help?

- Netlify Support: [help.netlify.com](https://help.netlify.com)
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Astro Documentation: [docs.astro.build](https://docs.astro.build)


