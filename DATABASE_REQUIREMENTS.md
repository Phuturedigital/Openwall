# Openwall Database Requirements

## Overview

This document details all database requirements for the Openwall platform - a two-sided marketplace connecting service providers (vendors) with clients posting service requests.

**Business Model:**
- Clients post service requests (notes) with contact details
- Vendors browse public listings anonymously
- Vendors must authenticate and unlock notes to access contact details
- Beta phase: unlocks are FREE
- Future: paid unlocks and note prioritization

---

## Core Tables

### 1. profiles
**Purpose:** User profiles for both clients and vendors

**Columns:**
- `id` (uuid, PK) - References auth.users
- `email` (text) - User email
- `full_name` (text) - Display name
- `phone` (text) - Contact number
- `city` (text) - Primary city location
- `area` (text) - Suburb/neighborhood within city
- `user_type` (text) - 'client' or 'vendor'
- `role` (text) - User role: 'user', 'admin'
- `verified` (boolean) - Account verification status
- `created_at` (timestamptz) - Account creation timestamp
- `last_active` (timestamptz) - Last activity timestamp

**Vendor-Specific Fields:**
- `profession` (text) - Job title/role
- `skills` (text[]) - Array of skills (max 5)
- `bio` (text) - Profile bio (max 160 chars)
- `portfolio` (jsonb) - Portfolio files (up to 3)
- `experience` (text) - Experience description
- `service_category` (text) - Primary service category
- `services_offered` (text[]) - Service tags
- `work_mode` (text) - 'on_site', 'remote', 'both', 'either'

**Client-Specific Fields:**
- `industry` (text) - Business industry
- `company_name` (text) - Company name
- `looking_for` (text[]) - Service types needed
- `help_needed` (text[]) - Specific help required

**Preferences:**
- `intent` (text) - 'offer_services' or 'post_request'
- `discovery_preference` (text) - 'near_me', 'my_city', 'anywhere'
- `post_visibility` (text) - 'public' or 'private'
- `daily_request_limit` (integer) - Max requests per day (default: 10)

**Constraints:**
- `bio_max_length`: bio <= 160 characters
- `skills_max_length`: skills array <= 5 items
- `post_visibility_check`: visibility IN ('public', 'private')

**Indexes:**
- `idx_profiles_email` - Email lookup (login)
- `idx_profiles_user_type` - User type filtering

**RLS Policies:**
- Users can view their full profile
- Users can insert/update own profile
- Public profile info visible via `public_profiles` view

---

### 2. notes
**Purpose:** Service request listings posted by clients

**Columns:**
- `id` (uuid, PK)
- `user_id` (uuid, FK to profiles) - Note owner
- `title` (text, optional) - Note title
- `body` (text, required) - Main content/description
- `category` (text) - Auto-detected: 'design', 'writing', 'tech', 'marketing', 'development', 'consulting', 'other'
- `budget` (integer) - Budget in cents
- `city` (text) - Location city
- `area` (text) - Location area/suburb
- `work_mode` (text) - 'on-site', 'remote', 'both'
- `contact` (jsonb) - Contact details: {name, phone, email}
- `files` (jsonb) - File references (default: [])
- `status` (text) - 'open', 'in_progress', 'closed', 'fulfilled'
- `prio` (boolean) - Priority flag (default: false)
- `prioritised_until` (timestamptz) - Priority expiration
- `fulfilled_by` (uuid, FK to profiles) - Provider who fulfilled
- `fulfilled_at` (timestamptz) - Fulfillment timestamp
- `created_at` (timestamptz) - Creation timestamp
- `daily_request_count` (integer) - Connection requests today
- `last_request_reset` (timestamptz) - Request counter reset time

**Constraints:**
- `notes_category_check`: category IN allowed values OR NULL
- `body` NOT NULL

**Indexes:**
- `idx_notes_prio_created` - Priority sorting
- `idx_notes_city_prio` - Location + priority queries
- `idx_notes_status` - Status filtering
- `idx_notes_fulfilled_by` - Provider tracking
- `idx_notes_user_status` - User's notes by status
- `idx_notes_city` - City-based queries (WHERE status = 'open')
- `idx_notes_work_mode` - Work mode filtering (WHERE status = 'open')
- `idx_notes_category` - Category filtering (WHERE status = 'open')
- `idx_notes_prioritised` - Priority notes (WHERE status = 'open')
- `idx_notes_user_id` - User's notes
- `idx_notes_category_city` - Combined filtering (WHERE status = 'open')
- `idx_notes_status_created` - Status + date sorting

