# CEKA Supabase Deployment Script (PowerShell)
# Use this to deploy all new edge functions to your production project.

# Set your Supabase Project ID
$PROJECT_ID = "your-project-id"

Write-Host "🚀 Starting CEKA Production Deployment..." -ForegroundColor Cyan

# 1. Deploy Edge Functions
Write-Host "📦 Deploying Edge Functions..." -ForegroundColor Yellow
supabase functions deploy publish-scheduled-posts --project-ref $PROJECT_ID
supabase functions deploy send-volunteer-confirmation --project-ref $PROJECT_ID
supabase functions deploy send-broadcast-email --project-ref $PROJECT_ID

# 2. Database Migrations (if any local changes exist)
# Write-Host "🗄️ Pushing Database Migrations..." -ForegroundColor Yellow
# supabase db push

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "⚠️  REMINDER: Ensure VITE_RESEND_API_KEY is set in Supabase Secrets:" -ForegroundColor Red
Write-Host "   supabase secrets set VITE_RESEND_API_KEY=your_key_here --project-ref $PROJECT_ID"
