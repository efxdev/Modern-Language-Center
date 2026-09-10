// Firebase configuration for the final deployment.
// Replace these values with your Firebase Web App configuration.
// Do NOT put the admin password here. The password is stored in Firebase Authentication.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// This is the Firebase Authentication email for the hidden admin account.
// Students never see this email in the UI.
export const ADMIN_EMAIL = "admin@mlc.local";
