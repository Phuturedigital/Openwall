/*
  # Add Performance Indexes for 5000+ User Scale

  ## Changes
  1. Add composite indexes for common query patterns
  2. Add indexes for connection_requests filtering
  3. Add indexes for notes listing and filtering
  4. Add index for profile lookups by email
  5. Ensure all foreign keys have proper indexes

  ## Performance Impact
  - Speeds up Wall view note queries (status + created_at)
  - Speeds up connection request lookups (note_id + status)
  - Speeds up profile searches
  - Optimizes JOIN operations
  - Reduces query time for 5000+ concurrent users

  ## Security
  - No security changes, only performance improvements
*/

-- Index for notes wall view queries (public viewing, sorted by prio and date)
CREATE INDEX IF NOT EXISTS idx_notes_status_prio_created 
ON notes(status, prio DESC, created_at DESC)
WHERE status = 'open';

-- Index for connection requests with status filtering
CREATE INDEX IF NOT EXISTS idx_connection_requests_note_status 
ON connection_requests(note_id, status);

-- Index for connection requests by status (for counting pending requests)
CREATE INDEX IF NOT EXISTS idx_connection_requests_status 
ON connection_requests(status) 
WHERE status = 'pending';

-- Index for profiles email lookup (for admin/search features)
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email);

-- Index for profiles by role (filtering freelancers vs posters)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role);

-- Index for notes by city (location-based filtering)
CREATE INDEX IF NOT EXISTS idx_notes_city 
ON notes(city) 
WHERE city IS NOT NULL AND status = 'open';

-- Index for unlocks with payment status (for payment processing)
CREATE INDEX IF NOT EXISTS idx_unlocks_payment_status 
ON unlocks(payment_status, created_at);

-- Index for transactions by kind and status (for reporting)
CREATE INDEX IF NOT EXISTS idx_transactions_kind_status 
ON transactions(kind, status);

-- Composite index for user's active notes
CREATE INDEX IF NOT EXISTS idx_notes_user_status_created 
ON notes(user_id, status, created_at DESC);

-- Index for connection requests notification queries
CREATE INDEX IF NOT EXISTS idx_connection_requests_freelancer_notified 
ON connection_requests(freelancer_id, notified, created_at DESC)
WHERE notified = false;
