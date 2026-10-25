# Hostel Admission Portal

## Seed the demo database

Configure `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env`,
then run:

```bash
npx prisma db seed
```

The seed creates 120 students, four hostels with 200 rooms, and staff accounts.
It creates no student groups or room allotments, so the admission and allocation
flow can be demonstrated from the beginning. Re-running the seed updates the
same demo accounts and records.

### Demo logins

All seeded accounts use the password `HostelDemo2026!`.

| Role | Email |
| --- | --- |
| Admin | `admin@hostel-demo.edu` |
| Warden | `warden@hostel-demo.edu` |
| Male student | `aarav.sharma.2026bce1001@college.edu` |
| Female student | `ananya.sharma.2026bce1061@college.edu` |

These shared demo credentials are for development and demonstrations only.
Change them before using seeded accounts in a non-demo environment.
