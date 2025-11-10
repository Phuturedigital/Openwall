/*
  # Fix Security Issues - Foreign Key Indexes and SECURITY DEFINER Views
  
  ## Summary
  This migration addresses critical security and performance issues:
  
  ## 1. Performance: Add Missing Foreign Key Indexes
  
  Foreign keys without indexes cause:
  - Slow JOIN queries
  - Full table scans on lookups
  - Poor query plan optimization
  - Scalability issues
  
  **Indexes Added:**
  - `idx_notes_fulfilled_by` - Performance for fulfilled note queries
  - `idx_platform_config_updated_by` - Audit trail performance  
  - `idx_transactions_note_id` - Critical for transaction lookups
  
  ## 2. Security: Fix SECURITY DEFINER Views
  
  SECURITY DEFINER views run with owner privileges, which:
  - Bypasses Row Level Security (RLS)
  - Creates privilege escalation risks
  - Allows unauthorized data access
  
  **Fixed:** Changed all analytics views to SECURITY INVOKER
  - Views now respect RLS policies
  - Run with caller's permissions
  - Consistent security model
  
  ## Impact
  - ✅ Faster queries on foreign key relationships
  - ✅ Views now enforce RLS properly
  - ✅ No application code changes needed
  - ✅ Production-safe with IF NOT EXISTS
*/

-- =====================================================
-- PERFORMANCE: Add Missing Foreign Key Indexes
-- =====================================================

-- Index on notes.fulfilled_by (foreign key to profiles.id)
-- Improves queries filtering by who fulfilled notes
CREATE INDEX IF NOT EXISTS idx_notes_fulfilled_by 
ON public.notes(fulfilled_by) 
WHERE fulfilled_by IS NOT NULL;

-- Index on platform_config.updated_by (foreign key to profiles.id)
-- Improves audit queries for config changes  
CREATE INDEX IF NOT EXISTS idx_platform_config_updated_by 
ON public.platform_config(updated_by) 
WHERE updated_by IS NOT NULL;

-- Index on transactions.note_id (foreign key to notes.id)
-- Critical for joining transactions with notes
CREATE INDEX IF NOT EXISTS idx_transactions_note_id 
ON public.transactions(note_id) 
WHERE note_id IS NOT NULL;

-- =====================================================
-- SECURITY: Fix SECURITY DEFINER Views
-- =====================================================

-- Drop and recreate user_analytics with SECURITY INVOKER
DROP VIEW IF EXISTS public.user_analytics CASCADE;

CREATE VIEW public.user_analytics 
WITH (security_invoker = true) 
AS
SELECT 
  p.id,
  p.email,
  p.created_at,
  COUNT(DISTINCT n.id) as total_notes,
  COUNT(DISTINCT CASE WHEN n.status = 'open' THEN n.id END) as active_notes,
  COUNT(DISTINCT CASE WHEN n.status = 'fulfilled' THEN n.id END) as fulfilled_notes,
  COUNT(DISTINCT cr.id) as total_requests,
  COUNT(DISTINCT t.id) as total_transactions,
  COALESCE(SUM(t.amount), 0) as total_spent,
  MAX(n.created_at) as last_note_date,
  MAX(cr.created_at) as last_request_date
FROM public.profiles p
LEFT JOIN public.notes n ON n.user_id = p.id
LEFT JOIN public.connection_requests cr ON cr.freelancer_id = p.id
LEFT JOIN public.transactions t ON t.user_id = p.id
GROUP BY p.id, p.email, p.created_at;

-- Drop and recreate platform_stats with SECURITY INVOKER
DROP VIEW IF EXISTS public.platform_stats CASCADE;

CREATE VIEW public.platform_stats 
WITH (security_invoker = true)
AS
SELECT
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT CASE WHEN p.created_at > now() - interval '30 days' THEN p.id END) as users_last_30_days,
  COUNT(DISTINCT n.id) as total_notes,
  COUNT(DISTINCT CASE WHEN n.status = 'open' THEN n.id END) as active_notes,
  COUNT(DISTINCT CASE WHEN n.created_at > now() - interval '30 days' THEN n.id END) as notes_last_30_days,
  COUNT(DISTINCT cr.id) as total_requests,
  COUNT(DISTINCT CASE WHEN cr.status = 'approved' THEN cr.id END) as approved_requests,
  COUNT(DISTINCT t.id) as total_transactions,
  COALESCE(SUM(t.amount), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN t.created_at > now() - interval '30 days' THEN t.amount ELSE 0 END), 0) as revenue_last_30_days
FROM public.profiles p
LEFT JOIN public.notes n ON n.user_id = p.id
LEFT JOIN public.connection_requests cr ON cr.freelancer_id = p.id OR cr.note_id IN (SELECT id FROM public.notes WHERE user_id = p.id)
LEFT JOIN public.transactions t ON t.user_id = p.id;

-- Drop and recreate note_analytics with SECURITY INVOKER
DROP VIEW IF EXISTS public.note_analytics CASCADE;

CREATE VIEW public.note_analytics 
WITH (security_invoker = true)
AS
SELECT
  n.id,
  n.created_at,
  n.user_id,
  p.full_name as author_name,
  n.title,
  n.body,
  n.budget,
  n.city,
  n.prio,
  n.status,
  COUNT(DISTINCT cr.id) as request_count,
  COUNT(DISTINCT CASE WHEN cr.status = 'approved' THEN cr.id END) as approved_count,
  COUNT(DISTINCT CASE WHEN cr.status = 'pending' THEN cr.id END) as pending_count,
  MAX(cr.created_at) as last_request_date,
  n.fulfilled_by,
  n.fulfilled_at,
  CASE 
    WHEN n.fulfilled_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (n.fulfilled_at - n.created_at))/3600 
  END as hours_to_fulfill
FROM public.notes n
LEFT JOIN public.profiles p ON p.id = n.user_id
LEFT JOIN public.connection_requests cr ON cr.note_id = n.id
GROUP BY n.id, n.created_at, n.user_id, p.full_name, n.title, n.body, 
         n.budget, n.city, n.prio, n.status, n.fulfilled_by, n.fulfilled_at;

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON INDEX idx_notes_fulfilled_by IS 
'Performance index for notes.fulfilled_by foreign key';

COMMENT ON INDEX idx_platform_config_updated_by IS 
'Performance index for platform_config.updated_by foreign key';

COMMENT ON INDEX idx_transactions_note_id IS 
'Performance index for transactions.note_id foreign key';

COMMENT ON VIEW user_analytics IS 
'User statistics with SECURITY INVOKER - respects RLS';

COMMENT ON VIEW platform_stats IS 
'Platform metrics with SECURITY INVOKER - respects RLS';

COMMENT ON VIEW note_analytics IS 
'Note analytics with SECURITY INVOKER - respects RLS';
