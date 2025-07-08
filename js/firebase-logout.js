// firebase-logout.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCwCkHtoEqwKalAXePnO6246UeUL1AKkOg",
    authDomain: "appli-facturation.firebaseapp.com",
    projectId: "appli-facturation",
    storageBucket: "appli-facturation.firebasestorage.app",
    messagingSenderId: "731190370993",
    appId: "1:731190370993:web:db710c33dab92ef79ef890",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();

window.logoutFirebase = async function (redirectUrl = 'login.html') {
    try {
        await signOut(auth);
        console.log("Utilisateur déconnecté");
        window.location.href = redirectUrl;
    } catch (error) {
        console.error("Erreur de déconnexion :", error);
        alert("Une erreur est survenue.");
    }
};

