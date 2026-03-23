# Database Quick Reference Guide

## For Developers: How to Use the Secure Database

---

## Query Cheat Sheet

### Browse Notes (Anonymous Safe)

```typescript
// ✅ USE THIS: Public view (safe for everyone)
const { data } = await supabase
  .from('public_notes_feed')
  .select('*')
  .limit(50);

// Returns: title, body, budget, city (NO CONTACT INFO)
```

### Get Full Note Details

```typescript
// ✅ USE THIS: Secure function with conditional access
const { data } = await supabase
  .rpc('get_note_details', { p_note_id: noteId });

// Returns:
// - Full note information
// - Contact masked if not authorized
// - Contact revealed if owner OR unlocked
```

### Unlock Note (Beta-Free)

```typescript
// ✅ USE THIS: Beta-free unlock function
const { data } = await supabase
  .rpc('unlock_note_beta_free', { p_note_id: noteId });

if (data.success) {
  console.log('Unlocked!', data.unlock_id);
  // Now call get_note_details() again to see contact
} else {
  console.error(data.error);
}
```

### Check If User Already Unlocked

```typescript
// ✅ USE THIS: Quick boolean check
const { data } = await supabase
  .rpc('check_user_has_unlocked', { p_note_id: noteId });

if (data === true) {
  // Show "View Contact" button
} else {
  // Show "Unlock Contact" button
}
```

### Get My Unlocked Notes

```typescript
// ✅ USE THIS: All notes I've unlocked
const { data } = await supabase
  .rpc('get_user_unlocked_notes');

// Returns: Array of notes with FULL contact info
// Only includes notes current user has unlocked
```

### Get My Posted Notes

```typescript
// ✅ USE THIS: My notes with stats
const { data } = await supabase
  .rpc('get_my_notes_with_unlock_stats');

// Returns: Your notes with unlock counts
// Shows how many vendors unlocked each note
```

### Create New Note

```typescript
// ✅ USE THIS: Standard insert
const { data } = await supabase
  .from('notes')
  .insert({
    user_id: currentUserId,
    title: 'Plumber needed',
    body: 'Need experienced plumber for bathroom renovation...',
    category: 'Home Services',
    budget: 2000,
    city: 'Cape Town',
    contact: {
      name: 'John Doe',
      phone: '+27123456789',
      email: 'john@example.com'
    }
  })
  .select()
  .single();

// Contact info is protected by RLS automatically
```

### Prioritise Note (Boost)

```typescript
// ✅ USE THIS: Make note appear first
const { data } = await supabase
  .from('notes')
  .update({
    prio: true,
    prioritised_until: new Date(Date.now() + 7*24*60*60*1000).toISOString()
  })
  .eq('id', noteId)
  .eq('user_id', currentUserId);

// Note will appear at top of listings for 7 days
// After 7 days, automatically returns to normal position
```

### View Public Profiles

```typescript
// ✅ USE THIS: Safe profile view (no PII)
const { data } = await supabase
  .from('public_profiles')
  .select('*')
  .eq('id', userId);

// Returns: name, profession, bio, skills, city
// Hides: email, phone
```

---

## Common Patterns

### Pattern 1: Note Card Component

```typescript
// Display note in listing
function NoteCard({ note }) {
  // note comes from public_notes_feed
  return (
    <div>
      <h3>{note.title}</h3>
      <p>{note.body}</p>
      <p>Budget: R{note.budget}</p>
      <p>Location: {note.city}</p>
      <p>Posted by: {note.poster_name}</p>
      {note.is_currently_prioritised && <Badge>Featured</Badge>}

      {/* NO contact info visible here */}
      <button onClick={() => viewDetails(note.id)}>
        View Details
      </button>
    </div>
  );
}
```

### Pattern 2: Note Details Page

```typescript
async function NoteDetailsPage({ noteId }) {
  const { data: note } = await supabase
    .rpc('get_note_details', { p_note_id: noteId });

  const hasUnlocked = note.has_unlocked;
  const isOwner = note.is_owner;

  return (
    <div>
      <h1>{note.title}</h1>
      <p>{note.body}</p>
      <p>Budget: R{note.budget}</p>

      {/* Contact section - conditional */}
      {(hasUnlocked || isOwner) ? (
        <div>
          <h3>Contact Information</h3>
          <p>Name: {note.contact.name}</p>
          <p>Phone: {note.contact.phone}</p>
          <p>Email: {note.contact.email}</p>
        </div>
      ) : (
        <button onClick={() => handleUnlock(noteId)}>
          Unlock Contact (Free)
        </button>
      )}
    </div>
  );
}
```

### Pattern 3: Unlock Handler

```typescript
async function handleUnlock(noteId: string) {
  try {
    const { data } = await supabase
      .rpc('unlock_note_beta_free', { p_note_id: noteId });

    if (!data.success) {
      toast.error(data.error);
      return;
    }

    if (data.already_unlocked) {
      toast.info('You already unlocked this note');
    } else {
      toast.success('Contact unlocked!');
    }

    // Refresh note details to show contact
    refreshNoteDetails();

  } catch (error) {
    toast.error('Failed to unlock note');
    console.error(error);
  }
}
```

