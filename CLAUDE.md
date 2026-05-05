# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Branching Workflow

**All work must happen on a feature branch. Never commit directly to `main`.**

### Rules for every task

1. Before writing any code, create a branch named after the Jira ticket:
   ```bash
   git checkout -b SCRUM-XX   # replace XX with the ticket number
   ```
2. Do all work on that branch.
3. When the task is complete, push the branch and open a pull request against `main`:
   ```bash
   git push -u lawnCare SCRUM-XX
   gh pr create --base main --title "SCRUM-XX: <ticket summary>" --body "Closes SCRUM-XX"
   ```
4. **Stop there.** Do not merge the PR. A human must review and approve before anything lands on `main`.
5. Report the PR URL to the user so they can review it.

### Branch naming

| Ticket | Branch name |
|--------|-------------|
| SCRUM-5 | `SCRUM-5` |
| SCRUM-12 | `SCRUM-12` |

### What agents must never do

- `git push lawnCare main` (direct push to main)
- `git merge` or `gh pr merge` without explicit human instruction
- Force-push to any branch (`--force`)
- Skip pre-commit hooks (`--no-verify`)

## Commands

```bash
npm run dev          # start dev server at localhost:3000
npm run build        # production build
npm run lint         # ESLint via next lint
npm test             # run all Jest tests
npm run test:watch   # watch mode
npm run test:coverage

# Run a single test file
npx jest __tests__/lib/utils.test.ts

# Run tests matching a name pattern
npx jest -t "getStatus"
```

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Architecture

### Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS
- All components are `'use client'` — no server components yet
- Styling: Tailwind only, no CSS modules or inline styles beyond Tailwind classes

### Auth flow

Authentication is handled entirely through `app/context/AuthContext.tsx`, which wraps the whole app via `app/layout.tsx`. Auth uses **Supabase OTP email magic links** (no passwords). The flow is:

1. `/signup` — collect name + email → call `sendOtp` → enter 8-char OTP → `verifyOtp` → redirect to `/onboarding` (new user) or `/` (returning)
2. `/login` — collect email → `sendOtp` → OTP → redirect to `/onboarding` or `/`
3. `/onboarding` — 3-step wizard (location → mower → lawn details) → calls `completeOnboarding`, seeds mower into localStorage, redirects to `/`

`AuthContext` also handles a race condition: the Supabase `onAuthStateChange` callback holds the auth mutex, so DB calls are deferred via `setTimeout(0)` to avoid a deadlock.

**Auth redirect pattern** — each protected page handles its own redirect via `useEffect`:
```ts
useEffect(() => {
  if (!authLoading && !user) router.push('/login')
  if (!authLoading && user && !user.onboardingComplete) router.push('/onboarding')
}, [user, authLoading, router])
```

### Data storage split

- **Supabase `users` table** — profile data only: `id`, `first_name`, `last_name`, `zip_code`, `city`, `state`, `country`, `grass_type`, `lawn_size_sq_ft`, `onboarding_complete`, `avatar_url`, `created_at`.
- **localStorage** — all application data. Keys are namespaced by user ID to prevent cross-account bleed:
  - `lawncare-lawn-v2-{userId}` — activity logs (watering/mowing/fertilizing), intervals, next recommended dates
  - `lawncare-equipment-v2-{userId}` — equipment shed items and their maintenance logs
  - `lawncare-schedule-v1-{userId}` — calendar scheduled tasks
  - `lawncare-photos-v1-{userId}` — lawn photo gallery

The dashboard (`app/page.tsx`) reads all localStorage keys after hydration and syncs back on every state change. The `hydrated` flag prevents writing defaults over real saved data on first load.

### Weather

`app/hooks/useWeather.ts` fetches weather without any API key using two free services:
- **Geocoding**: `geocoding-api.open-meteo.com` for US ZIPs, `nominatim.openstreetmap.org` for Canadian postal codes
- **Forecast**: `api.open-meteo.com` — 7-day daily forecast + current conditions

Results are cached in a module-level `Map` keyed by zip code for the lifetime of the browser session. The hook also derives `rainExpectedSoon`/`recommendSkipWatering` booleans from the next 2 days' precipitation probability (threshold: > 50%).

### Key utilities

`app/lib/utils.ts` — date and status helpers used throughout the dashboard:
- `getStatus(nextDate)` → `'on_track' | 'due_soon' | 'overdue' | 'never'` — `due_soon` is ≤ 2 days out
- `addDays(dateStr, n)` — returns new ISO date string; used to compute `nextRecommended` after logging an activity

`app/lib/mowerData.ts` — static list of `MOWER_MAKES` with model arrays, plus the `OTHER` sentinel. Powers the `MowerMakeModelPicker` cascading dropdowns used in both the onboarding wizard and the equipment shed modal.

### NavBar

The navbar is fixed and includes an SVG grass strip below the logo bar, making the total height 104px. All page content is wrapped in `<div className="pt-[104px]">` in `app/layout.tsx`.

### Testing

Tests live in `__tests__/`. Jest uses `jsdom` environment, `@testing-library/react`, and the `@/` path alias mapped to the project root. Supabase and Next.js router are mocked in `jest.env.ts` and `jest.setup.ts`.

## Code Style

- No comments unless the WHY is non-obvious
- No emojis in code or commits unless the user asks
- Keep components in `app/components/`, hooks in `app/hooks/`, context in `app/context/`
