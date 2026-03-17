# Image Upload Production Debugging Guide

## Problem Summary
- **Issue**: HTTP 500 error on POST `/api/design/upload-image` in production (Railway)
- **Works locally**: ✅ Image uploads work on development machine
- **Root cause**: Environment variable `UPLOAD_DIR` not configured in Railway production environment

## Understanding the Issue

### How Upload Path Resolution Works

The application resolves the upload directory in this order:

1. Check `process.env.UPLOAD_DIR` (if set)
2. Fallback to `path.join(process.cwd(), 'uploads')`

```typescript
// In src/features/design/assetStorage.ts
const UPLOADS_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads');
```

### Why It Fails in Production

- **Local (.env.local)**: This file is **NOT committed** to git, so `UPLOAD_DIR=/Users/...` only exists on your machine
- **Production (Railway)**: Reading `.env.local` is impossible because:
  - `.env.local` is in `.gitignore`
  - Railway doesn't have access to your local files
  - Railway pulls code from git, not your local filesystem

### Current State

Your setup:
```
Local:      UPLOAD_DIR set in .env.local               ✅ Works locally
Railway:    UPLOAD_DIR not configured                  ❌ Uses fallback
Fallback:   process.cwd()/uploads                      ❌ Path doesn't exist/isn't writable
```

## Step-by-Step Fix

### 1. Verify Current Status (Development)

```bash
# Test the debug endpoint
curl http://localhost:3001/api/debug/upload-env | jq
```

Expected output:
```json
{
  "environment": {
    "NODE_ENV": "development",
    "UPLOAD_DIR_env": "/path/to/uploads", // from .env.local
    "cwd": "/path/to/project"
  },
  "paths": {
    "UPLOADS_ROOT": "/path/to/uploads",
    "expectedUploadPath": "/path/to/uploads/uploads/2026/03"
  },
  "diagnostics": {
    "uploadDirIsSet": true,
    "usingFallback": false
  }
}
```

### 2. Check Server Error Logs (Production)

When production image upload fails, check Railway logs for error details:

```
uploadRoot: /app/uploads                    // ← What path was used
uploadDirEnv: NOT_SET                       // ← Env var not found
errorCode: EACCES                          // ← Permission denied (can't write)
                                           // ← OR ENOENT (path doesn't exist)
```

**Error Code Meanings:**
- `EACCES`: Permission denied - path exists but isn't writable
- `ENOENT`: No such file or directory - path doesn't exist
- `EROFS`: Read-only filesystem - Volume mount issue

### 3. Configure Railway Service Variables

Go to Railway Dashboard → Your Service → Variables

**Add or Update:**
```
UPLOAD_DIR=/app/uploads
```

⚠️ **Important:**
- Exact path must match Volume mount location (next step)
- `/app/uploads` is the standard Railway convention
- Must be an absolute path, not relative

### 4. Mount Volume to Service

In Railway Dashboard → Your Service → Settings → Volumes

**Ensure you have:**
- **Mount Path**: `/app/uploads`
- **Volume Size**: At least 10GB (or appropriate for your needs)

If not present, create:
1. Click "Create New Volume" or "Add Volume"
2. Set Mount Path to `/app/uploads`
3. Set minimum size (Railway recommends 10GB minimum)
4. Save

### 5. Redeploy Service

After configuring variables and volumes:

```bash
# Trigger redeploy from Railway UI, OR use CLI:
railway up --service <service-name>
```

**Wait for deployment to complete** before testing.

### 6. Test Upload in Production

Once redeployed:

1. Go to production site: `https://your-domain.com`
2. Navigate to design/upload image feature
3. Upload an image
4. Check for success response with `image_url` and `thumb_url`
5. If still failing, check Railway logs (next section)

## Troubleshooting Continued Failures

### If Still Getting HTTP 500

#### Step 1: Check the exact error in Railway logs
```
Railway Dashboard → Your Service → Logs → Filter for "upload image error"
```

Look for error output like:
```json
{
  "uploadRoot": "/app/uploads",
  "uploadDirEnv": "NOT_SET",
  "errorCode": "EACCES",
  "message": "Permission denied"
}
```

#### Step 2: Verify Volume Mount

```bash
# SSH into Railway container and check:
ls -la /app/uploads
# Should show directory exists and is writable
# If not exists: Volume mount failed
# If not writable: Permissions issue
```

#### Step 3: Check Service Variable was Applied

```bash
# Railway Dashboard → Logs, you should see at startup:
# "Environments: .env (with variables from Railway UI)"
```

If `UPLOAD_DIR` isn't showing in startup logs, the variable wasn't saved.

**Retry:**
1. Go to Service → Variables
2. Verify `UPLOAD_DIR=/app/uploads` is listed
3. Click "Save" (sometimes doesn't require explicit save)
4. Manually trigger redeploy

#### Step 4: Alternative Path

If `/app/uploads` causes issues, try `/tmp/uploads`:

```
Railway Service Variables:
UPLOAD_DIR=/tmp/uploads

Note: /tmp is ephemeral (clears on restart), only for testing
For persistence, must use a Volume mount
```

Then test, and if works, go back to proper Volume mount path.

## Files Modified for Better Debugging

### New Debug Endpoint
- **File**: `src/app/api/debug/upload-env/route.ts`
- **Access**: `GET /api/debug/upload-env`
- **Available**: Development only
- **Returns**: Current upload configuration and diagnostics

### Enhanced Upload Route
- **File**: `src/app/api/design/upload-image/route.ts`
- **Change**: Better error logging with context
- **Output**: Console logs now include:
  - `uploadDirEnv`: Whether UPLOAD_DIR was set
  - `errorCode`: Filesystem error code (EACCES, ENOENT, etc.)
  - `nodeEnv`: Which environment it's running in

### Enhanced Storage Utility
- **File**: `src/features/design/assetStorage.ts`
- **Change**: Try/catch with detailed logging
- **Output**: Logs exact path, error code, and whether fallback was used

## Next Steps

1. **Immediate**: Add `UPLOAD_DIR=/app/uploads` to Railway Service Variables
2. **Then**: Verify Volume mount exists at `/app/uploads`
3. **Then**: Redeploy service
4. **Then**: Test upload and check Railway logs for error details
5. **If fails**: Use error code from logs to determine next action
6. **Document**: Save Railway setup steps for team

## Related Concepts

### Development vs Production Environment Variables

| Type | File | Visibility | Docker/Railway |
|------|------|------------|----------------|
| Public defaults | `.env` | Git-tracked | ✅ Used |
| Local secrets | `.env.local` | .gitignore | ❌ Ignored |
| Railway config | Service Variables | Railway UI | ✅ Used |

### File Storage Strategy

Current approach: Filesystem-based uploads to `/api/files/[...path]`

**Pros:**
- Simple implementation
- Works locally without extra services
- Single server deployments work fine

**Cons:**
- Doesn't scale to multi-container deployments
- Requires persistent Volume mount on Railway
- Must manage storage growth manually

**Future**: Consider S3-based storage for production scalability
