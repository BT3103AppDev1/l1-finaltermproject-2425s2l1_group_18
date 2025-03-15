import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import VueChartkick from 'vue-chartkick';
import 'chartkick/chart.js';

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhGfARTjQMgdI7OwfC_9OTBv6lISJ1abk",
  authDomain: "finbonacci-6bccb.firebaseapp.com",
  projectId: "finbonacci-6bccb",
  storageBucket: "finbonacci-6bccb.firebasestorage.app",
  messagingSenderId: "303713239932",
  appId: "1:303713239932:web:2f034ad54ec75ba0285af9"
};

// Initialize Firebase
initializeApp(firebaseConfig);

const app = createApp(App);
const db = getFirestore();
export { db };
app.use(router);
app.use(VueChartkick);
app.mount("#app");