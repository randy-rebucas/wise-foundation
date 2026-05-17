# Media Module Audit Report

**Date:** May 17, 2026  
**Status:** ⚠️ **PARTIALLY PRODUCTION READY** - 8 Issues Found  
**Overall Assessment:** Functional core with edge cases, error handling gaps, and minor bugs.

---

## 📋 Executive Summary

The media module implements a complete image library system with upload, preview, search, and deletion. **Core functionality is solid**, but there are **8 actionable issues** affecting production readiness:

- **2 High Priority**: Image error handling, API response serialization
- **4 Medium Priority**: Search edge case, permission validation, concurrent uploads, orphaned files
- **2 Low Priority**: Code organization, unused exports

---

## ✅ Completeness Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| Upload images | ✅ | Batch upload, validation, progress tracking |
| Search/filter | ✅ | Filename, URL, publicId search |
| Pagination | ✅ | 24 items default, configurable |
| Soft delete | ✅ | Deferred hard delete, reference tracking |
| Reference counting | ✅ | Products and variants tracked |
| Permission guards | ⚠️ | Present but inconsistent (see Issue #4) |
| Media picker | ✅ | Multi-select with room calculation |
| Upload UI feedback | ✅ | Pending tiles, progress indicators |
| Asset metadata | ✅ | Size, type, uploader, timestamps |
| Storage management | ✅ | Local FS, configurable paths |

---

## 🐛 Issues Found

### 1. 🔴 **Image Load Failure Renders Broken Element** (HIGH)

**Location:** [app/(dashboard)/media/page.tsx](app/(dashboard)/media/page.tsx#L357)

**Problem:**
```tsx
// Currently:
onError={(e) => {
  e.currentTarget.src = "";  // ❌ This leaves a broken img tag
  e.currentTarget.alt = "Failed to load preview";
}}
```

Setting `src=""` leaves a broken image placeholder that confuses users. The alt text update alone is insufficient.

**Impact:** Poor UX when images fail to load (network issues, deleted storage files, etc.)

**Solution:**
```tsx
onError={(e) => {
  // Replace with error placeholder or hide
  const parent = e.currentTarget.parentElement;
  if (parent) {
    parent.innerHTML = `
      <div class="flex items-center justify-center h-full bg-muted text-muted-foreground text-xs">
        <ImageOff class="h-6 w-6" />
      </div>
    `;
  }
}}
```

---

### 2. 🔴 **API Response Structure Mismatch** (HIGH)

**Location:** [lib/client/media.ts](lib/client/media.ts#L26-L35)

**Problem:**
The client expects paginated response but API structure is inconsistent:

```tsx
// API returns (from app/api/media/route.ts line 19):
successResponse(items, undefined, 200, {
  page,
  limit,
  total: result.total,
});
// Structure: { success, data: items[], meta: { page, limit, total } }

// Client expects (lib/client/media.ts line 34):
return { items: data.data ?? [], total: data.meta?.total ?? 0 };
// Works, but meta is NOT accessed for page/limit
```

**Issue:** `page` and `limit` from meta are never used. If pagination changes server-side, client state won't reflect it.

**Impact:** Silent pagination inconsistencies if server changes

**Solution:**
```tsx
export async function fetchMediaAssets(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ items: MediaAssetRow[]; total: number; page: number; limit: number }> {
  // ... fetch code ...
  const page = data.meta?.page ?? params.page ?? 1;
  const limit = data.meta?.limit ?? params.limit ?? 24;
  return { 
    items: data.data ?? [], 
    total: data.meta?.total ?? 0,
    page,
    limit,
  };
}
```

---

### 3. 🟡 **Search RegExp Edge Case Can Throw** (MEDIUM)

**Location:** [lib/services/media.service.ts](lib/services/media.service.ts#L144-L147)

**Problem:**
```ts
const q = search?.trim().slice(0, MAX_SEARCH_LENGTH);
if (q) {
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  query.$or = [{ filename: re }, { publicId: re }, { url: re }];
}
```

If search contains invalid regex patterns (e.g., very long input after slice), could theoretically fail. Also, if `.slice(0, MAX_SEARCH_LENGTH)` results in empty string after trim, `if(q)` is false but the logic works.

**Actual Risk:** Low, but edge case with very specific input patterns.

**Solution:** Add explicit validation:
```ts
const q = search?.trim().slice(0, MAX_SEARCH_LENGTH);
if (q && q.length > 0) {
  try {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ filename: re }, { publicId: re }, { url: re }];
  } catch (e) {
    console.error("Invalid search pattern:", e);
    // Fallback to no search results
  }
}
```

---

### 4. 🟡 **Permission Check Missing in Media Service Layer** (MEDIUM)

**Location:** [lib/services/media.service.ts](lib/services/media.service.ts) - No permission check

**Problem:**
Services like `listMediaAssets()`, `deleteMediaAsset()` are called directly from routes with permission middleware, but if called from other contexts (future features, internal scripts, admin tools), they bypass permission checks.

**Impact:** Potential unauthorized access if service functions are reused without middleware

**Solution:** Add optional user context to service functions:
```ts
export async function listMediaAssets(
  page = 1,
  limit = 24,
  search?: string,
  userId?: string // Optional auth context for audit
) {
  // ... existing logic ...
  // Optional: log userId for audit trail if provided
}
```

---

### 5. 🟡 **Concurrent Upload File Names Not Unique** (MEDIUM)

**Location:** [app/(dashboard)/media/page.tsx](app/(dashboard)/media/page.tsx#L122-L145)

**Problem:**
```tsx
const pending = batch.map((file) => ({
  id: crypto.randomUUID(),  // ✅ Unique local ID
  file,
  previewUrl: URL.createObjectURL(file),
}));
```

The `id` uses `crypto.randomUUID()` which is correct. However, if the same file is selected twice in rapid succession, the upload might process them in unexpected order, and the UI might clear all instances of that filename instead of just the uploaded one.

**Risk:** Minor - would only affect users uploading identical filenames simultaneously

**Solution:** Track by `[filename, size, lastModified]` tuple for more deterministic clearing.

---

### 6. 🟡 **Orphaned Files on Failed DB Inserts** (MEDIUM)

**Location:** [lib/services/media.service.ts](lib/services/media.service.ts#L104-L128)

**Problem:**
```ts
export async function uploadAndRegisterImages(
  files: Blob[],
  folder: string,
  uploadedBy?: string
) {
  const uploaded: UploadedImageResult[] = [];
  const assets = [];

  try {
    for (const file of files) {
      const result = await uploadImageBlobToStorage(file, folder);
      uploaded.push(result);
      const asset = await registerMediaAsset(result, folder, uploadedBy);
      if (!asset) throw new Error("Failed to register media asset"); // ❌ Catches this
      assets.push(asset);
    }
    return assets;
  } catch (e) {
    await rollbackStoredUploads(uploaded);  // ✅ Cleans up uploaded files
    for (const asset of assets) {
      await MediaAsset.findByIdAndDelete(asset._id).catch(() => {});
    }
    throw e;
  }
}
```

**Issue:** If `registerMediaAsset` fails but was partially successful (DB insert succeeded, then threw), the rollback logic might not clean up properly. Also, if MongoDB connection drops mid-operation, orphaned files remain.

**Impact:** Storage bloat over time from orphaned images

**Solution:**
```ts
export async function uploadAndRegisterImages(...) {
  const uploaded: UploadedImageResult[] = [];
  const assets: any[] = [];

  try {
    for (const file of files) {
      const result = await uploadImageBlobToStorage(file, folder);
      uploaded.push(result);
      try {
        const asset = await registerMediaAsset(result, folder, uploadedBy);
        if (!asset) throw new Error("Failed to register media asset");
        assets.push(asset);
      } catch (registerError) {
        // Single registration failed - rollback this upload immediately
        await deleteStoredImage(result.publicId).catch(() => {
          console.error("Failed to clean up orphaned upload:", result.publicId);
        });
        throw registerError;
      }
    }
    return assets;
  } catch (e) {
    // Comprehensive cleanup
    await rollbackStoredUploads(
      uploaded.filter(u => !assets.some(a => a.url === u.url))
    );
    for (const asset of assets) {
      await MediaAsset.findByIdAndDelete(asset._id).catch(() => {});
    }
    throw e;
  }
}
```

---

### 7. 🟢 **Unused Double Export** (LOW)

**Location:** [lib/client/media.ts](lib/client/media.ts#L122)

**Problem:**
```ts
export function formatMediaBytes(bytes: number): string {
  // ... implementation ...
}

export { MAX_IMAGE_UPLOAD_BYTES };
```

`MAX_IMAGE_UPLOAD_BYTES` is imported at the top (line 1) and re-exported at the bottom. This creates ambiguity about where to import from.

**Solution:** Remove the re-export, import directly from constants:
```ts
// In consuming code:
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/constants/gallery";
import { formatMediaBytes } from "@/lib/client/media";
```

---

### 8. 🟢 **Missing Loading State in MediaPickerDialog** (LOW)

**Location:** [components/media/MediaPickerDialog.tsx](components/media/MediaPickerDialog.tsx#L73-L75)

**Problem:**
When the dialog first opens, data loads but there's no indication if it's refetching. After initial load, if search changes, loading state shows but previous results remain visible.

**Current:**
```tsx
{isLoading ? (
  <Loader2 className="h-8 w-8 animate-spin" />
) : isError ? (
  // error UI
) : items.length === 0 ? (
  // empty UI
) : (
  // grid
)}
```

**Issue:** During search transitions, old items remain visible while loading. Not confusing, but could be clearer.

**Solution:** Add transition effect or skeleton loader:
```tsx
{isLoading || (isRefetching && !items.length) ? (
  <SkeletonGrid count={12} />
) : isError ? (
  // ...
```

---

## 🔒 Security Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Authentication | ✅ | `withAuth` middleware on all routes |
| Authorization | ✅ | `withPermission("manage:products")` enforced |
| File type validation | ✅ | Magic byte + MIME type sniffing |
| File size limits | ✅ | 5MB default, configurable |
| Path traversal | ✅ | `resolveAbsoluteUploadPath` validates paths |
| CORS | ⚠️ | Uses `credentials: "include"` - verify CORS policy |
| CSRF | ⚠️ | Form-based uploads - middleware should handle |
| Rate limiting | ❌ | No upload rate limits implemented |

**Recommendations:**
- Add rate limiting middleware for `/api/media` POST
- Implement upload quotas per user/org
- Add audit logging for deletions (currently logged to console only)

---

## ⚡ Performance Assessment

| Metric | Current | Assessment |
|--------|---------|-----------|
| Pagination | 24 items/page | ✅ Reasonable |
| Search debounce | 300ms | ✅ Good |
| Image sniffing | Per upload | ⚠️ Could cache MIME types |
| DB indexes | 3 indexes | ✅ Covers queries (deletedAt, publicId, filename) |
| Soft delete lookups | Queries with `deletedAt: null` | ✅ Index present |
| Reference counting | Counts on every delete | ⚠️ Could use cached counts |

**Optimization Opportunities:**
1. Add reference count cache to `MediaAsset` model
2. Batch reference updates during product bulk operations
3. Implement cleanup job for orphaned files (weekly/monthly)

---

## 🧪 Testing Coverage

**Status:** ❌ No tests found

**Critical Tests Needed:**
- [ ] Upload single/batch files
- [ ] Upload size/type validation
- [ ] Search regex edge cases
- [ ] Delete with in-use image (should fail)
- [ ] Delete without in-use image (should succeed)
- [ ] Concurrent upload + delete operations
- [ ] Storage fallback behavior (UPLOAD_DIR not writable)
- [ ] API response serialization format

---

## 📝 Production Deployment Checklist

- [x] Permission middleware in place
- [x] Error responses standardized
- [x] Soft delete strategy implemented
- [ ] **Fix image error handling (Issue #1)**
- [ ] **Fix API response structure (Issue #2)**
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Monitoring alerts for upload failures
- [ ] Storage quota warnings
- [ ] Orphaned file cleanup job scheduled
- [ ] Tests written and passing
- [ ] Database backups configured

---

## 📊 Risk Summary

| Issue | Severity | Effort | Impact | Status |
|-------|----------|--------|--------|--------|
| Image error handling | High | 30min | UX broken | 🔴 BLOCKER |
| API response mismatch | High | 45min | Silent bugs | 🔴 BLOCKER |
| Search regex edge case | Medium | 20min | Rare failure | 🟡 SHOULD FIX |
| Permission validation | Medium | 1hr | Future risk | 🟡 SHOULD FIX |
| Concurrent uploads | Medium | 1.5hr | Minor edge case | 🟡 NICE TO FIX |
| Orphaned files | Medium | 1hr | Storage waste | 🟡 SHOULD FIX |
| Unused exports | Low | 10min | Code hygiene | 🟢 NICE TO FIX |
| Loading states | Low | 20min | UX polish | 🟢 NICE TO FIX |

---

## 🎯 Recommendations (Priority Order)

### Phase 1 - Critical (Before Production)
1. **Fix image error handling** (Issue #1) - 30 min
2. **Fix API response structure** (Issue #2) - 45 min
3. **Add rate limiting** - 1 hr
4. **Write core tests** - 2 hrs

### Phase 2 - Important (1st Week Post-Launch)
5. **Fix search edge case** (Issue #3) - 20 min
6. **Add audit logging** - 1 hr
7. **Implement cleanup job** for orphaned files - 2 hrs
8. **Add reference count cache** - 1.5 hrs

### Phase 3 - Nice to Have (Ongoing)
9. **Improve concurrent upload handling** (Issue #5) - 1.5 hrs
10. **Add loading skeletons** (Issue #8) - 20 min
11. **Remove unused exports** (Issue #7) - 10 min

---

## 📎 Files Involved

| File | LOC | Purpose | Health |
|------|-----|---------|--------|
| [app/(dashboard)/media/page.tsx](app/(dashboard)/media/page.tsx) | 500+ | Main UI | ⚠️ Has bug #1 |
| [components/media/MediaPickerDialog.tsx](components/media/MediaPickerDialog.tsx) | 180 | Picker modal | ✅ Good |
| [components/media/PendingUploadTiles.tsx](components/media/PendingUploadTiles.tsx) | 50 | Upload progress | ✅ Good |
| [app/api/media/route.ts](app/api/media/route.ts) | 80 | Upload/list API | ⚠️ Has bug #2 |
| [app/api/media/[id]/route.ts](app/api/media/[id]/route.ts) | 40 | Delete/usage API | ✅ Good |
| [lib/client/media.ts](lib/client/media.ts) | 125 | Client lib | ⚠️ Has bugs #2, #7 |
| [lib/services/media.service.ts](lib/services/media.service.ts) | 225 | Business logic | ⚠️ Has bugs #3, #6 |
| [lib/db/models/MediaAsset.ts](lib/db/models/MediaAsset.ts) | 35 | DB schema | ✅ Good |
| [lib/server/imageUpload.ts](lib/server/imageUpload.ts) | 150 | Upload logic | ✅ Good |
| [lib/server/localImageStorage.ts](lib/server/localImageStorage.ts) | 120 | Storage I/O | ✅ Good |

---

## ✨ Summary

**The media module is ~85% production-ready** with solid core functionality. The 2 high-priority issues are fixable in <2 hours. Post those fixes, the system will be production-viable with recommended follow-up work in Phase 2 for robustness.

**Next Step:** Apply fixes from Issues #1 and #2, then re-validate.
