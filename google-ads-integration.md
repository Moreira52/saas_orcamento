# Google Ads Integration Plan

## Context
The user wants to implement a Google Ads account connection flow for their SaaS clients. This integration allows a SaaS client to connect their Google Ads account to the dashboard for investment monitoring.

## Current State
- **Backend**:
    - OAuth endpoints (`auth`, `callback`, `disconnect`) are implemented.
    - Status endpoint (`status`) correctly identifies `PENDING_SELECTION`.
    - Account listing (`list-accounts`) and saving (`save-account`) endpoints exist but might need verification (API version).
- **Frontend**:
    - `IntegrationsButton` exists but only fully implements the Meta Ads selection flow.
    - Google Ads flow starts auth but doesn't handle the post-auth account selection.

## Goals
1.  **Frontend**: Implement the Google Ads account selection modal in `IntegrationsButton.tsx`.
2.  **Backend**: Verify `list-accounts` endpoint compatibility (v17/v18 recommended over v16).
3.  **UX**: Ensure smooth transition from Auth popup -> Modal open -> Account selection -> Success.

## Detailed Tasks

### Phase 1: Frontend Implementation
- [ ] **Update `IntegrationsButton.tsx`**:
    - Add `isGoogleSelectionOpen` state.
    - Add `useQuery` for fetching Google Accounts (`/api/integrations/google/list-accounts`).
    - Add `useMutation` for saving selected Google Account (`/api/integrations/google/save-account`).
    - Implement `useEffect` to auto-open the Google selection modal when `googleStatus.connected` is true and `googleStatus.needsSelection` is true.
    - Render the Google Account Selection Dialog (based on the Meta Ads one).

### Phase 2: Backend Review & Fixes
- [ ] **Verify `list-accounts/route.ts`**:
    - Check Google Ads API version (v16 is old, check if upgrade to v17/v18 is needed).
    - Ensure `resourceName` parsing is robust.

### Phase 3: Testing logic (Manual)
- [ ] User connects Google Ads -> Popup -> Success.
- [ ] Main window detects `connected: true, needsSelection: true`.
- [ ] Modal opens with list of accounts.
- [ ] User selects account -> `save-account` called.
- [ ] Modal closes, status updates to `connected: true`.

## Technical Details
- **API Version**: Google Ads API v17+ is recommended.
- **State Management**: React Query handling polling (`refetchInterval`) is already in place, which is good.
