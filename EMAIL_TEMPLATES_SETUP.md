# Email Templates Setup for Openwall

This document contains all custom HTML email templates that need to be configured in Supabase Auth.

## Configuration Location

Go to: **Supabase Dashboard → Authentication → Email Templates**

---

## 1. Email Verification (Confirm signup)

**Subject:** `Verify your Openwall account`

**Template:**

```html
<!doctype html>
<html lang="en" style="margin:0;padding:0;background:#F8FAFC;">
  <head>
    <meta charset="utf-8">
    <title>Verify your Openwall account</title>
    <style>
      .btn{background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;font-weight:600}
      .muted{color:#6B7280}
    </style>
  </head>
  <body style="margin:0;padding:0;background:#F8FAFC;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:14px;padding:32px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
            <tr><td><h1 style="font-size:22px;color:#0F172A;margin:0 0 16px 0;">Welcome to Openwall</h1>
              <p style="font-size:14px;color:#111827;margin:0 0 24px 0;">Thanks for joining! Please confirm your email address to activate your account.</p>
              <p style="margin:24px 0;">
                <a class="btn" href="{{ .ConfirmationURL }}">Verify Email</a>
              </p>
              <p class="muted" style="font-size:12px;margin:24px 0 0 0;">If you didn't create an account, you can safely ignore this email.</p>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
              <p style="font-size:12px;color:#6B7280;margin:0;">© 2025 Phuture Digital. All rights reserved.</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 2. Password Reset (Reset password)

**Subject:** `Reset your Openwall password`

**Template:**

```html
<!doctype html>
<html lang="en" style="margin:0;padding:0;background:#F8FAFC;">
  <head>
    <meta charset="utf-8">
    <title>Reset your Openwall password</title>
    <style>
      .btn{background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;font-weight:600}
      .muted{color:#6B7280}
    </style>
  </head>
  <body style="margin:0;padding:0;background:#F8FAFC;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:14px;padding:32px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
            <tr><td><h1 style="font-size:22px;color:#0F172A;margin:0 0 16px 0;">Reset your password</h1>
              <p style="font-size:14px;color:#111827;margin:0 0 24px 0;">We received a request to reset your password. Click the button below to create a new password.</p>
              <p style="margin:24px 0;">
                <a class="btn" href="{{ .ConfirmationURL }}">Reset Password</a>
              </p>
              <p class="muted" style="font-size:12px;margin:24px 0 0 0;">If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour.</p>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
              <p style="font-size:12px;color:#6B7280;margin:0;">© 2025 Phuture Digital. All rights reserved.</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 3. Change Email (Confirm email change)

**Subject:** `Confirm your new Openwall email`

**Template:**

```html
<!doctype html>
<html lang="en" style="margin:0;padding:0;background:#F8FAFC;">
  <head>
    <meta charset="utf-8">
    <title>Confirm your new Openwall email</title>
    <style>
      .btn{background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;font-weight:600}
      .muted{color:#6B7280}
    </style>
  </head>
  <body style="margin:0;padding:0;background:#F8FAFC;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:14px;padding:32px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
            <tr><td><h1 style="font-size:22px;color:#0F172A;margin:0 0 16px 0;">Confirm your new email address</h1>
              <p style="font-size:14px;color:#111827;margin:0 0 24px 0;">We received a request to change your Openwall email to this address. Click below to confirm.</p>
              <p style="margin:24px 0;">
                <a class="btn" href="{{ .ConfirmationURL }}">Confirm New Email</a>
              </p>
              <p class="muted" style="font-size:12px;margin:24px 0 0 0;">If you didn't request this change, you can safely ignore this email.</p>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
              <p style="font-size:12px;color:#6B7280;margin:0;">© 2025 Phuture Digital. All rights reserved.</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 4. Magic Link (Optional - if enabled)

**Subject:** `Your Openwall sign-in link`

**Template:**

```html
<!doctype html>
<html lang="en" style="margin:0;padding:0;background:#F8FAFC;">
  <head>
    <meta charset="utf-8">
    <title>Your Openwall sign-in link</title>
    <style>
      .btn{background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;font-weight:600}
      .muted{color:#6B7280}
    </style>
  </head>
  <body style="margin:0;padding:0;background:#F8FAFC;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:14px;padding:32px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
            <tr><td><h1 style="font-size:22px;color:#0F172A;margin:0 0 16px 0;">Sign in to Openwall</h1>
              <p style="font-size:14px;color:#111827;margin:0 0 24px 0;">Click the button below to sign in to your account.</p>
              <p style="margin:24px 0;">
                <a class="btn" href="{{ .ConfirmationURL }}">Sign In</a>
              </p>
              <p class="muted" style="font-size:12px;margin:24px 0 0 0;">If you didn't request this link, you can safely ignore this email. This link will expire in 1 hour.</p>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
              <p style="font-size:12px;color:#6B7280;margin:0;">© 2025 Phuture Digital. All rights reserved.</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## Available Variables

Supabase provides these variables for email templates:

- `{{ .ConfirmationURL }}` - The main action URL (verification, reset, etc.)
- `{{ .Token }}` - The verification token
- `{{ .TokenHash }}` - The hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - The user's email address

---

## Email Configuration Settings

### In Supabase Dashboard → Settings → Auth

1. **Enable Email Confirmations**: ON (recommended)
2. **Secure Email Change**: ON (requires confirmation from both old and new email)
3. **Redirect URLs**: Add your app URLs
   - `http://localhost:5173/reset-password` (development)
   - `https://your-domain.com/reset-password` (production)
   - `http://localhost:5173/email-verified` (development)
   - `https://your-domain.com/email-verified` (production)

---

## Frontend Flow Summary

### 1. Sign Up
- User enters email/password → `supabase.auth.signUp()`
- Show "Check your inbox" message
- User clicks link in email → redirected to app
- Auth context automatically detects verified session
- Activity logged: "User signed up"

### 2. Forgot Password
- Click "Forgot password?" → Navigate to `/forgot-password`
- Enter email → `supabase.auth.resetPasswordForEmail()`
- Show "Check your inbox" message
- User clicks link → redirected to `/reset-password`
- Enter new password → `supabase.auth.updateUser({ password })`
- Activity logged: "User completed password reset"

### 3. Change Email (Settings)
- Navigate to Settings → Change Email section
- Enter new email → `supabase.auth.updateUser({ email })`
- Show "Check your inbox at new email" message
- User clicks link in new email → email updated
- Activity logged: "User requested email change"

### 4. Change Password (Settings)
- Navigate to Settings → Change Password section
- Enter new password with validation
- Submit → `supabase.auth.updateUser({ password })`
- Show success message
- Activity logged: "User changed password"

---

## Activity Logging

All authentication events are automatically logged to the `user_activity_logs` table:

- User signed up
- User signed in
- User signed out
- User verified email address
- User changed password
- User requested password reset
- User completed password reset
- User requested email change
- User changed email address

Access logs via: `SELECT * FROM user_activity_logs WHERE user_id = auth.uid() ORDER BY created_at DESC`

---

## Testing Checklist

- [ ] Configure all 4 email templates in Supabase
- [ ] Add redirect URLs to Supabase Auth settings
- [ ] Test sign up → receive email → verify
- [ ] Test forgot password → receive email → reset
- [ ] Test change email → receive email → confirm
- [ ] Test change password → success
- [ ] Verify activity logs are being created
- [ ] Test email templates render correctly on mobile
- [ ] Test expired token handling

---

## Support

For issues with email delivery or templates, contact:
- Support Email: support@phuturedigital.co.za
- Check Supabase logs for detailed error messages
