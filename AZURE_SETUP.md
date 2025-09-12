# Azure Container Apps Setup Guide

Complete step-by-step instructions to deploy your "Qué hacer en..." app to Azure Container Apps.

## Prerequisites

1. **Azure Account**: [Create one here](https://azure.microsoft.com/free/) if needed
2. **GitHub Actions completed**: Your Docker image should be built and available at `ghcr.io/daorhe2272/que-hacer-en:latest`
3. **Supabase credentials**: You'll need your database URL and API keys

## Step 1: Create Resource Group

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"** or use the search bar
3. Search for **"Resource group"** and click **Create**
4. Fill in the form:
   - **Subscription**: Choose your subscription
   - **Resource group name**: `que-hacer-en-rg`
   - **Region**: Choose closest to your users (e.g., East US, West Europe)
5. Click **"Review + create"** → **"Create"**
6. Wait for deployment to complete (~30 seconds)

## Step 2: Create Log Analytics Workspace

1. In the search bar, type **"Log Analytics workspaces"**
2. Click **"Create"**
3. Fill in the form:
   - **Subscription**: Your subscription
   - **Resource group**: `que-hacer-en-rg` (select from dropdown)
   - **Name**: `que-hacer-en-logs`
   - **Region**: Same as your resource group
4. Click **"Review + create"** → **"Create"**
5. Wait for deployment (~1-2 minutes)

## Step 3: Create Container Apps Environment

1. Search for **"Container Apps"**
2. Click **"Create"** → **"Container Apps Environment"**
3. Fill in the **Basics** tab:
   - **Subscription**: Your subscription
   - **Resource group**: `que-hacer-en-rg`
   - **Environment name**: `que-hacer-en-env`
   - **Region**: Same as previous resources
4. Click **"Monitoring"** tab:
   - **Enable Log Analytics**: Yes
   - **Log Analytics workspace**: Select `que-hacer-en-logs`
5. Click **"Networking"** tab:
   - Leave defaults (will create new VNet)
6. Click **"Review + create"** → **"Create"**
7. Wait for deployment (~3-5 minutes)

## Step 4: Create Container App

1. After environment is created, click **"Go to resource"**
2. Click **"Create Container App"**
3. **Basics** tab:
   - **Container app name**: `que-hacer-en-app`
   - **Resource group**: `que-hacer-en-rg`
   - **Environment**: `que-hacer-en-env` (should be pre-selected)

4. **Container** tab:
   - **Use quickstart image**: Uncheck this
   - **Name**: `que-hacer-en-app`
   - **Image source**: Other registries
   - **Image and tag**: `ghcr.io/daorhe2272/que-hacer-en:latest`
   - **CPU and Memory**: 0.5 CPU cores, 1 Gi memory

5. **Ingress** tab:
   - **Ingress**: Enabled
   - **Ingress traffic**: Accepting traffic from anywhere
   - **Ingress type**: HTTP
   - **Target port**: `4000`

6. Click **"Create"** (don't configure environment variables yet)
7. Wait for deployment (~5-10 minutes)

## Step 5: Configure Environment Variables

1. After app is created, go to the Container App resource
2. In the left menu, click **"Environment variables"**
3. Click **"Add"** for each variable below:

### Required Environment Variables:

```
NODE_ENV=production
API_PORT=4001
WEB_PORT=4000
DATABASE_URL=your-supabase-database-url-here
# SUPABASE_URL=https://your-project.supabase.co  # No longer needed - API now uses NEXT_PUBLIC_*
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OAUTH_CLIENT_ID=your-google-oauth-client-id
OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
ENABLE_AUTH=false
```

### Variables to Update After Deployment:
You'll need to update these after getting your Azure URL:

```
NEXT_PUBLIC_API_URL=https://your-app-name.region.azurecontainerapps.io
NEXT_PUBLIC_WEB_URL=https://your-app-name.region.azurecontainerapps.io
CORS_ORIGINS       =https://your-app-name.region.azurecontainerapps.io
```

**Where to find your Supabase values:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Go to **Settings** → **API**
- **URL**: Copy the "URL" field
- **anon key**: Copy the "anon public" key
- **service_role key**: Copy the "service_role" key (keep this secret!)
- **Database URL**: Go to **Settings** → **Database** → Copy "Connection string" → Use "Session Pooler" version (port 6543)

**Where to find your Google OAuth values:**
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Select your project (or create one)
- Go to **APIs & Services** → **Credentials**
- Click **"Create Credentials"** → **"OAuth 2.0 Client IDs"** (if not created yet)
- **Application type**: Web application
- **Authorized redirect URIs**: Add your Azure app URL + `/auth/callback`
- Copy the **Client ID** and **Client Secret**

4. After adding all variables, click **"Save"**
5. Click **"Create new revision"** to apply changes

## Step 6: Configure Scaling and Health Checks

1. In your Container App, go to **"Scale and replicas"**
2. Set:
   - **Min replicas**: 1
   - **Max replicas**: 10
3. Add **HTTP scaling rule**:
   - **Rule name**: `http-requests`
   - **Concurrent requests**: 50
4. Click **"Save"**

5. Go to **"Health probes"**
6. Add **Readiness probe**:
   - **Path**: `/api/health`
   - **Port**: 4001
   - **Initial delay**: 30 seconds
   - **Period**: 10 seconds
7. Add **Liveness probe**:
   - **Path**: `/`
   - **Port**: 4000
   - **Initial delay**: 60 seconds
   - **Period**: 30 seconds
8. Click **"Save"** → **"Create new revision"**

## Step 7: Get Your Application URL

1. Go to your Container App **"Overview"**
2. Find **"Application Url"** - this is your live app URL
3. Copy this URL and update the environment variables from Step 5:
   - Replace `https://your-app-name.region.azurecontainerapps.io` with your actual URL
   - Update `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_URL`, and `CORS_ORIGINS`
4. **Save** and **Create new revision**

## Step 8: Verify Deployment

1. **Test Web App**: Open your Application URL in a browser
2. **Test API**: Visit `https://your-url.com/api/health`
3. **Check Logs**: Go to **"Log stream"** to see application logs
4. **Monitor**: Go to **"Metrics"** to see CPU, memory, and request metrics

## Troubleshooting

### Container Won't Start
- Check **"Log stream"** for error messages
- Verify all environment variables are set correctly
- Ensure Docker image is publicly accessible: `https://github.com/daorhe2272/que-hacer-en/pkgs/container/que-hacer-en`

### Health Checks Failing
- Increase initial delay times (30s → 60s)
- Check if database connection is working
- Verify both ports 4000 and 4001 are responding

### Application Not Loading
- Check CORS settings in environment variables
- Verify `NEXT_PUBLIC_*` variables are set correctly
- Check browser developer tools for JavaScript errors

### Database Connection Issues
- Ensure `DATABASE_URL` uses Session Pooler (port 6543, not 5432)
- Verify Supabase project is not paused
- Check Supabase dashboard for connection limits

## Cost Management

- **Scaling to Zero**: App will scale down to 0 when idle (saves money)
- **Resource Monitoring**: Check metrics to optimize CPU/memory allocation
- **Alerts**: Set up cost alerts in Azure Cost Management

## Next Steps

Once deployed successfully:
1. **Custom Domain**: Add your own domain name
2. **SSL Certificate**: Automatically provided by Azure
3. **Monitoring**: Set up Application Insights for detailed monitoring
4. **Staging Environment**: Create a separate environment for testing
5. **CI/CD**: Automate deployments from GitHub Actions

## Emergency Contacts

If you encounter issues:
- **Azure Support**: Available in Azure Portal
- **GitHub Issues**: Check container registry permissions
- **Supabase Status**: [status.supabase.com](https://status.supabase.com)

---

**Expected Total Setup Time**: 30-45 minutes
**Monthly Cost Estimate**: $5-20 USD (depends on traffic)
**Scaling**: Automatic from 0-10 instances