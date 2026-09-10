# Modern Language Center — Korean Test + Firebase

## Final build

This package is based on the existing `Modern_Language_Center_Korean_Test_Admin_FINAL.zip` and keeps the existing student exam UI/flow. Firebase is connected for cross-device result storage.

### Student flow
- No visible student login.
- Firebase Anonymous Authentication runs in the background.
- 10 questions / 5 minutes / sequential one-way flow.
- Result shows actual `EXAM TIME` in `M:SS`.

### Admin flow
`관리자 패널 · Admin Panel` → password popup → Firebase Authentication → Firestore Admin Dashboard.

The admin can view, **edit**, and **delete** past exam results. Edit supports Student Name, Score, and EXAM TIME. PASS/FAIL is recalculated automatically from the score. Delete requires confirmation.

## Firebase project already connected

- Project ID: `mlc-korean`
- Web app: `MLC Korean Test`
- Firestore database: `(default)`
- Authentication: Anonymous enabled

Firebase Web configuration is stored in `firebase-config.js`. The Firebase web API key is not an admin secret; Firestore Rules and Authentication provide access control.

## One required Admin setup in Firebase Console

The Admin Panel does **not** keep the admin password in JavaScript. The password is handled by Firebase Authentication.

1. Firebase Console → **Authentication** → **Sign-in method**.
2. Enable **Email/Password** and save.
3. Open **Authentication → Users**.
4. Add a new user:
   - Email: `admin@mlc.local`
   - Password: `Eps@2026`
5. The website Admin Panel will use that account behind the existing password popup.

Students continue using Anonymous Authentication and never see an account/login screen.

## Firestore collection

The website creates:

`examResults/{autoDocumentId}`

Each result contains `uid`, `name`, `score`, `total`, `time`, `passed`, `submittedAt`, `autoSubmitted`, and `testId`.

## Security model

- Anonymous students: create-only result submission.
- Students: cannot read, update, or delete past results.
- Admin account `admin@mlc.local`: can read, update, and delete `examResults`.
- Firestore is not left in test/open mode.

The deployed rules are in `firestore.rules`.

## GitHub Pages

The project is static and GitHub Pages compatible. Upload the project files to the repository root and enable GitHub Pages from the repository's Pages settings.

The included `.firebaserc` points to `mlc-korean`, and `firebase.json` is configured to deploy the Firestore rules as well as Firebase Hosting if Firebase CLI is used.
