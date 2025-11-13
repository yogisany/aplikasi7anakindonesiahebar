import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

//
// TODO: Ganti dengan konfigurasi Firebase Anda sendiri.
// Anda bisa mendapatkannya dari Firebase Console proyek Anda:
// Setelan Proyek > Umum > Aplikasi Anda > Konfigurasi SDK > CDN.
//
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE"
};

// Inisialisasi Firebase
const app = firebase.initializeApp(firebaseConfig);

// Ekspor instance layanan Firebase untuk digunakan di seluruh aplikasi
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
