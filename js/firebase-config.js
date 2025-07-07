// Configuration Firebase
// IMPORTANT: Remplacez ces valeurs par votre propre configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCwCkHtoEqwKalAXePnO6246UeUL1AKkOg",
    authDomain: "appli-facturation.firebaseapp.com",
    projectId: "appli-facturation",
    storageBucket: "appli-facturation.firebasestorage.app",
    messagingSenderId: "731190370993",
    appId: "1:731190370993:web:db710c33dab92ef79ef890",
};



let app, db, auth;

try {
    // Initialiser Firebase
    app = firebase.initializeApp(firebaseConfig);
    
    // Initialiser Firestore
    db = firebase.firestore();
    
    // Initialiser Auth (optionnel pour l'authentification)
    auth = firebase.auth();
    
    console.log('Firebase initialisé avec succès');
    
    // Tester la connexion
    db.collection('test').doc('connection').set({
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        message: 'Connexion Firebase réussie'
    }).then(() => {
        console.log('Test de connexion Firestore réussi');
    }).catch((error) => {
        console.error('Erreur de test de connexion Firestore:', error);
    });
    
} catch (error) {
    console.error('Erreur d\'initialisation Firebase:', error);
    
    // Afficher un message d'erreur à l'utilisateur
    const statusMessages = document.getElementById('status-messages');
    if (statusMessages) {
        statusMessages.innerHTML = `
            <div class="alert alert-warning" role="alert">
                <i class="bi bi-exclamation-triangle"></i>
                <strong>Configuration Firebase requise:</strong>
                Veuillez configurer Firebase dans le fichier js/firebase-config.js avec vos propres clés.
                <br><small>Consultez les commentaires dans le fichier pour les instructions détaillées.</small>
            </div>
        `;
    }
}

// Fonction utilitaire pour vérifier si Firebase est configuré
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "VOTRE_API_KEY" && 
           firebaseConfig.projectId !== "VOTRE_PROJECT_ID";
}

// Fonction pour afficher les messages de statut
function showStatusMessage(message, type = 'info') {
    const statusMessages = document.getElementById('status-messages');
    if (!statusMessages) return;
    
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    const iconClass = {
        'success': 'bi-check-circle',
        'error': 'bi-exclamation-circle',
        'warning': 'bi-exclamation-triangle',
        'info': 'bi-info-circle'
    }[type] || 'bi-info-circle';
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${alertClass} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        <i class="bi ${iconClass}"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    statusMessages.appendChild(alertDiv);
    
    // Auto-supprimer après 5 secondes sauf pour les erreurs
    if (type !== 'error') {
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Export des variables pour utilisation dans d'autres fichiers
window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;
window.isFirebaseConfigured = isFirebaseConfigured;
window.showStatusMessage = showStatusMessage;

