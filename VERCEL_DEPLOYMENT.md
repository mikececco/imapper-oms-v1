# Vercel Deployment Guide

This guide explains how to deploy your Order Management System to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Setting Up Environment Variables

Before deploying, you need to set up environment variables in Vercel:

1. Go to your Vercel dashboard
2. Click on "Add New" → "Project"
3. Import your Git repository
4. After the initial deployment, go to your project settings
5. Navigate to "Environment Variables"
6. Add the following environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `NEXT_PUBLIC_API_URL` - The URL of your API server (if separate from the Next.js app)
7. Make sure to set these variables for all environments (Production, Preview, and Development)
8. Click "Save" and redeploy your application

## Deployment

### Option 1: Automatic Deployment

1. Connect your Git repository to Vercel
2. Vercel will automatically deploy your application when you push changes to your repository

### Option 2: Manual Deployment

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Login to Vercel:
   ```
   vercel login
   ```

3. Deploy your project:
   ```
   vercel
   ```

## Vercel Configuration

The `vercel.json` file in your project contains the configuration for your Vercel deployment:

```json
{
  "version": 2,
  "buildCommand": "npm run build:next",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["cdg1"],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

## Tailwind CSS Configuration

This project uses Tailwind CSS for styling. Make sure the following files are properly configured:

1. `postcss.config.mjs`:
   ```js
   const config = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   };
   
   export default config;
   ```

2. `tailwind.config.js`:
   ```js
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     content: [
       './app/**/*.{js,ts,jsx,tsx,mdx}',
       './pages/**/*.{js,ts,jsx,tsx,mdx}',
       './components/**/*.{js,ts,jsx,tsx,mdx}',
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```

3. Make sure these dependencies are in your `package.json`:
   ```json
   "devDependencies": {
     "autoprefixer": "^10.4.16",
     "postcss": "^8.4.31",
     "tailwindcss": "^3.3.5"
   }
   ```

## API Server Deployment

If your API server is separate from your Next.js app, you'll need to deploy it separately. Options include:

1. Vercel Serverless Functions
2. Heroku
3. Railway
4. Render
5. AWS, GCP, or Azure

Make sure to update the `NEXT_PUBLIC_API_URL` environment variable with the URL of your deployed API server.

## Troubleshooting

If you encounter issues with your deployment:

1. Check the Vercel deployment logs
2. Ensure all environment variables are correctly set in the Vercel dashboard
3. Verify that your API server is accessible from your Next.js app
4. Check that your Supabase configuration is correct
5. If you see "Environment Variable references Secret which does not exist" errors, make sure you've added the environment variables directly in the Vercel dashboard

### Common Build Errors

1. **Missing Tailwind CSS dependencies**:
   - Error: `Cannot find module '@tailwindcss/postcss'`
   - Solution: Update your postcss.config.mjs file to use the correct plugin format and make sure tailwindcss and autoprefixer are installed.

2. **Invalid Next.js configuration**:
   - Error: `Invalid next.config.ts options detected: Unrecognized key(s) in object: 'swcMinify'`
   - Solution: Remove the `swcMinify` option from your next.config.ts file as it's no longer supported in Next.js 15. 