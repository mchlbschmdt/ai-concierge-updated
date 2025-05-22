
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyALtca06R8m8ApMWllBiQaMm8HVSD2cXfs",
  authDomain: "ai-concierge-app-455401.firebaseapp.com",
  projectId: "ai-concierge-v2",
  storageBucket: "ai-concierge-app-455401.appspot.com",
  messagingSenderId: "970043813008",
  appId: "1:970043813008:web:a92ec06679c1f7d7dd3c15",
  measurementId: "G-GCF0DDT4MH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
