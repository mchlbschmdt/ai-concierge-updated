import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyALtca06R8m8ApMWllBiQaMm8HVSD2cXfs",
  authDomain: "ai-concierge-app-455401.firebaseapp.com",
  projectId: "ai-concierge-v2",
  storageBucket: "ai-concierge-app-455401.appspot.com",
  messagingSenderId: "970043813008",
  appId: "1:970043813008:web:a92ec06679c1f7d7dd3c15",
  measurementId: "G-GCF0DDT4MH"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
