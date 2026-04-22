# Maintenance Mode Audit

## Files Involved in Maintenance Protection

### 1. Core Utility File
- **File**: `lib/utils/maintenance.ts`
- **Function**: `isMaintenanceMode()` checks `process.env.MAINTENANCE_MODE === 'true'`
- **Bypass Roles**: `['ADMIN']`

### 2. Proxy (Request Level)
- **File**: `proxy.ts`
- **Status**: ✅ Checks maintenance mode for all routes
- **Flow**:
  1. Allows public paths: `/login`, `/setup`, `/maintenance`, `/api/setup`, `/api/auth`
  2. Gets user session
  3. If maintenance active AND user is NOT admin → redirects to `/maintenance`
  4. If API call during maintenance → returns 503

### 3. Root Page
- **File**: `app/page.tsx`
- **Status**: ✅ Checks maintenance mode
- **Flow**: Redirects non-admin users to `/maintenance` before role-based redirect

### 4. Dashboard Layout
- **File**: `app/(dashboard)/layout.tsx`
- **Status**: ✅ Checks maintenance mode
- **Flow**: Redirects non-admin users to `/maintenance` before rendering

### 5. Maintenance Page
- **File**: `app/maintenance/page.tsx`
- **Status**: ✅ Accessible to all users

## Environment Variable Check
- **Variable**: `MAINTENANCE_MODE`
- **Current Value**: Check `.env.local`
- **Expected Format**: `MAINTENANCE_MODE=true` (must be string "true")

## Debug Endpoint
- **Route**: `/api/debug/maintenance`
- **Purpose**: Shows current maintenance status and user role
- **Use**: Visit this to verify what's happening

## Possible Issues

### Issue 1: Environment Variable Not Set Correctly
- Make sure `.env.local` has `MAINTENANCE_MODE=true` (not `MAINTENANCE_MODE='true'` with quotes)

### Issue 2: Dev Server Cache
- Restart dev server: `Ctrl+C` then `pnpm dev`
- Build cache might be preventing changes: `pnpm build` then check

### Issue 3: User Role is ADMIN
- Check `/api/debug/maintenance` to see user's role
- If role is `ADMIN`, they are allowed through (this is by design)

### Issue 4: Session Not Refreshed
- Clear browser cookies and restart dev server
- Try in incognito/private window

## Testing Steps

1. **Check Debug Endpoint**:
   ```
   GET http://localhost:3000/api/debug/maintenance
   ```
   Should show:
   - `maintenanceActive: true`
   - User's role
   - Whether they can bypass

2. **Test Non-Admin Access**:
   - Create test user with role: `STAFF`, `BRANCH_MANAGER`, etc.
   - Try accessing `/dashboard`
   - Should redirect to `/maintenance`

3. **Test Admin Access**:
   - Use admin account
   - Try accessing `/dashboard`
   - Should work normally

4. **Test Anonymous Access**:
   - Clear all cookies
   - Try `/dashboard`
   - Should redirect to `/login`

## Next Steps to Debug

1. Visit `/api/debug/maintenance` and share the output
2. Check what role your test user has
3. Restart dev server with fresh cache
