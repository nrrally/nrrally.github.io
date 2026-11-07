/* Connects this website to its Firebase project (Google sign-in and the results database).

   HOW TO FILL IT IN
   1. Firebase console → Project settings (gear icon) → General → "Your apps" → the web app → "Config".
   2. Copy ONLY the block that starts with   const firebaseConfig = {   and ends with   };
   3. Replace the block below with it (keep the last line, window.NR_FIREBASE = …, as it is) and save.

   These values are not passwords. They only say which Firebase project to talk to; they're visible to every
   visitor anyway. Who can read or change data is decided by the database rules (docs/firestore.rules). */
const firebaseConfig = {
  apiKey: "AIzaSyBpsTPmlpz04LGg2Sa1iycEnDgw4ncPjIk",
  authDomain: "nrrally-e3492.firebaseapp.com",
  projectId: "nrrally-e3492",
  storageBucket: "nrrally-e3492.firebasestorage.app",
  messagingSenderId: "468691536840",
  appId: "1:468691536840:web:d0aadfdb033ad3af25cefd"
};
window.NR_FIREBASE = firebaseConfig;