**RLS Policies:**
- Owners can view own notes fully
- Users who unlocked can view full details
- Authenticated users can create notes (auth.uid() = user_id)
- Owners can update/delete own notes

**Triggers:**
- `trigger_auto_set_category` - Auto-detect category from body
- `audit_notes_changes` - Audit log all changes
- `enforce_note_rate_limit_trigger` - Rate limiting (10/hour, 50/day)
- `detect_spam_trigger` - Spam detection

---

### 3. note_attachments
**Purpose:** File attachments for notes (public and private)

**Columns:**
- `id` (uuid, PK)
- `note_id` (uuid, FK to notes) - Parent note
- `file_path` (text, required) - Storage path
- `file_name` (text, required) - Original filename
- `file_size` (integer) - File size in bytes
- `mime_type` (text) - File MIME type
- `is_public` (boolean, required) - Public vs private (default: false)
- `created_at` (timestamptz) - Upload timestamp

**Indexes:**
- `idx_note_attachments_note_id` - Note's attachments
- `idx_note_attachments_note_public` - Public files by note

**RLS Policies:**
- Anyone can view public attachments (is_public = true)
- Owners can view all own attachments
- Users who unlocked can view private attachments
- Owners can insert/delete attachments

---

### 4. unlocks
**Purpose:** Track note unlocks (contact info access)

**Columns:**
- `id` (uuid, PK)
- `note_id` (uuid, FK to notes) - Unlocked note
- `freelancer_id` (uuid, FK to profiles) - Vendor who unlocked
- `amount_paid` (numeric) - Amount paid (default: 0.00)
- `unlock_type` (text) - 'beta_free' or 'paid' (default: 'beta_free')
- `payment_status` (text) - 'paid', 'pending', 'failed' (default: 'pending')
- `created_at` (timestamptz) - Unlock timestamp

**Constraints:**
- `unlocks_note_freelancer_unique` - UNIQUE(note_id, freelancer_id)
- `unlock_type` CHECK IN ('beta_free', 'paid')
- `payment_status` CHECK IN ('paid', 'pending', 'failed')

**Indexes:**
- `idx_unlocks_note_id` - Note unlock checks
- `idx_unlocks_freelancer_id` - User unlock history
- `idx_unlocks_created_at` - Revenue reporting
- `idx_unlocks_note` - Fast note lookups
- `idx_unlocks_freelancer` - Fast user lookups

**RLS Policies:**
- Users can view own unlocks (auth.uid() = freelancer_id)
- Note owners can see who unlocked their notes
- Authenticated users can create unlocks (auth.uid() = freelancer_id)

**Triggers:**
- `prevent_self_unlock_trigger` - Prevent unlocking own notes
- `verify_vendor_unlock_trigger` - Only vendors can unlock
- `notify_poster_on_unlock_trigger` - Notify note owner
- `audit_unlocked_leads_changes` - Audit logging

---

### 5. connection_requests
**Purpose:** Request-to-connect system between vendors and clients

**Columns:**
- `id` (uuid, PK)
- `note_id` (uuid, FK to notes) - Target note
- `freelancer_id` (uuid, FK to profiles) - Requesting vendor
- `status` (text) - 'pending', 'approved', 'declined' (default: 'pending')
- `notified` (boolean) - Notification sent flag (default: false)
- `notification_read` (boolean) - Notification read flag (default: false)
- `created_at` (timestamptz) - Request timestamp

**Constraints:**
- UNIQUE(note_id, freelancer_id) - One request per vendor per note
- `status` CHECK IN ('pending', 'approved', 'declined')

**Indexes:**
- `idx_connection_requests_note` - Note's requests
- `idx_connection_requests_freelancer` - User's requests
- `idx_connection_requests_status` - Status filtering

**RLS Policies:**
- Freelancers can view own requests
- Posters can view requests for their notes
- Freelancers can create requests
- Posters can update requests (approve/decline)

**Triggers:**
- `trigger_notify_connection_request` - Notify poster
- `trigger_notify_request_status` - Notify vendor on status change

---

### 6. transactions
**Purpose:** Payment tracking for unlocks and priority posts

