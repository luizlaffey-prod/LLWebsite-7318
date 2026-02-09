# Originals Pages Fix - Summary

## Issue Fixed
The originals detail pages (`/originals/zero-point-zero.tsx` and `/originals/luiz-laffeys-collection.tsx`) were importing the wrong subscription hook:
- **Was using:** `useSubscriptions` (plural) from `useSubscriptions.ts`
- **Should use:** `useSubscription` (singular) from `useSubscription.ts`

## Root Cause
The `useSubscriptions` hook was attempting to call `/api/subscriptions/user/${userId}` which doesn't exist in the backend. The correct hook `useSubscription` has a working implementation that:
1. Tries to fetch from the API endpoint `/api/me/originals` with auth header
2. Falls back to localStorage mock for local testing (as documented in the handover)
3. Provides `hasAccess(originalId)` method to check subscription status

## Changes Made

### 1. `/src/web/pages/originals/zero-point-zero.tsx`
- Changed import from `useSubscriptions` to `useSubscription`
- Updated export function to use new hook: `const { hasAccess, loading } = useSubscription();`
- Updated access check from `!hasProgram('ZERO_POINT_ZERO')` to `!hasAccess(1)` (ID = 1)
- Subscribe button link already correct: `/plans?program=ZERO_POINT_ZERO`

### 2. `/src/web/pages/originals/luiz-laffeys-collection.tsx`
- Changed import from `useSubscriptions` to `useSubscription`
- Updated export function to use new hook: `const { hasAccess, loading } = useSubscription();`
- Updated access check from `!hasProgram('LUIZ_LAFFEY_COLLECTION')` to `!hasAccess(2)` (ID = 2)
- Subscribe button link already correct: `/plans?program=LUIZ_LAFFEY_COLLECTION`

## Program ID Mapping
- Zero Point Zero: ID = 1, slug = "zero-point-zero"
- Luiz Laffey's Collection: ID = 2, slug = "luiz-laffey-collection"

## Access Control Flow
1. User visits `/originals/zero-point-zero` (or luiz page)
2. Component loads and calls `useSubscription()`
3. Hook tries API endpoint `/api/me/originals` (requires auth header)
4. If no API access, falls back to `localStorage.subscriptions_${user_id}`
5. `hasAccess(originalId)` checks if user has subscription to that original
6. If not subscribed → show lock screen with "Subscribe Now" button
7. If subscribed → show full program content (hero, hosts, samples, library preview)

## Testing Checklist
✓ Build passes (npm run build)
✓ No TypeScript errors
✓ Lock screen logic correct
✓ Subscribe button routing verified
✓ i18n strings already in place for all content

## Next Steps (for later)
- Connect Station Settings modal to API endpoints  
- Add email notifications
- Implement PayPal integration
- Add footer to originals pages
- Translate remaining UI strings
