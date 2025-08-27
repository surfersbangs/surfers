// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAy4AbBBX6VdlqoOP5N0TenqGCdnIlBlxU",
  authDomain: "surfers-c103d.firebaseapp.com",
  projectId: "surfers-c103d",
  storageBucket: "surfers-c103d.firebasestorage.app",
  messagingSenderId: "44214706885",
  appId: "1:44214706885:web:7b5c5dd0368431f937c6ac",
};

signInWithRedirect(auth, provider);
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