**Columns:**
- `id` (uuid, PK)
- `user_id` (uuid, FK to profiles) - Paying user
- `note_id` (uuid, FK to notes) - Related note
- `amount` (integer, required) - Amount in cents
- `kind` (text, required) - 'unlock' or 'prio'
- `status` (text) - 'pending', 'paid', 'failed' (default: 'pending')
- `stripe_id` (text) - Stripe payment ID
- `created_at` (timestamptz) - Transaction timestamp

**Constraints:**
- `kind` CHECK IN ('unlock', 'prio')
- `status` CHECK IN ('pending', 'paid', 'failed')

**Indexes:**
- `idx_transactions_user` - User's transactions
- `idx_transactions_note` - Note's transactions
- `idx_transactions_kind` - Transaction type filtering

**RLS Policies:**
- Users can view own transactions
- Users can create own transactions

---

### 7. notifications
**Purpose:** In-app notification system

**Columns:**
- `id` (uuid, PK)
- `user_id` (uuid, FK to profiles) - Notification recipient
- `type` (text, required) - 'request_received', 'request_approved', 'request_declined', 'note_unlocked', 'note_fulfilled', 'system'
- `title` (text, required) - Notification title
- `message` (text, required) - Notification message
- `link` (text) - Deep link URL
- `read` (boolean) - Read status (default: false)
- `created_at` (timestamptz) - Notification timestamp
- `read_at` (timestamptz) - Read timestamp

**Constraints:**
- `type` CHECK IN allowed notification types

**Indexes:**
- `idx_notifications_user_read_created` - User notifications sorted
- `idx_notifications_user_unread` - Unread count queries (WHERE read = false)

**RLS Policies:**
- Users can view own notifications
- System can create notifications
- Users can update own notifications (mark as read)

---

### 8. notification_preferences
**Purpose:** User notification settings

**Columns:**
- `user_id` (uuid, PK, FK to profiles)
- `email_on_request` (boolean) - Email on connection request (default: true)
- `email_on_approval` (boolean) - Email on request approval (default: true)
- `email_on_unlock` (boolean) - Email on note unlock (default: true)
- `email_on_fulfill` (boolean) - Email on note fulfillment (default: true)
- `push_enabled` (boolean) - Push notifications (default: false)
- `email_digest` (text) - 'instant', 'daily', 'weekly', 'never' (default: 'instant')
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Constraints:**
- `email_digest` CHECK IN ('instant', 'daily', 'weekly', 'never')

**RLS Policies:**
- Users can manage own preferences (all operations)

**Triggers:**
- `trigger_create_notification_prefs` - Auto-create on profile insert

---

### 9. email_queue
**Purpose:** Outbound email queue for batch processing

**Columns:**
- `id` (uuid, PK)
- `to_email` (text, required) - Recipient email
- `subject` (text, required) - Email subject
- `body` (text, required) - Email body
- `template` (text) - Template name
- `data` (jsonb) - Template data
- `status` (text) - 'pending', 'sent', 'failed' (default: 'pending')
- `attempts` (integer) - Retry count (default: 0)
- `error` (text) - Error message if failed
- `created_at` (timestamptz) - Queue timestamp
- `sent_at` (timestamptz) - Sent timestamp

**Constraints:**
- `status` CHECK IN ('pending', 'sent', 'failed')

**Indexes:**
- `idx_email_queue_status_created` - Process pending emails (WHERE status = 'pending')

**Security:** No RLS (edge functions access)

---

### 10. user_activity_logs
**Purpose:** User action tracking and security audit

**Columns:**
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users) - User performing action
- `action` (text, required) - Action description
- `ip_address` (text) - User IP address
- `user_agent` (text) - Browser/device info
- `created_at` (timestamptz) - Action timestamp

**Indexes:**
- `idx_user_activity_logs_user_id` - User activity lookup
- `idx_user_activity_logs_created_at` - Chronological queries

**RLS Policies:**
- Users can view own activity logs

---

### 11. audit_logs
**Purpose:** Universal change tracking for compliance

**Columns:**
- `id` (uuid, PK)
- `table_name` (text, required) - Modified table
- `record_id` (uuid, required) - Modified record ID
- `action` (text, required) - 'INSERT', 'UPDATE', 'DELETE'
- `old_data` (jsonb) - Previous state
- `new_data` (jsonb) - New state
- `changed_by` (uuid, FK to profiles) - User who made change
- `changed_at` (timestamptz) - Change timestamp
- `ip_address` (inet) - User IP
- `user_agent` (text) - User agent

