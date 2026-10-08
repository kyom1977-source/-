# Security Specification for Smart Classroom Seating Manager

## Data Invariants
1. Teacher Ownership: All classrooms, students, and seating arrangements are tied to the authenticated teacher's `teacherId` matching `request.auth.uid`.
2. Hierarchical Integrity: Students and Arrangements must belong to an existing Classroom owned by the same teacher.
3. User Profile Isolation: Each teacher can only read and write their own `/users/{userId}` record.
4. Input Boundary: String lengths for names, titles, and IDs are strictly constrained (IDs <= 64 chars, names <= 100 chars).
5. Immutable Ownership: Once created, `teacherId` and `createdAt` cannot be modified.

## The Dirty Dozen Payloads
1. Cross-teacher classroom read: Teacher A attempts to list or read Teacher B's classroom -> DENIED.
2. Cross-teacher student modification: Teacher A attempts to update or delete Teacher B's student -> DENIED.
3. Unauthenticated classroom creation: Anonymous/unauthed user tries to write a classroom -> DENIED.
4. Teacher ID spoofing on classroom creation: Teacher A creates a classroom with `teacherId: 'teacherB'` -> DENIED.
5. Classroom owner alteration: Updating `teacherId` to transfer ownership -> DENIED.
6. Overlong field injection attack: Attempting to insert a 100KB string into student `name` or `notes` -> DENIED.
7. Shadow field injection: Adding unknown fields like `isAdmin: true` -> DENIED.
8. Orphan student creation: Inserting student with non-existent or foreign classId -> DENIED.
9. Cross-teacher seating history scraping: Attempting to list all arrangements without teacherId query filter -> DENIED.
10. Unverified email privilege escalation: Bypassing auth checks -> DENIED.
11. Invalid ID injection: Document ID containing prohibited characters or oversized paths -> DENIED.
12. Terminal state / timestamp corruption: Overwriting immutable timestamps -> DENIED.
