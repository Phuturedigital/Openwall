# Security Setup - Leaked Password Protection

## Required Action

To fully secure the Openwall platform, you need to enable leaked password protection in Supabase.

### What is Leaked Password Protection?

Supabase Auth can prevent users from signing up with passwords that have been compromised in data breaches by checking them against the HaveIBeenPwned.org database. This is a critical security feature that protects users from using weak or compromised passwords.

### How to Enable

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard

2. **Select your project**
   - Choose the Openwall project

3. **Navigate to Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Click on "Providers" tab
   - Select "Email" provider

4. **Enable Leaked Password Protection**
   - Scroll down to find "Leaked Password Protection"
   - Toggle the switch to **ON**
   - Click "Save"

### What This Does

When enabled, Supabase will:
- Check new passwords against HaveIBeenPwned's database of over 600 million compromised passwords
- Reject passwords that have been found in data breaches
- Display a user-friendly error message asking users to choose a different password
- Protect your users without storing or transmitting their actual passwords

### Security Best Practices

This feature is **strongly recommended** for all production applications because:
- It prevents account takeovers from credential stuffing attacks
- It protects users who reuse passwords across multiple sites
- It has no performance impact on your application
- It's completely transparent to users with secure passwords

---

**Status:** This is the only remaining security issue that requires manual configuration in the Supabase Dashboard. All other security issues have been resolved through database migrations.
