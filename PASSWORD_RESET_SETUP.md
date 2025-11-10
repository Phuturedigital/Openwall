# Password Reset Flow - Complete Setup Guide

## ✅ What's Already Implemented

The password reset functionality is **fully implemented** in the codebase:

### Frontend Components
- ✅ **Reset Password Page** (`src/components/ResetPassword.tsx`)
  - Beautiful UI with password strength indicator
  - Validation for new password
  - Confirm password matching
  - Success/error states
  - Auto-redirect after success

- ✅ **Auth Modal** (`src/components/EnhancedAuthModal.tsx`)
  - "Forgot password?" link on sign-in
  - Reset password mode with email input
  - Sends password reset email via Supabase

- ✅ **Router** (`src/components/Router.tsx`)
  - Routes `/reset-password` to reset page
  - Handles `type=recovery` hash parameter from email

- ✅ **Auth Context** (`src/contexts/AuthContext.tsx`)
  - `resetPassword()` function
  - Configures redirect URL automatically
  - Works for localhost and production

### Infrastructure
- ✅ **_redirects file** (`public/_redirects`)
  - Ensures `/reset-password` route works on deployment
  - Required for SPA routing on Netlify/Vercel

---

## 🔧 Required Supabase Configuration

To make password reset emails work, you need to configure the redirect URLs in your Supabase dashboard:

### Step 1: Add Redirect URLs

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **URL Configuration**
3. Under **Redirect URLs**, add:
   - `http://localhost:5173/reset-password` (for local testing)
   - `https://yourdomain.com/reset-password` (for production)
   - Any other domains you use (staging, etc.)

### Step 2: Configure Email Template (Optional)

1. Go to **Authentication** → **Email Templates**
2. Select **Reset Password**
3. Customize the email subject and body if desired
4. The default template includes a "Reset Password" button that links to your redirect URL

**Default Variables Available:**
- `{{ .ConfirmationURL }}` - The reset link users click
- `{{ .SiteURL }}` - Your site URL
- `{{ .TokenHash }}` - The secure token

---

## 🔄 How It Works

### User Flow

1. **User clicks "Forgot password?"** on sign-in modal
2. **Enters their email** in the reset form
3. **Clicks "Send Reset Link"**
4. **Supabase sends email** with reset link
5. **User clicks link in email** → redirected to `/reset-password?token=...`
6. **User enters new password** (with validation)
7. **Password updated** → redirected to home with success message

### Technical Flow

```
User clicks "Forgot password?"
    ↓
EnhancedAuthModal switches to 'reset' mode
    ↓
User enters email and submits
    ↓
AuthContext.resetPassword() calls supabase.auth.resetPasswordForEmail()
    ↓
Supabase sends email with link: yourdomain.com/reset-password#type=recovery&token=...
    ↓
Router detects type=recovery and shows ResetPassword component
    ↓
User enters new password
    ↓
ResetPassword calls supabase.auth.updateUser({ password })
    ↓
Password updated, user redirected to home
```

---

## 🧪 Testing the Flow

### Local Testing

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Test reset flow:**
   - Click "Sign In" → "Forgot password?"
   - Enter your test email
   - Click "Send Reset Link"
   - Check your email inbox
   - Click the reset link
   - Should redirect to `http://localhost:5173/reset-password`
   - Enter new password and confirm
   - Submit and verify password is updated

3. **Verify redirect URL:**
   - Make sure `http://localhost:5173/reset-password` is in Supabase redirect URLs
   - Without this, the email link won't work

### Production Testing

1. **Deploy your app** to your hosting platform

2. **Add production URL** to Supabase:
   - `https://yourdomain.com/reset-password`

3. **Test the same flow** on production

---

## 🎨 UI/UX Features

### Reset Password Page Includes:

- ✅ **Password validation** (8+ chars, capital, number, symbol)
- ✅ **Password strength meter** (weak/medium/strong)
- ✅ **Show/hide password toggles**
- ✅ **Confirm password matching**
- ✅ **Real-time validation feedback**
- ✅ **Loading states**
- ✅ **Error handling** (expired link, network errors, etc.)
- ✅ **Success animation**
- ✅ **Auto-redirect after 3 seconds**
- ✅ **Fully responsive design**
- ✅ **Dark mode support**
- ✅ **Accessibility (ARIA labels)**

---

## 🔒 Security Features

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character

### Security Measures
- ✅ Reset tokens expire after 1 hour (Supabase default)
- ✅ Tokens are single-use only
- ✅ Password validation on client and server
- ✅ Secure password hashing by Supabase (bcrypt)
- ✅ Can't use same password (Supabase prevents this)
- ✅ Rate limiting on email sends (3 per hour)

---

## 🚨 Common Issues & Solutions

### Issue 1: Email Link Not Working
**Symptoms:** User clicks link, gets 404 or nothing happens

**Solutions:**
1. Check redirect URL is added in Supabase dashboard
2. Verify `public/_redirects` file exists
3. Make sure Router.tsx handles `type=recovery`
4. Check URL format matches exactly

