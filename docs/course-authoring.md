# Course authoring — feature spec

The first working feature of the LMS. Admins and instructors create courses made of ordered
lessons (text, video or document), then publish them. Signed-in users browse published courses
and read their lessons. Enrolment, progress, quizzes, certificates and reports are **not** part of
this feature (see `ROADMAP.md`).

## Roles and permissions

| Action                                       | Admin | Instructor          | Learner |
| -------------------------------------------- | ----- | ------------------- | ------- |
| Browse published courses, open their lessons | ✓     | ✓                   | ✓       |
| See draft courses                            | all   | own only            | ✗       |
| Create a course                              | ✓     | ✓ (becomes creator) | ✗       |
| Edit / publish / unpublish / delete a course | all   | own only            | ✗       |
| Add / edit / delete / reorder lessons        | all   | own only            | ✗       |

"Own" = `Course.createdById` is the signed-in user. Forbidden or invisible courses return **404**
(not 403) so draft ids don't leak; a signed-in learner calling `/manage/*` gets **403**.

## Users

The auth guard verifies the token, then upserts the `User` row by `externalId` (token subject;
dev tokens use `dev-<email>`), syncing `roles` from the token when they change. The stored
`email` is replaced only by a **verified** token email (the `email_verified` claim), so a user who
edits their own email attribute can't impersonate someone else. Identity is `externalId` only:
emails are not unique, so a user deleted and re-created in the identity provider with the same email (new `sub`)
still gets in, as a new LMS user. Rows are never relinked by email.
`CurrentUser.id` is the **database uuid**. `GET /api/me` returns `{ id, email, roles }`.

## API (prefix `/api`, bearer token required on all routes)

Types live in `packages/shared/src/api.ts`. Dates are ISO strings.

| Method + path                                  | Who           | Body                  | Returns                                                                                        |
| ---------------------------------------------- | ------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| `GET /courses`                                 | any           | –                     | `CourseSummary[]` published only, newest first                                                 |
| `GET /courses/:id`                             | any           | –                     | `CourseDetail`; drafts 404 unless caller can edit                                              |
| `GET /manage/courses`                          | admin, instr. | –                     | `ManagedCourseSummary[]` (admin: all, instructor: own), most recently updated first            |
| `POST /manage/courses`                         | admin, instr. | `CreateCourseInput`   | `CourseDetail` (201), draft                                                                    |
| `GET /manage/courses/:id`                      | can edit      | –                     | `CourseDetail`                                                                                 |
| `PATCH /manage/courses/:id`                    | can edit      | `UpdateCourseInput`   | `CourseDetail`                                                                                 |
| `POST /manage/courses/:id/publish`             | can edit      | –                     | `CourseDetail`; 400 if no lessons; idempotent                                                  |
| `POST /manage/courses/:id/unpublish`           | can edit      | –                     | `CourseDetail`; idempotent                                                                     |
| `DELETE /manage/courses/:id`                   | can edit      | –                     | 204; 409 if published                                                                          |
| `POST /manage/courses/:id/lessons`             | can edit      | `LessonInput`         | `Lesson` (201), appended at the end                                                            |
| `PATCH /manage/courses/:id/lessons/:lessonId`  | can edit      | `UpdateLessonInput`   | `Lesson`                                                                                       |
| `DELETE /manage/courses/:id/lessons/:lessonId` | can edit      | –                     | 204; remaining positions renumbered 0..n-1; 409 if it is the last lesson of a published course |
| `PUT /manage/courses/:id/lessons/order`        | can edit      | `ReorderLessonsInput` | `Lesson[]` in new order; 400 unless `lessonIds` is exactly the course's lesson ids             |

`CourseDetail.canEdit` is true for admins and for the creating instructor.
`publishedAt` is set when a course is published and cleared when unpublished.
Any successful change to a course or its lessons bumps `Course.updatedAt`.
Non-uuid ids return 404.

### Validation (limits in `LIMITS`, `packages/shared/src/lessons.ts`)

Strings are trimmed; empty optional strings become `null`. Unknown fields are rejected (400).

- Course: `title` 1–200 chars; `description` ≤ 2000 or null.
- Lesson: `title` 1–200; `type` ∈ `text | video | document`;
  - `text`: `body` required (1–50 000); `url` must be empty/null.
  - `video`/`document`: `url` required, absolute **https** URL ≤ 2000; `body` optional notes ≤ 5000.
  - `durationMinutes`: integer 1–600 or null.
  - A course holds at most 200 lessons (400 when full).
- `PATCH` lessons: the merged result (existing lesson + patch) must pass the same rules.

Errors use Nest's default body: `{ statusCode, message, error }`. Validation errors put a
human-readable string (or list of strings) in `message`.

## Web

| Route                                  | Page                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `/`                                    | Home: who you are, links to catalogue (and Manage for authors)                        |
| `/courses`                             | Catalogue of published courses                                                        |
| `/courses/:courseId`                   | Course overview + ordered lesson list                                                 |
| `/courses/:courseId/lessons/:lessonId` | Lesson viewer with previous / next                                                    |
| `/manage`                              | Authoring list (drafts + published) and "New course"                                  |
| `/manage/courses/:courseId`            | Edit course: details, publish/unpublish, delete, lessons CRUD + reorder, preview link |

Lesson rendering: `text` body shown as plain text with line breaks preserved (no HTML/markdown).
`video`: direct `.mp4`/`.webm`/`.ogg` URLs play in `<video controls>`; YouTube URLs embed via
`https://www.youtube-nocookie.com/embed/<id>`; Vimeo via `https://player.vimeo.com/video/<id>`;
anything else is an "Open video" link. `document`: "Open document" link (new tab,
`rel="noopener noreferrer"`). Notes (`body`) shown under the media.

In local development a "Sign in as" switcher (header) picks a seeded user
(`apps/web/src/api/dev-auth.ts`). It is not rendered in production builds.

## Seed data

`npm run db:seed -w @lms/api` creates the four dev users from `dev-auth.ts`, two published
courses with lessons and one draft course. Safe to re-run (idempotent).
