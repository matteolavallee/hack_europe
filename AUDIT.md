# CareLoop Frontend — Full Audit

> Date: Feb 21, 2026 — After Wave 1 + Wave 2 completion
> Based on: deep read of all 30 source files + linter check (0 errors)

---

## ✅ What Is Well Done

| Area | Detail |
|---|---|
| **TypeScript types** | Comprehensive, well-organized, covers all entities + device state machine |
| **Mock mode** | Full UI works without any backend — toggle via single env var |
| **SWR hooks** | Correctly configured polling intervals (3s device, 5s timeline, 10s calendar) |
| **Form validation** | Calendar and content upload both validate required fields before submit |
| **Loading + error states** | All data-fetching pages handle loading (spinners/skeletons) and errors |
| **Destructive action guards** | Delete on calendar uses ConfirmModal — no accidental deletions |
| **KioskShell state machine** | Logic is solid — processedIds ref prevents infinite mock loops |
| **Exercise flow** | 3-question sequence with progress dots, correct state transitions |
| **Help modal** | Full flow: ask → notify caregiver → submit to API → confirm on screen |
| **Optimistic toggle** | AudioContentCard recommendable toggle reverts on failure |
| **Active sidebar nav** | Correct active state detection (exact match for home, prefix for others) |
| **Timeline filtering** | 5-tab filter with correct type grouping logic |
| **Timeline live pill** | Pulse animation + manual refresh button |
| **Calendar pre-fill** | Edit modal correctly pre-populates all fields including datetime |
| **Status filter tabs** | Calendar filters work correctly across all status values |
| **Demo panel** | 3 trigger buttons with loading state and result feedback |
| **AudioContentCard** | Local state for toast, schedule modal, send now — all independent |
| **Settings dual-form** | Both forms save independently with their own loading/success/error state |
| **Code cleanliness** | 0 linter errors, no `any` types, consistent Tailwind patterns |

---

## 🔴 Must Fix (Critical — Breaks Demo)

### 1. No viewport meta tag on mobile (CRITICAL for device)
**File:** `app/layout.tsx`
**Problem:** No `<meta name="viewport">` or Next.js `viewport` export. On a phone screen, the kiosk UI will render at desktop zoom — tiny text, unresponsive buttons. The device is literally designed to be used on a phone.
**Fix:** Add `export const viewport` to `app/layout.tsx`.

### 2. Device kiosk can be scrolled (CRITICAL)
**File:** `app/device/page.tsx` / `KioskShell.tsx`
**Problem:** The full-screen kiosk uses `min-h-screen` but has no `overflow-hidden`. On a phone, the user can scroll the page — breaking the kiosk feel. Also no separate device layout file prevents dashboard styles from leaking.
**Fix:** Create `app/device/layout.tsx` with `overflow-hidden h-screen` to lock the viewport.

### 3. Sound wave animation is wrong
**File:** `components/device/KioskShell.tsx` lines 314–345
**Problem:** The "speaking" and "listening" state bars use `style={{ animation: "bounce 0.6s..." }}`. Tailwind's built-in `@keyframes bounce` does `translateY` (vertical jump), not a height/scale change. The bars will bounce up and down rather than pulse like a sound wave — looks broken.
**Fix:** Define a custom `@keyframes soundbar` in `globals.css` and replace inline styles with the class.

### 4. "Events logged" stat is always ≤ 5
**File:** `app/dashboard/page.tsx` line 63–67
**Problem:** `useTimeline(5)` fetches at most 5 events. Then `events.length` is displayed as "Events logged" — always showing 5 (or fewer). This is misleading; the real total is much higher.
**Fix:** Change to `useTimeline(50)` or separate the count display from the list.

---

## 🟡 Must Improve (UX / Functional Gaps)

### 5. "Good morning" greeting is always "Good morning"
**File:** `app/dashboard/page.tsx` line 35
**Problem:** Hardcoded string. Will say "Good morning" in the evening.
**Fix:** Dynamic greeting based on `new Date().getHours()`.

### 6. "Simone" hardcoded in content page subtitle
**File:** `app/dashboard/content/page.tsx` line 81
**Problem:** `"Audio messages and content for Simone"` — hardcoded. If the care receiver's name is changed in Settings, this stays wrong.
**Fix:** Fetch the care receiver name via SWR and use it in the subtitle.

### 7. No delete button on audio content
**File:** `components/dashboard/AudioContentCard.tsx`
**Problem:** Users can Send Now, Schedule, and toggle Recommendable — but cannot delete an audio item. There is also no `deleteAudioContent` function in `lib/api.ts`.
**Fix:** Add `deleteAudioContent()` to api.ts + mocks. Add a Delete button (with ConfirmModal) to AudioContentCard.