### Issue 2: "Invalid or Expired Link"
**Symptoms:** User gets error when submitting new password

**Solutions:**
1. Reset tokens expire after 1 hour - request new link
2. Tokens are single-use - can't reuse same link
3. Check user is on the correct reset page
4. Verify Supabase auth is working

### Issue 3: Not Receiving Email
**Symptoms:** User doesn't get reset email

**Solutions:**
1. Check spam/junk folder
2. Verify email address is correct
3. Check Supabase email quota (500/hour on free tier)
4. Check Supabase email logs in dashboard
5. Verify email provider settings in Supabase

### Issue 4: Redirect Goes to Wrong URL
**Symptoms:** Email link redirects to wrong domain

**Solutions:**
1. Check AuthContext.tsx `resetPassword()` function
2. Verify redirect URL logic: localhost vs production
3. Update Supabase redirect URLs for all environments

---

## 📋 Deployment Checklist

### Before Deploying

- [x] ResetPassword component exists
- [x] Router handles `/reset-password` route
- [x] AuthContext has `resetPassword()` function
- [x] Auth modal has "Forgot password?" link
- [x] `public/_redirects` file created
- [ ] Production URL added to Supabase redirect URLs

### After Deploying

- [ ] Test forgot password flow on production
- [ ] Verify email arrives with correct link
- [ ] Test clicking email link redirects correctly
- [ ] Test password update works
- [ ] Test error handling (expired link, weak password, etc.)
- [ ] Check email logs in Supabase dashboard

---

## 🎯 Environment-Specific Configuration

### Local Development
```
Redirect URL: http://localhost:5173/reset-password
```

### Staging/Preview
```
Redirect URL: https://staging.yourdomain.com/reset-password
```

### Production
```
Redirect URL: https://yourdomain.com/reset-password
```

**Important:** Add ALL URLs you'll use to Supabase dashboard

---

## 📧 Email Template Customization

Default email template works out of the box, but you can customize:

### Subject Line
```
Reset Your Password for Openwall
```

### Email Body Example
```html
<h2>Reset Your Password</h2>
<p>Hi there!</p>
<p>We received a request to reset your password for your Openwall account.</p>
<p>Click the button below to choose a new password:</p>
<a href="{{ .ConfirmationURL }}">Reset Password</a>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

---

## 🔧 Advanced Configuration

### Custom Token Expiry

In Supabase dashboard:
1. Go to **Authentication** → **Settings**
2. Find **JWT Expiry** settings
3. Default is 3600 seconds (1 hour)
4. Adjust as needed

### Rate Limiting

Supabase default: **3 emails per hour per email address**

This prevents abuse and spam. Can't be changed on free tier.

---

## ✅ Testing Checklist

### Functional Tests
- [ ] User can request password reset
- [ ] Email arrives within 1 minute
- [ ] Email link opens reset page
- [ ] New password can be set
- [ ] User can log in with new password
- [ ] Old password no longer works
- [ ] Can't use same password again
- [ ] Expired link shows error
- [ ] Invalid token shows error

### UI/UX Tests
- [ ] Password strength indicator works
- [ ] Validation messages appear correctly
- [ ] Loading states display properly
- [ ] Success message shows after update
- [ ] Auto-redirect works after 3 seconds
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] Keyboard navigation works

### Security Tests
- [ ] Token expires after 1 hour
- [ ] Token is single-use
- [ ] Password meets requirements
- [ ] Rate limiting prevents spam
- [ ] No password visible in logs
- [ ] HTTPS enforced in production

---

## 📊 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Reset Password Page | ✅ Complete | Fully implemented |
| Email Integration | ✅ Complete | Uses Supabase |
| Router Configuration | ✅ Complete | Handles recovery type |
| Auth Context | ✅ Complete | Has resetPassword() |
| Redirect File | ✅ Complete | SPA routing works |
| Supabase Setup | ⚠️ Manual | Add redirect URLs |
| Email Template | ✅ Default | Can customize |
| Testing | ⚠️ Manual | Test after setup |

---

## 🚀 Quick Start

**For the password reset to work immediately:**

1. **Add redirect URL to Supabase** (5 minutes)
   - Dashboard → Authentication → URL Configuration
   - Add: `http://localhost:5173/reset-password`
   - Add: `https://yourdomain.com/reset-password`

2. **Test locally** (2 minutes)
   - `npm run dev`
   - Click "Sign In" → "Forgot password?"
   - Enter email → Send reset link
   - Check email and click link
   - Reset password

3. **Deploy and test production** (10 minutes)
   - Deploy app
   - Verify production URL in Supabase
   - Test full flow on production

**That's it!** Password reset is fully functional.

---

## 📞 Support

If you encounter issues:

1. Check Supabase email logs: Dashboard → Logs → Auth
2. Verify redirect URLs are correct
3. Check browser console for errors
4. Test with different email provider
5. Review this documentation

---

**Status:** ✅ Password Reset Fully Implemented
**Action Required:** Add redirect URLs to Supabase dashboard
**Estimated Time:** 5 minutes
