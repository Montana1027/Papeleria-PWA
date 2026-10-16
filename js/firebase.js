
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCNx0XsNwYyl7Hg7jMuhtettDvbK_4kwWw",
    authDomain: "papeleria-e0b56.firebaseapp.com",
    projectId: "papeleria-e0b56",
    storageBucket: "papeleria-e0b56.firebasestorage.app",
    messagingSenderId: "465509584566",
    appId: "1:465509584566:web:8a6cff482f363dd50b2017"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export {
    auth,
    db,
    signInWithEmailAndPassword,
    collection,
    addDoc,
    onSnapshot,
    signOut,
    onAuthStateChanged,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    runTransaction
};

