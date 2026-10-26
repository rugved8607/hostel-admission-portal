# Manual Testing

Use two different browser profiles or browsers for admin and student sessions. Supabase stores the session in cookies, and signing in as one role can replace the other role's session.

## Seeded logins

- Admin: `admin@hostel-demo.edu` / `HostelDemo2026!`
- Student: `aarav.sharma.2026bce1001@college.edu` / `HostelDemo2026!`

## Student workflow

1. Open `/` in the student browser and sign in with the student account.
2. Confirm `/student/apply` shows prefetched student details and the four document controls.
3. Upload a PDF, JPG, or PNG smaller than 5 MB for every required document.
4. Confirm each row changes to `Uploaded` and submit the application.
5. Sign out, then sign in as the admin in the other browser.
6. Open `/admin/verification`, select the submitted application, and confirm all four documents have `View` links.
7. Open each document and confirm the signed URL displays only the correct file.
8. Approve the student and confirm the application status changes.

## Admin round workflow

1. Open `/admin/login` and sign in with the admin account.
2. Confirm direct navigation to `/admin/rooms` shows an SVG room layout, status legend, and details after selecting a room.
3. Open `/admin/allocation` and create a round with a future deadline.
4. Open formation, then switch to the student browser and create/join/submit a 3-4 member group.
5. Close formation and run allocation. Double-click repeated controls; each should remain disabled or return an idempotent result.
6. Publish the allocation, then confirm `/student/dashboard` reports the resulting status.
7. Create the next round and confirm there is not a duplicate active draft.

## Authorization and recovery

- A student must be redirected away from every `/admin/*` route.
- An admin must be redirected away from every `/student/*` route.
- Expired or missing sessions must return to `/admin/login` or `/` respectively.
- API calls that fail must show a clear error and a retry action where the page provides data.

## Automated smoke test

Run:

```powershell
npm test -- --run src/services/round-workflow-smoke.test.ts
```

The workflow test uses mocks and never writes to the real database.
