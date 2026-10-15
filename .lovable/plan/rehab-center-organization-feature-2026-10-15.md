# Rehab Center Organization Feature

## What users get
- **Managers** create a center, get a shareable invite code, invite seniors and caregivers by email, assign seniors to caregivers, and see every consenting senior.
- **Caregivers** see only the seniors assigned to them.
- **Seniors** join with a code or accept an email invite, and must approve sharing (check-ins, scores, recordings). They can revoke anytime from Setup.
- **Center dashboard** (`/center`): alerts first (low mood/health scores, concerning notes, no check-in in 48h), then the full roster with latest status. Clicking a senior opens their trend chart, check-in history, transcripts and the audio summary player.

## How regular users and centers are told apart
- Everyone signs in the same way with Google. By default every account is a **regular user** (senior or family member), exactly as today.
- An account becomes a **center account** only when the person picks "I run a rehab / senior center" on a new first-time screen and creates a center (name, address, phone). They become its manager.
- Caregivers become center staff only by accepting a manager's email invite.
- The top-right menu shows a "Center dashboard" link only for managers and caregivers; regular users never see it.
- The same person can be both (e.g. a manager who also does their own check-ins).
- Center access is checked on the server for every request, so nobody can make themselves a manager by changing the app.

## Flow
```text
Manager creates center -> code + email invites
Senior joins (code or invite) -> consent screen -> Approve
Manager/caregiver dashboard -> alerts -> senior detail (trend, recordings)
```

## Technical details
- New tables (all with GRANTs + RLS): `organizations`, `organization_members` (user_id, org_id, role enum `org_manager|org_caregiver`), `organization_seniors` (org_id, senior_user_id, consent_status `pending|approved|revoked`, consented_at), `caregiver_assignments`, `organization_invites` (email, role, token, expires_at).
- Roles live only in `organization_members`; security-definer helpers `is_org_manager(org)`, `can_view_senior(viewer, senior)` (manager of org OR assigned caregiver, AND consent approved) to avoid RLS recursion.
- Add SELECT policies on `check_ins`, `profiles`, `medications`, `medication_logs` using `can_view_senior`. No write access for staff.
- Recordings: `generate-audio-summary` and signed-URL access extended to allow `can_view_senior`; storage stays private.
- Join via code/invite through a small edge function (validates token, creates pending link); consent update only by the senior.
- Alerts computed client-side from latest check-ins (overall score at or below 2, concerns present, no check-in in 48h).
- UI: `/center` dashboard, `/center/senior/:id` detail (reuses `SentimentChart`), center setup/invite page, senior consent card + "My care center" section in Setup.
- Audit: log staff views of recordings into an `access_log` table.

## Out of scope (for now)
- Billing per center, multiple centers per senior, staff editing senior data.
