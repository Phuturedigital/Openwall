# Openwall Authentication - Visual Test Guide

## Quick Visual Tests

### 🧪 Test 1: Enhanced Auth Modal

**Steps:**
1. Open the app
2. Click "Sign In" button in navigation
3. Switch between "Sign in", "Sign up", and "Reset password" tabs

**Expected Results:**
- ✅ Modal opens with smooth animation (scale + fade)
- ✅ All three modes display correctly
- ✅ Close button (X) works
- ✅ Modal can be closed by clicking backdrop
- ✅ Dark mode styles apply correctly

---

### 🧪 Test 2: Password Validation & Strength

**Steps:**
1. Open auth modal → Switch to "Sign up"
2. Type in password field: `abc` (weak)
3. Type: `Abc123` (medium)
4. Type: `Abc123!@#` (strong)

**Expected Results:**
- ✅ Strength indicator appears below password field
- ✅ Bar width changes: 33% → 66% → 100%
- ✅ Color changes: Red → Yellow → Green
- ✅ Label shows: "weak" → "medium" → "strong"
- ✅ Error message appears if doesn't meet requirements
- ✅ Green checkmark appears when valid

---

### 🧪 Test 3: Real-Time Validation

**Steps:**
1. In signup form, click in "Full Name" field
2. Click out (blur) without typing
3. Type `A` and blur
4. Type `John Doe` and blur

**Expected Results:**
- ✅ After first blur: "Name is required" error appears in red
- ✅ After typing `A`: "Name must be at least 2 characters"
- ✅ After typing `John Doe`: Green checkmark appears, no error

Repeat for email:
- ✅ Empty: "Email is required"
- ✅ Invalid: "Please enter a valid email address"
- ✅ Valid: Green checkmark appears

---

### 🧪 Test 4: Password Visibility Toggle

**Steps:**
1. In signup form, type a password
2. Click the eye icon

**Expected Results:**
- ✅ Password changes from `••••••••` to actual text
- ✅ Icon changes from Eye to EyeOff
- ✅ Click again toggles back to hidden
- ✅ Works on both "Password" and "Confirm Password" fields

---

### 🧪 Test 5: Submit Button States

**Steps:**
1. In signup form, leave all fields empty
2. Fill only email
3. Fill all fields with valid data
4. Click submit

**Expected Results:**
- ✅ Empty form: Button is gray and disabled
- ✅ Partial form: Button remains gray and disabled
- ✅ Valid form: Button turns blue and becomes clickable
- ✅ After click: Shows spinner + "Please wait..."
- ✅ Hover on valid button: Scales to 1.02x
- ✅ Click on valid button: Scales to 0.98x

---

### 🧪 Test 6: Error Shake Animation

**Steps:**
1. In login form, enter wrong credentials
2. Submit the form

**Expected Results:**
- ✅ Form shakes left-right for 0.5 seconds
- ✅ Error message appears in red box with alert icon
- ✅ Message: "Invalid email or password. Please try again."

---

### 🧪 Test 7: Toast Notifications

**Steps:**
1. Sign in successfully
2. Sign out
3. Try to post without logging in

**Expected Results:**
- ✅ On logout: Blue toast appears bottom-right
- ✅ Message: "You've been logged out safely."
- ✅ Toast has info icon (blue)
- ✅ Auto-dismisses after 4 seconds
- ✅ Can manually close with X button
- ✅ Smooth slide-in animation from bottom

---

### 🧪 Test 8: Password Reset Flow

**Steps:**
1. In auth modal, click "Forgot password?"
2. Enter an email address
3. Submit

**Expected Results:**
- ✅ Modal switches to "Reset Password" mode
- ✅ Shows message: "If that email exists, we've sent instructions..."
- ✅ After 5 seconds, automatically switches back to "Sign in" mode
- ✅ Success message disappears

**To test full reset:**
1. Check your email for reset link
2. Click the link
3. Should redirect to `/reset-password` page

---

### 🧪 Test 9: Reset Password Page

**If you have a valid reset token:**

**Steps:**
1. Visit `/reset-password` page (via email link)
2. Try entering weak password
3. Try mismatched passwords
4. Enter valid matching passwords