**Constraints:**
- `action` CHECK IN ('INSERT', 'UPDATE', 'DELETE')

**Indexes:**
- `idx_audit_logs_record` - Record history (table_name, record_id, changed_at)
- `idx_audit_logs_user` - User activity (changed_by, changed_at)
- `idx_audit_logs_created` - Chronological (changed_at)

**RLS Policies:**
- Only system can insert (WITH CHECK false)
- Users can view logs for records they changed

**Attached To:**
- profiles, notes, unlocked_leads, payment_history

---

### 12. rate_limits
**Purpose:** Rate limiting and abuse prevention

**Columns:**
- `id` (uuid, PK)
- `user_id` (uuid, FK to profiles) - Tracked user
- `action_type` (text, required) - 'note_create', 'note_update', 'lead_unlock', 'payment_attempt', 'profile_update', 'login_attempt'
- `count` (integer) - Actions in current window (default: 1)
- `window_start` (timestamptz) - Window start time (default: now)
- `last_action` (timestamptz) - Most recent action (default: now)

**Constraints:**
- UNIQUE(user_id, action_type)
- `action_type` CHECK IN allowed types

**Indexes:**
- `idx_rate_limits_user_action` - Rate limit checks
- `idx_rate_limits_window` - Cleanup queries

**RLS Policies:**
- Users can view own rate limits

**Rate Limits:**
- Note creation: 10/hour, 50/day
- Lead unlocking: 20/hour, 100/day
- Profile updates: 5/hour, 20/day
- Payment attempts: 10/hour, 50/day

---

### 13. blocked_users
**Purpose:** User blocks (temporary/permanent)

**Columns:**
- `id` (uuid, PK)
- `user_id` (uuid, FK to profiles) - Blocked user
- `reason` (text, required) - Block reason
- `blocked_until` (timestamptz) - Expiration (NULL = permanent)
- `blocked_by` (text) - 'system' or 'admin' (default: 'system')
- `created_at` (timestamptz) - Block timestamp

**Constraints:**
- UNIQUE(user_id, blocked_until)

**Indexes:**
- `idx_blocked_users_user_until` - Block status checks

**RLS Policies:**
- Users can view own blocks

---

### 14. suspicious_activity
**Purpose:** Flag potential abuse for review

**Columns:**
- `id` (uuid, PK)
- `user_id` (uuid, FK to profiles) - Flagged user
- `activity_type` (text, required) - 'rapid_posting', 'excessive_unlocks', 'failed_payments', 'suspicious_pattern', 'spam_content', 'multiple_accounts'
- `severity` (text) - 'low', 'medium', 'high', 'critical' (default: 'low')
- `details` (jsonb) - Additional context (default: {})
- `resolved` (boolean) - Resolution status (default: false)
- `resolved_at` (timestamptz)
- `resolved_by` (uuid, FK to profiles) - Resolver
- `created_at` (timestamptz)

**Constraints:**
- `activity_type` CHECK IN allowed types
- `severity` CHECK IN ('low', 'medium', 'high', 'critical')

**Indexes:**
- `idx_suspicious_activity_user_resolved` - User flags
- `idx_suspicious_activity_severity` - Priority sorting (WHERE resolved = false)

**RLS Policies:**
- Only system can manage (no user access)

---

## Views

### 1. public_notes_feed
**Purpose:** Safe public listing for anonymous browsing

**Columns Exposed:**
- `id`, `title`, `body`, `category`, `budget`, `city`, `area`
- `prio`, `prioritised_until`, `status`, `created_at`, `updated_at`
- `is_currently_prioritised` (computed)
- `poster_name`, `poster_profession` (from profiles)
- `unlock_count` (computed)

**Columns Hidden:**
- `contact` (PROTECTED)
- `files` (private files)
- `user_id` (partially visible via poster info)

**Access:**
- anon: SELECT
- authenticated: SELECT

**Filtering:**
- Only shows notes WHERE status = 'open'

---

### 2. public_profiles
**Purpose:** Safe public profile view

**Columns Exposed:**
- `id`, `full_name`, `user_type`, `profession`, `skills`, `bio`
- `city`, `industry`, `experience`, `portfolio`
- `active_notes_count` (computed)

