// TODO: Replace with your own Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCnMNugdz9YiLPP2bID8VSIVKwqsJ4Q9Vk",
  authDomain: "mood-tracker-67587.firebaseapp.com",
  projectId: "mood-tracker-67587",
  storageBucket: "mood-tracker-67587.firebasestorage.app",
  messagingSenderId: "108204692483",
  appId: "1:108204692483:web:8d5d442f11e6994a54ea36"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); 