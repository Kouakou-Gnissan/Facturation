// Gestion de l'inscription avec Firebase
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';




// Variables DOM
const signupForm = document.getElementById('signupForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const termsCheckbox = document.getElementById('terms');
const signupBtn = document.getElementById('signupBtn');
const togglePasswordBtn = document.getElementById('togglePassword');
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');
const alertMessage = document.getElementById('alertMessage');

// Messages d'erreur
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');

// État de l'application
let isLoading = false;

// Initialisation des événements
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    checkAuthState();
});

function initializeEventListeners() {
    // Soumission du formulaire
    signupForm.addEventListener('submit', handleSignup);

    // Validation en temps réel
    emailInput.addEventListener('blur', validateEmail);
    passwordInput.addEventListener('input', handlePasswordChange);
    confirmPasswordInput.addEventListener('blur', validatePasswordMatch);

    // Affichage/masquage du mot de passe
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);

    // Validation des termes
    termsCheckbox.addEventListener('change', validateForm);
}

function checkAuthState() {
    // Vérifier si l'utilisateur est déjà connecté
    if (window.auth) {
        window.auth.onAuthStateChanged((user) => {
            if (user) {
                // Afficher un message si déjà connecté
                showAlert('Vous êtes déjà connecté', 'info');
            }
        });
    }
}

async function handleSignup(e) {
    e.preventDefault();

    if (isLoading) return;

    // Validation complète du formulaire
    if (!validateForm()) {
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        setLoading(true);

        // Créer l'utilisateur avec Firebase
        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        // Mettre à jour le profil utilisateur
        await updateProfile(user, {
            displayName: email.split('@')[0] // Utiliser la partie avant @ comme nom d'affichage
        });

        showAlert('Compte créé avec succès ! Redirection...', 'success');

        // Redirection après un court délai vers la page de connexion
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
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

    // Validation de la confirmation du mot de passe
    if (!validatePasswordMatch()) {
        isValid = false;
    }

    // Validation des termes
    if (!termsCheckbox.checked) {
        showAlert('Vous devez accepter les conditions d\'utilisation', 'error');
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

    if (password.length < 6) {
        showError(passwordError, 'Le mot de passe doit contenir au moins 6 caractères');
        return false;
    }

    hideError(passwordError);
    return true;
}

function validatePasswordMatch() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!confirmPassword) {
        showError(confirmPasswordError, 'Veuillez confirmer votre mot de passe');
        return false;
    }

    if (password !== confirmPassword) {
        showError(confirmPasswordError, 'Les mots de passe ne correspondent pas');
        return false;
    }

    hideError(confirmPasswordError);
    return true;
}

function handlePasswordChange() {
    const password = passwordInput.value;
    updatePasswordStrength(password);

    // Revalider la confirmation si elle existe
    if (confirmPasswordInput.value) {
        validatePasswordMatch();
    }
}

function updatePasswordStrength(password) {
    let strength = 0;
    let strengthClass = '';
    let strengthLabel = '';

    if (password.length >= 6) strength += 1;
    if (password.match(/[a-z]/)) strength += 1;
    if (password.match(/[A-Z]/)) strength += 1;
    if (password.match(/[0-9]/)) strength += 1;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 1;

    switch (strength) {
        case 0:
        case 1:
            strengthClass = 'weak';
            strengthLabel = 'Faible';
            break;
        case 2:
            strengthClass = 'medium';
            strengthLabel = 'Moyen';
            break;
        case 3:
            strengthClass = 'strong';
            strengthLabel = 'Fort';
            break;
        case 4:
        case 5:
            strengthClass = 'very-strong';
            strengthLabel = 'Très fort';
            break;
    }

    strengthFill.className = `strength-fill ${strengthClass}`;
    strengthText.textContent = strengthLabel;
}

function togglePasswordVisibility() {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
}

function setLoading(loading) {
    isLoading = loading;
    signupBtn.classList.toggle('loading', loading);
    signupBtn.disabled = loading;

    // Désactiver tous les champs pendant le chargement
    const inputs = signupForm.querySelectorAll('input');
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
    let message = 'Une erreur est survenue lors de l\'inscription';

    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'Cette adresse e-mail est déjà utilisée';
            showError(emailError, message);
            break;
        case 'auth/invalid-email':
            message = 'Adresse e-mail invalide';
            showError(emailError, message);
            break;
        case 'auth/operation-not-allowed':
            message = 'L\'inscription par e-mail/mot de passe n\'est pas activée';
            break;
        case 'auth/weak-password':
            message = 'Le mot de passe est trop faible';
            showError(passwordError, message);
            break;
        case 'auth/network-request-failed':
            message = 'Erreur de connexion. Vérifiez votre connexion internet';
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

confirmPasswordInput.addEventListener('input', function () {
    if (this.value) {
        hideError(confirmPasswordError);
    }
});

// Gestion des liens
document.querySelectorAll('a[href="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        showAlert('Cette fonctionnalité sera bientôt disponible', 'info');
    });
});