**Columns Hidden:**
- `email`, `phone`, `area` (PII)
- System fields

**Access:**
- anon: SELECT
- authenticated: SELECT

---

## Database Functions

### Security Functions

#### 1. can_view_contact_info(note_uuid, user_uuid)
**Purpose:** Check if user can see contact details
**Returns:** boolean
**Logic:** Owner OR has unlock record

#### 2. is_user_blocked(user_uuid)
**Purpose:** Check if user is blocked
**Returns:** boolean
**Security:** SECURITY DEFINER

---

### Unlock Functions

#### 3. unlock_note_beta_free(note_uuid)
**Purpose:** Free unlock during beta phase
**Returns:** jsonb (success status)
**Validations:**
- User must be authenticated
- Note must exist
- Cannot unlock own note
- User must be vendor type
- Prevents duplicate unlocks
**Creates:** unlock record with amount_paid = 0

#### 4. check_user_has_unlocked(note_uuid)
**Purpose:** Check if current user unlocked a note
**Returns:** boolean

#### 5. get_user_unlocked_notes()
**Purpose:** Get all notes current user unlocked
**Returns:** TABLE with full contact info
**Security:** SECURITY DEFINER

---

### Note Functions

#### 6. get_note_details(note_uuid)
**Purpose:** Secure full note access with authorization
**Returns:** jsonb (full note or masked contact)
**Security:** SECURITY DEFINER
**Logic:** Shows contact only if authorized

#### 7. get_my_notes_with_unlock_stats()
**Purpose:** Get current user's notes with statistics
**Returns:** TABLE with unlock_count, view_count
**Security:** SECURITY DEFINER

#### 8. get_prioritised_notes()
**Purpose:** Get currently prioritised notes
**Returns:** TABLE (public feed data)
**Security:** SECURITY DEFINER

#### 9. auto_detect_category(text_content)
**Purpose:** Auto-categorize notes from content
**Returns:** text (category name)
**Used By:** Trigger on notes INSERT/UPDATE

---

### Notification Functions

#### 10. create_notification(user_id, type, title, message, link)
**Purpose:** Create in-app notification
**Returns:** uuid (notification_id)
**Security:** SECURITY DEFINER

#### 11. mark_notifications_read(notification_ids[])
**Purpose:** Bulk mark notifications as read
**Security:** SECURITY DEFINER

#### 12. get_unread_count(user_uuid)
**Purpose:** Get unread notification count
**Returns:** integer
**Security:** SECURITY DEFINER

#### 13. queue_email(to_email, subject, body, template, data)
**Purpose:** Add email to send queue
**Returns:** uuid (email_id)
**Security:** SECURITY DEFINER

---

### Activity Functions

#### 14. log_user_activity(user_id, action, ip_address, user_agent)
**Purpose:** Log user actions
**Returns:** uuid (log_id)
**Security:** SECURITY DEFINER

#### 15. get_user_activity_summary(user_id, days)
**Purpose:** Activity summary for period
**Returns:** TABLE (action_type, count, last_occurrence)
**Security:** SECURITY DEFINER

---

### Audit Functions

#### 16. get_recent_changes(table_name, record_id, limit)
**Purpose:** Get audit history for record
**Returns:** TABLE (action, changed_at, changed_by, old_data, new_data)
**Security:** SECURITY DEFINER

---

### Rate Limiting Functions

#### 17. check_rate_limit(user_id, action_type, hourly_limit, daily_limit)
**Purpose:** Check and enforce rate limits
**Returns:** boolean
**Security:** SECURITY DEFINER

#### 18. flag_suspicious_activity(user_id, activity_type, severity, details)
**Purpose:** Flag potential abuse
**Returns:** uuid (flag_id)
**Security:** SECURITY DEFINER
**Auto-blocks:** Critical flags trigger 24h block

---

### Admin Functions

#### 19. block_user(user_id, reason, duration_hours)
**Purpose:** Manually block user
**Returns:** uuid (block_id)
**Security:** SECURITY DEFINER

#### 20. unblock_user(user_id)
**Purpose:** Remove user block
**Returns:** integer (deleted count)
**Security:** SECURITY DEFINER

#### 21. get_blocked_users()
**Purpose:** List all blocked users
**Returns:** TABLE
**Security:** SECURITY DEFINER

