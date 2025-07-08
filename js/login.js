// Gestion de la connexion avec Firebase
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Variables DOM
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('rememberMe');
const loginBtn = document.getElementById('loginBtn');
const togglePasswordBtn = document.getElementById('togglePassword');
const alertMessage = document.getElementById('alertMessage');
const forgotPasswordLink = document.querySelector('.forgot-password');

// Messages d'erreur
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');

// État de l'application
let isLoading = false;

// Initialisation des événements
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    checkAuthState();
    loadRememberedEmail();
});

function initializeEventListeners() {
    // Soumission du formulaire
    loginForm.addEventListener('submit', handleLogin);

    // Validation en temps réel
    emailInput.addEventListener('blur', validateEmail);
    passwordInput.addEventListener('blur', validatePassword);

    // Affichage/masquage du mot de passe
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);

    // Mot de passe oublié
    forgotPasswordLink.addEventListener('click', handleForgotPassword);

    // Se souvenir de moi
    rememberMeCheckbox.addEventListener('change', handleRememberMe);
}

function checkAuthState() {
    // Vérifier si l'utilisateur est déjà connecté
    if (window.auth) {
        window.auth.onAuthStateChanged((user) => {
            if (user) {
                // Afficher un message si déjà connecté
                showAlert('Vous êtes déjà connecté', 'info');
                setTimeout(() => {
                    window.location.href = 'dashbord.html'; // <-- attention à l'orthographe
                }, 1000);
            }
        });
    }
}

function loadRememberedEmail() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        rememberMeCheckbox.checked = true;
    }
}

async function handleLogin(e) {
    e.preventDefault();

    if (isLoading) return;

    // Validation du formulaire
    if (!validateForm()) {
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        setLoading(true);

        // Connexion avec Firebase
        const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        // Gérer "Se souvenir de moi"
        if (rememberMeCheckbox.checked) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }

        showAlert('Connexion réussie ! Vous êtes maintenant connecté.', 'success');
        // ✅ Redirection après succès
        setTimeout(() => {
            window.location.href = 'dashbord.html'; // <-- attention à l'orthographe
        }, 1000); // petite pause pour laisser voir l'alerte

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        handleAuthError(error);
    } finally {
        setLoading(false);
    }
}

function validateForm() {
    let isValid = true;

    // Validation de l'email
    if (!validateEmail()) {
        isValid = false;
    }

    // Validation du mot de passe
    if (!validatePassword()) {
        isValid = false;
    }

    return isValid;
}

function validateEmail() {
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
        showError(emailError, 'L\'adresse e-mail est requise');
        return false;
    }

    if (!emailRegex.test(email)) {
        showError(emailError, 'Veuillez entrer une adresse e-mail valide');
        return false;
    }

    hideError(emailError);
    return true;
}

function validatePassword() {
    const password = passwordInput.value;

    if (!password) {
        showError(passwordError, 'Le mot de passe est requis');
        return false;
    }

    hideError(passwordError);
    return true;
}

function togglePasswordVisibility() {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
}

async function handleForgotPassword(e) {
    e.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        showAlert('Veuillez entrer votre adresse e-mail pour réinitialiser votre mot de passe', 'warning');
        emailInput.focus();
        return;
    }

    if (!validateEmail()) {
        return;
    }

    try {
        await sendPasswordResetEmail(window.auth, email);
        showAlert('Un e-mail de réinitialisation a été envoyé à votre adresse', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'e-mail de réinitialisation:', error);

        let message = 'Erreur lors de l\'envoi de l\'e-mail de réinitialisation';

        switch (error.code) {
            case 'auth/user-not-found':
                message = 'Aucun compte associé à cette adresse e-mail';
                break;
            case 'auth/invalid-email':
                message = 'Adresse e-mail invalide';
                break;
            case 'auth/too-many-requests':
                message = 'Trop de tentatives. Veuillez réessayer plus tard';
                break;
        }

        showAlert(message, 'error');
    }
}

function handleRememberMe() {
    if (!rememberMeCheckbox.checked) {
        localStorage.removeItem('rememberedEmail');
    }
}

function setLoading(loading) {
    isLoading = loading;
    loginBtn.classList.toggle('loading', loading);
    loginBtn.disabled = loading;

    // Désactiver tous les champs pendant le chargement
    const inputs = loginForm.querySelectorAll('input');
    inputs.forEach(input => {
        input.disabled = loading;
    });
}

function showError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function hideError(errorElement) {
    errorElement.textContent = '';
    errorElement.classList.remove('show');
}

function showAlert(message, type = 'info') {
    const alertText = alertMessage.querySelector('.alert-text');
    alertText.textContent = message;

    // Supprimer les classes précédentes
    alertMessage.classList.remove('success', 'error', 'warning', 'info');
    alertMessage.classList.add(type, 'show');

    // Masquer automatiquement après 5 secondes
    setTimeout(() => {
        alertMessage.classList.remove('show');
    }, 5000);
}

function handleAuthError(error) {
    let message = 'Une erreur est survenue lors de la connexion';

    switch (error.code) {
        case 'auth/user-not-found':
            message = 'Aucun compte associé à cette adresse e-mail';
            showError(emailError, message);
            break;
        case 'auth/wrong-password':
            message = 'Mot de passe incorrect';
            showError(passwordError, message);
            break;
        case 'auth/invalid-email':
            message = 'Adresse e-mail invalide';
            showError(emailError, message);
            break;
        case 'auth/user-disabled':
            message = 'Ce compte a été désactivé';
            break;
        case 'auth/too-many-requests':
            message = 'Trop de tentatives de connexion. Veuillez réessayer plus tard';
            break;
        case 'auth/network-request-failed':
            message = 'Erreur de connexion. Vérifiez votre connexion internet';
            break;
        case 'auth/invalid-credential':
            message = 'Identifiants invalides. Vérifiez votre e-mail et mot de passe';
            break;
        default:
            console.error('Erreur Firebase:', error);
            break;
    }

    showAlert(message, 'error');
}

// Gestion des boutons sociaux (placeholder)
document.querySelector('.google-btn')?.addEventListener('click', function () {
    showAlert('Connexion Google sera bientôt disponible', 'info');
});

// Validation en temps réel des champs
emailInput.addEventListener('input', function () {
    if (this.value.trim()) {
        hideError(emailError);
    }
});

passwordInput.addEventListener('input', function () {
    if (this.value) {
        hideError(passwordError);
    }
});

// Gestion de la touche Entrée
loginForm.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && !isLoading) {
        handleLogin(e);
    }
});

// Focus automatique sur le premier champ vide
window.addEventListener('load', function () {
    if (!emailInput.value) {
        emailInput.focus();
    } else if (!passwordInput.value) {
        passwordInput.focus();
    }
});

