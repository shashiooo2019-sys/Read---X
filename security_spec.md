# security_spec.md

## 1. Data Invariants
- `compliance_verifications`: A verification cannot exist without a valid `topicId` and `userId`.
- `topics`: A topic ID must be unique.
- `topic_assignments`: An assignment must link a `topicId` to a `userId`.

## 2. The "Dirty Dozen" Payloads (Examples)
1. Creating a verification with missing `topicId`.
2. Creating a verification with missing `userId`.
3. Creating a verification with `id` > 128 chars.
4. Updating a verification status to an invalid value (not in enum).
5. Updating a topic status to closed without `closedAt`.
6. Creating a topic with title > 300 chars.
7. Updating a topic assignment with an invalid `status`.
8. Updating a user with `email` > 256 chars.
9. Injecting a 2KB junk string as `topicId`.
10. Attempting to set `isAdmin: true` on a user profile creation.
11. Attempting to modify `createdAt` of a verification.
12. Attempting to delete a topic without authorization.

## 3. Test Runner (Drafted - to be implemented as firestore.rules.test.ts if needed)
- Verifies that all Dirty Dozen payloads return PERMISSION_DENIED.