### Pattern 4: My Notes Dashboard

```typescript
async function MyNotesDashboard() {
  const { data: notes } = await supabase
    .rpc('get_my_notes_with_unlock_stats');

  return (
    <div>
      {notes.map(note => (
        <div key={note.id}>
          <h3>{note.title}</h3>
          <p>{note.body}</p>
          <Badge>{note.unlock_count} unlocks</Badge>
          {note.prio && <Badge>Prioritised</Badge>}

          <button onClick={() => editNote(note.id)}>Edit</button>
          <button onClick={() => boostNote(note.id)}>Boost</button>
        </div>
      ))}
    </div>
  );
}
```

---

## Don'ts (Common Mistakes)

### ❌ DON'T Query Raw Notes Table Directly

```typescript
// ❌ WRONG: RLS will block most results
const { data } = await supabase
  .from('notes')
  .select('*');

// Only returns notes you own or unlocked
// Anonymous users get empty array
```

### ❌ DON'T Expose Contact Info in UI

```typescript
// ❌ WRONG: Shows contact before unlock
<div>
  {note.contact?.phone}
</div>

// ✅ CORRECT: Check authorization first
{(note.has_unlocked || note.is_owner) && (
  <div>{note.contact?.phone}</div>
)}
```

### ❌ DON'T Bypass Security Functions

```typescript
// ❌ WRONG: Trying to manually check unlocks
const { data: unlocks } = await supabase
  .from('unlocks')
  .select('*')
  .eq('note_id', noteId);

// ✅ CORRECT: Use provided function
const hasUnlocked = await supabase
  .rpc('check_user_has_unlocked', { p_note_id: noteId });
```

### ❌ DON'T Create Unlocks Manually

```typescript
// ❌ WRONG: Bypasses validation
await supabase
  .from('unlocks')
  .insert({ note_id, freelancer_id });

// ✅ CORRECT: Use secure function
await supabase
  .rpc('unlock_note_beta_free', { p_note_id: noteId });
```

---

## Function Reference

| Function | Purpose | Access | Returns |
|----------|---------|--------|---------|
| `get_note_details(uuid)` | Full note with conditional contact | anon, auth | jsonb |
| `unlock_note_beta_free(uuid)` | Unlock note (beta-free) | auth | jsonb |
| `check_user_has_unlocked(uuid)` | Check unlock status | auth | boolean |
| `get_user_unlocked_notes()` | My unlocked notes | auth | table |
| `get_my_notes_with_unlock_stats()` | My notes with stats | auth | table |
| `get_prioritised_notes()` | Active priority notes | anon, auth | table |
| `can_view_contact_info(uuid, uuid)` | Authorization check | auth | boolean |

---

## View Reference

| View | Purpose | Access | Includes Contact? |
|------|---------|--------|-------------------|
| `public_notes_feed` | Safe note listing | anon, auth | ❌ No |
| `public_profiles` | Safe profile view | anon, auth | ❌ No |

---

## Table Reference

| Table | RLS | Purpose | Direct Access |
|-------|-----|---------|---------------|
| `notes` | ✅ | Service requests | ⚠️ Owners + unlocked only |
| `profiles` | ✅ | User accounts | ⚠️ Own profile only |
| `unlocks` | ✅ | Unlock records | ⚠️ Own unlocks only |
| `note_attachments` | ✅ | Files | ⚠️ Public + authorized only |
| `payment_history` | ✅ | Payments | ⚠️ Own payments only |

**⚠️ Warning**: Direct table access is restricted by RLS. Use views and functions for public data.

---

## Error Codes

When `unlock_note_beta_free()` fails:

| Code | Error Message | Cause | Solution |
|------|---------------|-------|----------|
| `AUTH_REQUIRED` | You must be logged in | User not authenticated | Show login modal |
| `NOT_FOUND` | Note not found | Invalid note ID | Check note exists |
| `SELF_UNLOCK` | You cannot unlock your own note | Owner tried to unlock | Disable button for own notes |
| `INVALID_USER_TYPE` | Only vendors can unlock notes | Client tried to unlock | Show "Vendors only" message |

---

## Performance Tips

1. **Use indexes**: All common queries are indexed automatically
2. **Limit results**: Always use `.limit()` on queries
3. **Cache public feed**: Cache public_notes_feed for 1-5 minutes
4. **Batch operations**: Use bulk inserts when possible
5. **Use maybeSingle()**: For 0-1 row queries instead of single()

---

## Need Help?

**Full Technical Documentation**: `DATABASE_TECHNICAL_SPEC.md`
**Security Summary**: `DATABASE_SECURITY_SUMMARY.md`
**This Quick Reference**: `DATABASE_QUICK_REFERENCE.md`

**Common Issues**:
- Contact not visible? → Check if user has unlocked
- Can't unlock note? → Check user is vendor, not owner
- Empty results? → Use public_notes_feed view, not raw notes table
- Slow queries? → Check indexes with EXPLAIN ANALYZE
