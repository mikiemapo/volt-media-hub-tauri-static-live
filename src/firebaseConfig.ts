import { initializeApp } from "firebase/app";
import { initializeAuth, indexedDBLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAsGL0dW49aO_s01xUfPl7QVztzBokwjaU",
    authDomain: "az-104-mediahub.firebaseapp.com",
    projectId: "az-104-mediahub",
    storageBucket: "az-104-mediahub.firebasestorage.app",
    messagingSenderId: "123612581609",
    appId: "1:123612581609:web:f475c4800315b0b637aa78",
    measurementId: "G-XSMRH058ZW"
};

// 1. Initialize the App
const app = initializeApp(firebaseConfig);

// 2. Initialize Auth with "IndexedDB" (CRITICAL: This prevents the gapi crash)
const auth = initializeAuth(app, {
    persistence: indexedDBLocalPersistence
});

// 3. Initialize Firestore
const db = getFirestore(app);

export { auth, db };