#### 22. get_suspicious_activity_report()
**Purpose:** Security dashboard data
**Returns:** TABLE (grouped by severity)
**Security:** SECURITY DEFINER

#### 23. get_unlock_revenue_report(days)
**Purpose:** Revenue analytics
**Returns:** jsonb (admin only)
**Security:** SECURITY DEFINER

---

### Cleanup Functions

#### 24. cleanup_old_audit_logs(retention_days)
**Purpose:** Delete old audit logs
**Returns:** integer (deleted count)
**Default:** 365 days retention

#### 25. cleanup_old_activity_logs(retention_days)
**Purpose:** Delete old activity logs
**Returns:** integer (deleted count)
**Default:** 180 days retention

#### 26. reset_rate_limits()
**Purpose:** Daily cleanup of stale rate limits
**Returns:** integer (deleted count)

#### 27. cleanup_expired_blocks()
**Purpose:** Remove expired temporary blocks
**Returns:** integer (deleted count)

---

## Triggers

### Profile Triggers

1. **profiles_last_active_trigger**
   - Event: BEFORE UPDATE
   - Function: update_last_active()
   - Purpose: Auto-update last_active timestamp

2. **trigger_create_notification_prefs**
   - Event: AFTER INSERT
   - Function: create_default_notification_preferences()
   - Purpose: Create default notification settings

3. **audit_profiles_changes**
   - Event: AFTER INSERT/UPDATE/DELETE
   - Function: audit_trigger_function()
   - Purpose: Audit logging

4. **enforce_profile_rate_limit_trigger**
   - Event: BEFORE UPDATE
   - Function: enforce_profile_update_rate_limit()
   - Purpose: Rate limiting (5/hour, 20/day)

---

### Note Triggers

5. **trigger_auto_set_category**
   - Event: BEFORE INSERT/UPDATE OF body
   - Function: auto_set_category()
   - Purpose: Auto-detect category from content

6. **audit_notes_changes**
   - Event: AFTER INSERT/UPDATE/DELETE
   - Function: audit_trigger_function()
   - Purpose: Audit logging

7. **enforce_note_rate_limit_trigger**
   - Event: BEFORE INSERT
   - Function: enforce_note_rate_limit()
   - Purpose: Rate limiting (10/hour, 50/day)

8. **detect_spam_trigger**
   - Event: BEFORE INSERT
   - Function: detect_spam_content()
   - Purpose: Spam detection and blocking

---

### Unlock Triggers

9. **prevent_self_unlock_trigger**
   - Event: BEFORE INSERT
   - Function: prevent_self_unlock()
   - Purpose: Prevent users unlocking own notes

10. **verify_vendor_unlock_trigger**
    - Event: BEFORE INSERT
    - Function: verify_vendor_unlock()
    - Purpose: Only vendors can unlock

11. **notify_poster_on_unlock_trigger**
    - Event: AFTER INSERT (WHEN payment_status = 'paid')
    - Function: notify_poster_on_unlock()
    - Purpose: Notify note owner of unlock

12. **audit_unlocked_leads_changes**
    - Event: AFTER INSERT/UPDATE/DELETE
    - Function: audit_trigger_function()
    - Purpose: Audit logging

13. **enforce_unlock_rate_limit_trigger**
    - Event: BEFORE INSERT
    - Function: enforce_unlock_rate_limit()
    - Purpose: Rate limiting (20/hour, 100/day)

---

### Connection Request Triggers

14. **trigger_notify_connection_request**
    - Event: AFTER INSERT
    - Function: notify_connection_request()
    - Purpose: Notify poster of new request

15. **trigger_notify_request_status**
    - Event: AFTER UPDATE OF status
    - Function: notify_request_status_change()
    - Purpose: Notify vendor of approval/decline

---

### Payment Triggers

16. **audit_payment_history_changes**
    - Event: AFTER INSERT/UPDATE/DELETE
    - Function: audit_trigger_function()
    - Purpose: Audit logging

17. **enforce_payment_rate_limit_trigger**
    - Event: BEFORE INSERT
    - Function: enforce_payment_rate_limit()
    - Purpose: Rate limiting (10/hour, 50/day)

---

## Security Model

### Row Level Security (RLS)

**All tables have RLS ENABLED**

### Anonymous User Access
- Can SELECT from: `public_notes_feed`, `public_profiles`
- Cannot access raw tables
- Cannot perform mutations

