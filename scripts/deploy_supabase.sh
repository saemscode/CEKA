#!/bin/bash
# CEKA Supabase Deployment Script (Bash)
# Use this to deploy all new edge functions to your production project.

# Set your Supabase Project ID
PROJECT_ID="your-project-id"

echo "🚀 Starting CEKA Production Deployment..."

# 1. Deploy Edge Functions
echo "📦 Deploying Edge Functions..."
supabase functions deploy publish-scheduled-posts --project-ref $PROJECT_ID
supabase functions deploy send-volunteer-confirmation --project-ref $PROJECT_ID
supabase functions deploy send-broadcast-email --project-ref $PROJECT_ID

# 2. Database Migrations (if any local changes exist)
# echo "🗄️ Pushing Database Migrations..."
# supabase db push

echo "✅ Deployment Complete!"
echo "⚠️  REMINDER: Ensure VITE_RESEND_API_KEY is set in Supabase Secrets:"
echo "   supabase secrets set VITE_RESEND_API_KEY=your_key_here --project-ref $PROJECT_ID"
