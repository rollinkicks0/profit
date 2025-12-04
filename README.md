# Profit Tracker - Shopify App

A Next.js-based Shopify app to track orders and calculate profit for your store.

## 🚀 Features (Stage 1)

- ✅ Shopify OAuth authentication
- ✅ View today's order count
- ✅ Display order details (order number, total, time)
- ✅ Real-time order data from Shopify
- 🔜 Profit calculation (Stage 2)

## 📋 Prerequisites

Before you begin, make sure you have:

1. **Node.js** (v18 or higher) installed
2. **Shopify Partner Account** - [Sign up here](https://partners.shopify.com/)
3. **Development Store** - Create one in your Partner Dashboard
4. **GitHub Account** - For version control
5. **Vercel Account** - For deployment

## 🛠️ Setup Instructions

### 1. Shopify App Configuration

1. Go to your [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Click **Apps** > **Create app** > **Create app manually**
3. Fill in the app details:
   - **App name**: Profit Tracker (or your preferred name)
   - **App URL**: `https://your-app.vercel.app` (you'll update this after Vercel deployment)
   
4. In the **Configuration** tab, set:
   - **Allowed redirection URL(s)**:
     ```
     https://your-app.vercel.app/api/auth/callback
     ```
   
5. In **API access**, add the following scope:
   ```
   read_orders
   ```

6. Save your **Client ID** and **Client Secret** - you'll need these for environment variables

### 2. Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rollinkicks0/profit.git
   cd profit
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `env.template` to `.env.local`:
     ```bash
     cp env.template .env.local
     ```
   
   - Edit `.env.local` and fill in your values:
     ```env
     SHOPIFY_API_KEY=your_client_id_from_shopify
     SHOPIFY_API_SECRET=your_client_secret_from_shopify
     SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
     NEXT_PUBLIC_APP_URL=http://localhost:3000
     SESSION_SECRET=generate_a_random_string_here
     ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Test locally**:
   - Open [http://localhost:3000](http://localhost:3000)
   - Enter your store domain to authenticate

### 3. GitHub Setup

Your repository is already set up at: `https://github.com/rollinkicks0/profit`

To push your code:

```bash
git add .
git commit -m "Initial commit: Shopify app setup"
git push origin main
```

### 4. Vercel Deployment

1. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com/)
   - Click **Add New** > **Project**
   - Import your GitHub repository: `rollinkicks0/profit`

2. **Configure Environment Variables** in Vercel:
   - In the project settings, add the same environment variables from your `.env.local`:
     ```
     SHOPIFY_API_KEY
     SHOPIFY_API_SECRET
     SHOPIFY_STORE_DOMAIN
     NEXT_PUBLIC_APP_URL (use your Vercel URL here)
     SESSION_SECRET
     ```

3. **Deploy**:
   - Click **Deploy**
   - Wait for deployment to complete
   - Copy your Vercel deployment URL (e.g., `https://profit-rollinkicks.vercel.app`)

4. **Update Shopify App URLs**:
   - Go back to your Shopify Partner Dashboard
   - Update the **App URL** to your Vercel URL
   - Update the **Allowed redirection URL** to: `https://your-vercel-url.vercel.app/api/auth/callback`
   - Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables to your Vercel URL
   - Redeploy from Vercel dashboard (or push a new commit)

### 5. Install App on Your Store

1. In Shopify Partner Dashboard, go to your app
2. Click **Test on development store**
3. Select your development store
4. Click **Install app**
5. You should see the Profit Tracker dashboard with today's orders!

## 📁 Project Structure

```
profit/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── route.ts           # OAuth initiation
│   │   │   └── callback/
│   │   │       └── route.ts       # OAuth callback handler
│   │   └── orders/
│   │       └── today/
│   │           └── route.ts       # Fetch today's orders
│   ├── page.tsx                   # Main dashboard
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── lib/
│   ├── shopify.ts                 # Shopify API configuration
│   ├── shopify-client.ts          # Shopify API client functions
│   └── session-storage.ts         # Session management (in-memory)
├── package.json
├── next.config.js
├── tsconfig.json
└── README.md
```

## 🔧 Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: Shopify Admin API
- **Authentication**: Shopify OAuth 2.0
- **Deployment**: Vercel
- **Database**: In-memory (Stage 1) → Supabase (Stage 2)

## 🎯 Roadmap

### Stage 1 (Current) ✅
- [x] Basic Next.js app setup
- [x] Shopify OAuth authentication
- [x] Display today's order count
- [x] Show order details

### Stage 2 (Coming Soon)
- [ ] Integrate Supabase for persistent storage
- [ ] Add product cost tracking
- [ ] Calculate profit per order
- [ ] Display profit metrics
- [ ] Add date range filtering

### Stage 3 (Future)
- [ ] Historical data and charts
- [ ] Export reports
- [ ] Multi-store support
- [ ] Email notifications

## 🐛 Troubleshooting

**Issue: "Not authenticated" error**
- Solution: Make sure you've installed the app on your store through the Shopify Partner Dashboard

**Issue: "Failed to fetch orders"**
- Solution: Verify that the `read_orders` scope is added in your Shopify app configuration

**Issue: OAuth redirect not working**
- Solution: Double-check that your redirect URLs match exactly in both Shopify and your `.env` file

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SHOPIFY_API_KEY` | Your Shopify app's Client ID | `abc123...` |
| `SHOPIFY_API_SECRET` | Your Shopify app's Client Secret | `shpss_xxx...` |
| `SHOPIFY_STORE_DOMAIN` | Your store domain | `mystore.myshopify.com` |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | `https://profit.vercel.app` |
| `SESSION_SECRET` | Random string for session encryption | `random_string_here` |

## 🤝 Contributing

This is a private project for Rollin Kicks store. 

## 📄 License

Private - All rights reserved

## 💡 Support

For issues or questions, contact the development team.

---

Built with ❤️ for Rollin Kicks

