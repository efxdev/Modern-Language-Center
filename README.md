# Modern Language Center — Firebase-ready Korean Class Test

## What changed

- Student still needs only a name; no student account.
- Admin entry is a discreet `Admin` button.
- Admin UI asks only for a password.
- Behind the scenes, the password is handled by Firebase Authentication.
- Teacher results are designed to live in Firestore.
- GitHub preview works without Firebase by using local browser results.
- Same project can be deployed to Firebase Hosting, Cloudflare Pages, or GitHub Pages.
- Test ID starts with the student's name, e.g. `MAHAMUD-MLC-260910-001`.

## Important security note

Do NOT hard-code an admin password in `app.js` or `firebase-config.js`.
Create a Firebase Authentication Email/Password user for the admin account, using:
`admin@mlc.local`
and your private password.

For a fully production-grade deployment, result submission should be moved behind a trusted Firebase backend/Cloud Function so an unauthenticated student cannot write directly to Firestore. This package keeps the UI and architecture ready for that step.

## Firebase setup

1. Create a Firebase project.
2. Enable Authentication → Sign-in method → Email/Password.
3. Create the admin user with email `admin@mlc.local` and your private password.
4. Create a Firestore database.
5. Copy the Firebase Web App config into `firebase-config.js`.
6. Replace `YOUR_FIREBASE_PROJECT_ID` in `.firebaserc`.
7. Deploy Hosting and Firestore rules.

## GitHub test

You can upload the same project to GitHub. Static pages run normally.
If Firebase config is still placeholder, exam results are kept only in the current browser for preview.

## Recommended final security step

Before public production use, add a Firebase Cloud Function (or another trusted server endpoint) that accepts a signed/validated test submission and writes to Firestore. This prevents students from manipulating Firestore writes from browser developer tools.


## Result screen update
- Removed Print, Save, and Retake buttons from the student result screen.
- The time value is displayed in Bangla, e.g. `০ মিনিট ৫ সেকেন্ড`.


## How the teacher/admin enters

On the very bottom of the student home screen there is a discreet **관리자 패널 · Admin Panel** button.

1. Teacher taps **관리자 패널 · Admin Panel**.
2. A password popup appears.
3. Teacher enters the private admin password.
4. If Firebase is configured and the Firebase Authentication admin account is valid, the Admin Dashboard opens.
5. Students do not need an account or login.

The admin email is kept as an internal Firebase Authentication identifier (`admin@mlc.local` in the template); students never see or use it.


## Owner-supplied admin password

The requested GitHub preview password is set to `Eps@2026`.

**Security note:** a password embedded in client-side JavaScript can be discovered from the browser source. This is therefore for the private/testing phase only. Before public production, use Firebase Authentication with a private password and remove the preview password from the client.


## v7 fixes

- Result card now shows `EXAM TIME` with English `M:SS` format, e.g. `3:40`.
- Admin Panel is a refined dark pill at the bottom of the home card.
- Admin Panel works in GitHub/static preview without requiring Firebase to load first.
- Password `Eps@2026` opens the Admin Dashboard in preview mode.
- Firebase SDKs are loaded only when a real Firebase config is present, preventing GitHub preview from breaking when Firebase is not configured.


## v8 — Admin access reliability fix

The Admin Panel trigger is now a direct button action and does not depend on Firebase or ES-module loading. On GitHub Pages:

**Admin Panel → Password → Admin Dashboard**

Password: `Eps@2026`

This guarantees the password popup can open during static GitHub testing. Firebase integration can be connected after the Firebase project is configured.


## v9 — Admin panel is fully independent

The Admin Panel is now controlled by an inline script in `index.html`, so it does not depend on Firebase, ES modules, or `app.js` loading correctly.

GitHub flow:
**Admin Panel → Password `Eps@2026` → Admin Dashboard**

This is intentionally isolated for reliable static-hosting testing.


Admin FIX: one isolated admin implementation; result records are persisted in localStorage under mlc_results and mirrored as mlc_last_result for GitHub testing. Production cross-device results still require Firebase/Firestore.
