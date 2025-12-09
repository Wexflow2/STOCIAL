import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCVs3UtSJf2UC0A9Gfl0J-Q47f7SmFNT7I",
  authDomain: "knowhop-social.firebaseapp.com",
  projectId: "knowhop-social",
  storageBucket: "knowhop-social.firebasestorage.app",
  messagingSenderId: "1045531959390",
  appId: "1:1045531959390:web:51dd0ee16d37a47aae94cf",
  measurementId: "G-MKCNKJSLPP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});