### Authenticated User Access
- Can view own records across all tables
- Can create records where they are the owner
- Can update/delete only own records
- Special unlock access to notes they've unlocked

### Contact Information Protection
- Contact field NEVER exposed in public views
- Only visible to: note owner OR users with unlock record
- Enforced through: view layer + RPC + RLS

### Admin Access
- Full access to audit logs, suspicious activity, blocked users
- Revenue reports and analytics
- User management functions

---

## Performance Optimizations

### Critical Indexes
- All foreign keys indexed
- Composite indexes for common queries
- Partial indexes (WHERE clauses) for filtered queries
- Status-based indexes for open notes
- Chronological indexes for feeds and logs

### Query Patterns
- Use views for public data access
- Use RPCs for complex authorization logic
- Batch notifications via triggers
- Rate limiting before data commits

---

## Data Validation

### Server-Side Validation
- Email format validation
- Password strength requirements
- Budget/amount ranges
- Text length constraints
- Array size limits
- Category enumerations

### Business Rules
- Vendors can only unlock client notes
- Cannot unlock own notes
- One unlock per vendor per note
- Rate limits per action type
- Spam content detection
- Automated blocking for critical flags

---

## Backup and Recovery

### Audit Trail
- All critical table changes logged in `audit_logs`
- 365-day retention for audit logs
- 180-day retention for activity logs
- Full record state (old_data, new_data)

### Cleanup Jobs
- Daily: reset_rate_limits()
- Daily: cleanup_expired_blocks()
- Weekly: cleanup_old_activity_logs()
- Monthly: cleanup_old_audit_logs()

---

## Edge Functions Integration

### Required Environment Variables
- SUPABASE_URL (auto-provided)
- SUPABASE_ANON_KEY (auto-provided)
- SUPABASE_SERVICE_ROLE_KEY (auto-provided)

### Database Access
- Edge functions use service role for elevated access
- Can insert into email_queue
- Can call SECURITY DEFINER functions
- Can bypass RLS for system operations

---

## Migration Strategy

### Migration File Format
```sql
/*
  # Migration Title

  ## Summary
  Plain English description of changes

  ## Changes
  1. New Tables
     - table_name (columns)
  2. Modified Tables
     - Changes made
  3. Security
     - RLS policies
     - Triggers

  ## Notes
  Important implementation details
*/

-- SQL with IF EXISTS checks
-- Safe for re-running
-- No data loss
```

### Deployment Safety
- All DDL uses IF EXISTS / IF NOT EXISTS
- Policies dropped before recreation
- No destructive operations
- Backwards compatible
- Zero downtime

---

## Authentication Integration

### Supabase Auth
- Email/password authentication
- Email confirmation disabled by default
- Password reset flow via email
- Session management
- User activity logging on auth events

### Profile Creation
- Profile auto-created on signup
- Default notification preferences set
- User type set based on onboarding

---

## Storage Integration

### Buckets Needed
1. **note-attachments** - Note files
   - Public files: is_public = true
   - Private files: requires unlock

2. **profile-portfolios** - User portfolios
   - Public for verified users

### Storage Policies
- Match note_attachments RLS policies
- Verify unlock status before serving private files
- Public bucket for public files
- Private bucket for sensitive files

---

## Monitoring and Health

### Key Metrics
- Unlock conversion rate
- Note posting rate
- Spam detection rate
- Rate limit violations
- Blocked user count
- Active users (last_active)

### Health Checks
- Database connection
- RLS policy coverage
- Audit log growth
- Email queue backlog
- Suspicious activity flags

---

## Development vs Production

### Development
- Relaxed rate limits
- Verbose audit logging
- Test data isolation
- Email queue visible

### Production
- Strict rate limits enforced
- Audit log retention policies active
- Automated cleanup jobs running
- Email sending enabled
- Monitoring alerts configured

---

## Summary of Requirements

**Total Tables:** 14 core tables
**Total Indexes:** 50+ optimized indexes
**Total Functions:** 27 database functions
**Total Triggers:** 17 automated triggers
**Total Views:** 2 public-safe views
**Total Policies:** 60+ RLS policies

**Security Level:** Production-ready
**Compliance:** Audit trail enabled
**Performance:** Optimized for scale
**Data Protection:** Contact info secured
**Abuse Prevention:** Rate limiting + spam detection
