# API contract

All routes are server-side Next.js route handlers. Requests must carry a valid
Supabase session cookie. The API resolves the Supabase identity to the `User`
row by `supabaseAuthId`; request roles or user metadata are never trusted for
authorization. Student routes require `STUDENT`; administration routes allow
`ADMIN` and `WARDEN`.

Bodies and path identifiers are validated with Zod. Errors use the shape
`{ "error": "Human-readable message", "code": "STABLE_ERROR_CODE" }`.
Unexpected failures return HTTP 500 with `INTERNAL_ERROR`; known conflicts,
validation failures, and authorization errors use 4xx status codes.

CGPA is always read from `Student.cgpa`. Client input cannot set or override
student CGPA, group average, or maximum CGPA.

## Student group routes

| Method and path | Request | Result |
| --- | --- | --- |
| `POST /api/applications/me` | `{ "phone": "...", "address": { "street": "...", "city": "...", "state": "...", "pincode": "..." } }` | Submits the caller's application and saves their phone/address details. |
| `GET /api/students/me` | None | The caller's own student profile and application status. |
| `GET /api/students/lookup?rollNo=...` | Roll number query | Resolves the student login identifier to an email address. |
| `GET /api/groups/open` | None | Forming groups in the currently open round. |
| `GET /api/rooms` | None | Room inventory matching the caller's hostel gender, including geometry and status. |
| `GET /api/groups/me` | None | The caller's current group and allocation/next-step status. Does not expose other students' unrelated groups. |
| `POST /api/groups` | `{}` | Creates a one-member `FORMING` group in the open round; the creator is its leader. |
| `POST /api/groups/join` | `{ "groupId": "<uuid>" }` | Joins a current-round forming group. Maximum size is four. |
| `POST /api/groups/{groupId}/leave` | None | Removes the caller from the group. A submitted group becomes forming; groups below three cannot be submitted. |
| `POST /api/groups/{groupId}/dissolve` | None | Deletes group membership, marks the group `DISSOLVED`, and writes an audit event. |
| `POST /api/groups/{groupId}/submit` | None | Submits the group only when it has exactly three or four same-gender members. |
| `PUT /api/groups/{groupId}/preferences` | `{ "preferences": ["<room-uuid>", ...] }` | Stores ordered room IDs for a forming or submitted group before allocation. |

The schema has no invite-code column, so joining uses a group UUID, not an
invite code. Every group mutation requires an open formation round and an
unexpired deadline. Group/student/round rows are locked and transactions use
serializable isolation with bounded retries. A unique `GroupMember.studentId`
constraint provides a final safeguard against multiple memberships.

## Admin and warden round routes

| Method and path | Request | Result |
| --- | --- | --- |
| `GET /api/admin/applications` | None | Student profiles and application review records for the verification desk. |
| `PATCH /api/admin/applications/{studentId}` | `{ "status": "under_review \| approved \| rejected \| correction_required", ... }` | Updates review status, reason, and verified CGPA on approval. |
| `GET /api/admin/rounds` | None | Round history with group, snapshot, and allotment counts. |
| `POST /api/admin/rounds` | `{ "formationDeadline": "<ISO timestamp>", "tieBreakRule": "ROLL_NO_ASC \| MAX_CGPA_THEN_ROLL_NO \| GROUP_CREATED_ASC" }` | Creates the next `DRAFT` round. Initial round number is 1. |
| `PATCH /api/admin/rounds/{roundId}/settings` | Same settings body | Sets the future deadline and tie-break rule while the round is `DRAFT` or `FORMATION_OPEN`. |
| `POST /api/admin/rounds/{roundId}/open` | None | Opens a draft round for group formation. |
| `POST /api/admin/rounds/{roundId}/close-formation` | None | Moves `FORMATION_OPEN` to `FORMATION_CLOSED`. |
| `POST /api/admin/rounds/{roundId}/allocate` | None | Runs allocation; repeated calls after allocation/publishing are idempotent. |
| `POST /api/admin/rounds/{roundId}/publish` | None | Publishes allocated results. |
| `POST /api/admin/rounds/{roundId}/close` | None | Closes counselling for a published round. |
| `GET /api/admin/rounds/{roundId}` | None | Round, group members, room assignments, and rank-ordered snapshots. |
| `POST /api/admin/rounds/{roundId}/cancel-allotment` | `{ "groupId": "<uuid>", "reason": "required explanation" }` | Releases the room, deletes allotment and membership rows, dissolves the group, and audits the cancellation. |
| `GET /api/admin/unallotted` | None | Unallotted groups, member allocation state, snapshot reason, and next-step guidance. |
| `GET /api/admin/rooms/available` | None | Available, unassigned rooms with hostel gender and location. |
| `GET /api/admin/audit` | None | Most recent 500 audit events, newest first. |

Opening a later round is performed by creating a new draft after the prior
round is `PUBLISHED` or `CLOSED`, then opening that draft. An `UNALLOTTED`
group is not carried as an eligible group: its members may leave or dissolve
it during a later formation round, then form new groups.

## Allocation behavior

Allocation is a single Prisma serializable transaction. It locks the round,
submitted groups, their students, and the free rooms with `SELECT ... FOR
UPDATE`. Submitted groups are ranked by database-derived average CGPA
descending, followed by the configured deterministic tie-break rule. For each
group, compatible rooms must be available, unassigned, capacity 3 or 4, large
enough, and in a hostel matching every member's gender. Preference position is
honored first; exact capacity fit and room number resolve subsequent choices.

Successful groups receive one room, one `Allotment` row per member, and status
`ALLOTTED`. Groups without a compatible room become `UNALLOTTED` with a reason.
Every submitted group receives a `RoundGroupSnapshot`; the round then becomes
`ALLOCATED`. Groups in later rounds are selected only from that round's
`SUBMITTED` groups. Empty inventory and no-compatible-room cases therefore
preserve the unallotted group/student records and explain the next step.