**Expected Results:**
- ✅ Page loads with clean design
- ✅ Two password fields: "New Password" and "Confirm New Password"
- ✅ Password strength indicator works
- ✅ Eye icons toggle visibility
- ✅ Validation shows errors in real-time
- ✅ Submit disabled until both valid
- ✅ On success: Success page with checkmark animation
- ✅ Auto-redirects to home after 3 seconds

---

### 🧪 Test 10: Email Verification Page

**If you have a verification link:**

**Steps:**
1. Click email verification link
2. Should redirect to `/email-verified` page

**Expected Results:**
- ✅ Page loads with success animation
- ✅ Big green checkmark appears with scale animation
- ✅ Message: "Email Verified!"
- ✅ "Redirecting to login..." message shows
- ✅ Auto-redirects after 3 seconds

---

### 🧪 Test 11: Keyboard Navigation

**Steps:**
1. Open auth modal
2. Press Tab key repeatedly
3. Press Enter on focused button

**Expected Results:**
- ✅ Tab cycles through all inputs and buttons
- ✅ Focus rings visible on all elements
- ✅ Enter submits form when button focused
- ✅ Enter also works when in input fields
- ✅ Escape closes modal (browser default)

---

### 🧪 Test 12: Dark Mode Compatibility

**Steps:**
1. Toggle dark mode in navigation
2. Open auth modal
3. Test all fields and interactions

**Expected Results:**
- ✅ Modal background changes to dark gray
- ✅ Text changes to white/light gray
- ✅ Input fields have dark backgrounds
- ✅ Borders and colors remain visible
- ✅ Toast notifications adapt to dark theme
- ✅ All text remains readable (proper contrast)

---

### 🧪 Test 13: Mobile Responsiveness

**Steps:**
1. Resize browser to 375px width (iPhone SE size)
2. Open auth modal
3. Test all interactions

**Expected Results:**
- ✅ Modal fits screen with proper padding
- ✅ All fields are properly sized
- ✅ Text is readable
- ✅ Buttons are tappable (44px min height)
- ✅ Toast appears correctly positioned
- ✅ No horizontal scrolling
- ✅ Keyboard doesn't break layout on mobile

---

### 🧪 Test 14: Network Error Handling

**Steps:**
1. In browser DevTools, set Network to "Offline"
2. Try to sign in

**Expected Results:**
- ✅ Error message appears: "Network issue. Please check your connection and try again."
- ✅ Form doesn't get stuck in loading state
- ✅ Can try again after fixing network

---

### 🧪 Test 15: Success Messages

**Steps:**
1. Sign up with new account
2. Check for success message

**Expected Results:**
- ✅ Green box appears with checkmark icon
- ✅ Message: "We've sent you a confirmation link. Please verify your email to continue."
- ✅ Modal auto-closes after 3 seconds

---

## 🎨 Visual Checklist

### Colors
- ✅ Blue primary: `#3B82F6`
- ✅ Green success: `#10B981`
- ✅ Red error: `#EF4444`
- ✅ Yellow warning: `#F59E0B`
- ✅ Gray disabled: `#9CA3AF`

### Animations
- ✅ Modal open: Scale 0.95 → 1 + fade in
- ✅ Modal close: Scale 1 → 0.95 + fade out
- ✅ Toast appear: Slide up from bottom + fade in
- ✅ Shake: Horizontal movement 10px left/right
- ✅ Button hover: Scale 1 → 1.02
- ✅ Button click: Scale 1 → 0.98
- ✅ Checkmark: Scale 0 → 1 with spring

### Typography
- ✅ Headings: Bold, clear hierarchy
- ✅ Labels: Medium weight, gray color
- ✅ Errors: Red, smaller size
- ✅ Success: Green, smaller size
- ✅ Placeholders: Light gray, italic

### Spacing
- ✅ Input padding: 12px (py-3)
- ✅ Button padding: 14px (py-3.5)
- ✅ Modal padding: 32px (p-8)
- ✅ Field spacing: 16px (space-y-4)
- ✅ Consistent margins throughout

---

## ✅ Final Verification

After testing all above:

- [ ] All validation rules work correctly
- [ ] All animations are smooth
- [ ] All buttons respond correctly
- [ ] All error messages are clear
- [ ] All success flows complete
- [ ] Dark mode looks good
- [ ] Mobile layout works
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] No console errors
- [ ] No broken styles
- [ ] No JavaScript errors

**If all checked: Authentication system is production-ready!** 🚀
