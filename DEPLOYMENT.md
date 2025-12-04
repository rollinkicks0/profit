# Deployment Guide

This guide walks you through deploying your Shopify Profit Tracker app to production.

## Pre-Deployment Checklist

- [ ] GitHub repository created and code pushed
- [ ] Shopify app created in Partner Dashboard
- [ ] Development store created for testing
- [ ] Environment variables documented

## Step-by-Step Deployment

### 1. Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit: Profit Tracker app"

# Add remote origin
git remote add origin https://github.com/rollinkicks0/profit.git

# Push to main branch
git push -u origin main
```

### 2. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select `rollinkicks0/profit`
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. Add Environment Variables:
   ```
   SHOPIFY_API_KEY = your_client_id
   SHOPIFY_API_SECRET = your_client_secret
   SHOPIFY_STORE_DOMAIN = your-store.myshopify.com
   NEXT_PUBLIC_APP_URL = https://your-deployment.vercel.app
   SESSION_SECRET = your_random_secret_string
   ```

6. Click **Deploy**

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts and add environment variables when asked
```

### 3. Get Your Deployment URL

After deployment completes, Vercel will provide a URL like:
```
https://profit-rollinkicks.vercel.app
```

Copy this URL - you'll need it for the next steps.

### 4. Update Shopify App Configuration

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Navigate to your app
3. Click **Configuration**
4. Update the following:

   **App URL**:
   ```
   https://profit-rollinkicks.vercel.app
   ```

   **Allowed redirection URL(s)**:
   ```
   https://profit-rollinkicks.vercel.app/api/auth/callback
   ```

5. Click **Save**

### 5. Update Vercel Environment Variable

1. Go to your Vercel project dashboard
2. Click **Settings** > **Environment Variables**
3. Find `NEXT_PUBLIC_APP_URL`
4. Update it to your production URL:
   ```
   https://profit-rollinkicks.vercel.app
   ```
5. Click **Save**
6. Go to **Deployments** tab
7. Click the three dots on the latest deployment > **Redeploy**

### 6. Test Your Production App

1. In Shopify Partner Dashboard, go to your app
2. Click **Test on development store**
3. Select your store
4. Click **Install app**
5. Authorize the app
6. You should see your dashboard with today's orders!

## Verifying Deployment

### Check API Routes

Test these endpoints:

1. **Auth Route**:
   ```
   https://profit-rollinkicks.vercel.app/api/auth?shop=your-store.myshopify.com
   ```
   Should redirect to Shopify OAuth

2. **Orders API** (after authentication):
   ```
   https://profit-rollinkicks.vercel.app/api/orders/today?shop=your-store.myshopify.com
   ```

### Common Issues

**Issue 1: OAuth Redirect Mismatch**
```
Error: redirect_uri does not match
```
**Solution**: Make sure redirect URLs in Shopify exactly match your Vercel URL

**Issue 2: Environment Variables Not Loading**
```
Error: Missing required environment variables
```
**Solution**: 
- Check all env vars are set in Vercel
- Redeploy after adding env vars

**Issue 3: Build Fails**
```
Error: Build failed
```
**Solution**: 
- Check build logs in Vercel
- Test build locally: `npm run build`
- Fix any TypeScript or build errors

## Continuous Deployment

Once set up, Vercel will automatically deploy when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Add new feature"
git push origin main

# Vercel will automatically deploy
```

## Monitoring

### Vercel Analytics

1. Go to your Vercel project
2. Click **Analytics** tab
3. View real-time metrics:
   - Page views
   - API calls
   - Performance metrics

### Check Logs

1. In Vercel dashboard, click **Deployments**
2. Click on a deployment
3. View **Runtime Logs** for API errors

## Rollback

If something goes wrong:

1. Go to Vercel dashboard
2. Click **Deployments**
3. Find a previous working deployment
4. Click three dots > **Promote to Production**

## Custom Domain (Optional)

To use your own domain:

1. In Vercel project settings, click **Domains**
2. Add your domain (e.g., `profit.rollinkicks.com`)
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` in environment variables
5. Update Shopify app URLs to use your custom domain

## Production Checklist

- [ ] Code pushed to GitHub
- [ ] Deployed to Vercel successfully
- [ ] Environment variables configured
- [ ] Shopify app URLs updated
- [ ] App installed on development store
- [ ] Tested OAuth flow
- [ ] Verified order data fetching
- [ ] Monitoring enabled
- [ ] Domain configured (if applicable)

## Next Steps

Once deployed successfully:

1. Test thoroughly on your development store
2. Monitor for any errors in Vercel logs
3. Gather feedback from store team
4. Plan Stage 2 features (Supabase + Profit calculation)

## Support

If you encounter issues:

1. Check Vercel build/runtime logs
2. Check browser console for client-side errors
3. Verify Shopify app configuration
4. Test API routes individually

---

🎉 Congratulations! Your app is now live!