### 8. Device buttons have 300ms tap delay on mobile
**File:** `components/device/KioskShell.tsx` — all `<button>` elements
**Problem:** Mobile browsers add a 300ms delay to `click` events by default unless `touch-action: manipulation` is set. On a kiosk used by elderly users, this lag is very noticeable and confusing.
**Fix:** Add `style={{ touchAction: "manipulation" }}` or a CSS class to all interactive device buttons.

### 9. Settings page imports `mockCaregiver` just to get an ID
**File:** `app/dashboard/settings/page.tsx` line 15 + 79
**Problem:** `import { mockCaregiver } from "@/lib/mocks"` is used only to pass `mockCaregiver.id` to `getCaregiver()`. In real mode, this is wrong — the caregiver ID should come from config or the care receiver's `caregiver_id` field.
**Fix:** Fetch caregiver ID from `careReceiver.caregiver_id` once the care receiver is loaded.

### 10. Stale comment in device page
**File:** `app/device/page.tsx` lines 1–2
**Problem:** Comment says "Wave 2 — Agent D will implement..." — old scaffolding comment.
**Fix:** Remove the comment.

### 11. DemoPanel mock feedback misleads
**File:** `components/dashboard/DemoPanel.tsx`
**Problem:** In mock mode, "✓ Reminder triggered" appears after clicking — but nothing actually happens on the device (device gets the mock action from the static mock array, not a real triggered one). The message is technically true (the function was called) but misleading.
**Fix:** Add a note like `[mock mode — check device tab]` when `USE_MOCK` is true.

---

## 🔵 Nice to Have (Polish, Not Blocking)

### 12. Skeleton component should be shared
**File:** `app/dashboard/page.tsx` lines 12–14
**Problem:** `function Skeleton()` defined inline in dashboard/page.tsx. The same pattern is duplicated across pages.
**Fix:** Move to `components/ui/Skeleton.tsx` and import it.

### 13. Calendar "Send Now" doesn't pass item context
**File:** `app/dashboard/calendar/page.tsx` lines 154–162
**Problem:** `handleSendNow(item)` calls `triggerReminderNow(CARE_RECEIVER_ID)` — the item itself is not passed. Fine for demo, but the backend won't know which reminder to fire.
**Fix:** For now, acceptable — but the API should eventually accept a `calendar_item_id` param.

### 14. Device idle state has no "no pending actions" indicator
**File:** `components/device/KioskShell.tsx`
**Problem:** After the mock action is processed, the device sits in IDLE with "Hello, Simone / I'm here whenever you need me" indefinitely. There's no visual indicator distinguishing "actively connected" from "no actions pending". Fine for now.

### 15. No onboarding flow
**File:** N/A
**Problem:** If the backend DB is empty (first run), the app shows empty states but no way to create the initial caregiver/care-receiver profiles from the UI.
**Fix:** Wave 3 — add a simple setup screen or seeded data.

---

## Summary Table

| # | Issue | Severity | File(s) | Effort |
|---|---|---|---|---|
| 1 | No viewport meta | 🔴 Critical | `app/layout.tsx` | 2 min |
| 2 | Device page scrollable | 🔴 Critical | `app/device/layout.tsx` (new) | 5 min |
| 3 | Wrong sound wave animation | 🔴 Critical | `globals.css`, `KioskShell.tsx` | 15 min |
| 4 | Events logged always ≤5 | 🔴 Critical | `app/dashboard/page.tsx` | 2 min |
| 5 | Greeting always "morning" | 🟡 Medium | `app/dashboard/page.tsx` | 3 min |
| 6 | "Simone" hardcoded | 🟡 Medium | `app/dashboard/content/page.tsx` | 5 min |
| 7 | No delete audio content | 🟡 Medium | `lib/api.ts`, `AudioContentCard.tsx` | 20 min |
| 8 | 300ms tap delay on device | 🟡 Medium | `KioskShell.tsx` | 5 min |
| 9 | Settings wrong caregiver ID | 🟡 Medium | `app/dashboard/settings/page.tsx` | 5 min |
| 10 | Stale comment in device page | 🔵 Low | `app/device/page.tsx` | 1 min |
| 11 | Demo panel misleads in mock | 🔵 Low | `DemoPanel.tsx` | 5 min |
| 12 | Skeleton not shared | 🔵 Low | multiple files | 10 min |
| 13 | Send Now no item context | 🔵 Low | calendar page | accept for now |
| 14 | No "idle connected" indicator | 🔵 Low | KioskShell | accept for now |
| 15 | No onboarding flow | 🔵 Low | N/A | Wave 3 |

---

## Fix Plan

### Implemented immediately (all in one pass):
- Issues 1, 2, 3, 4, 5, 8, 10 — all mechanical/CSS fixes, done directly
- Issue 12 — extract Skeleton to shared component

### Requires agent (more involved):
- Issue 6 — content page: fetch name dynamically
- Issue 7 — delete audio: api.ts + AudioContentCard + mock
- Issue 9 — settings: fix caregiver ID fetch chain
- Issue 11 — DemoPanel mock mode awareness
