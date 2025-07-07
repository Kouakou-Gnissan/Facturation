// Configuration Firebase
// IMPORTANT: Remplacez ces valeurs par celles de votre projet Firebase
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT_ID.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

// Initialisation Firebase
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/* 
INSTRUCTIONS POUR CONFIGURER FIREBASE:

1. Allez sur https://console.firebase.google.com/
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Dans la console Firebase, cliquez sur "Authentication" dans le menu de gauche
4. Allez dans l'onglet "Sign-in method"
5. Activez "Email/Password" comme méthode de connexion
6. Cliquez sur "Project Settings" (icône d'engrenage)
7. Faites défiler jusqu'à "Your apps" et cliquez sur "Add app" puis sélectionnez "Web"
8. Enregistrez votre app avec un nom (ex: "Facturation App")
9. Copiez les valeurs de configuration et remplacez-les dans ce fichier
10. Assurez-vous d'ajouter votre domaine dans les "Authorized domains" si nécessaire
*/

