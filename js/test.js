// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCwCkHtoEqwKalAXePnO6246UeUL1AKkOg",
    authDomain: "appli-facturation.firebaseapp.com",
    projectId: "appli-facturation",
    storageBucket: "appli-facturation.appspot.com",
    messagingSenderId: "731190370993",
    appId: "1:731190370993:web:db710c33dab92ef79ef890"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Vérifier connexion utilisateur
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        console.log("Utilisateur connecté :", user.email);
    }
});

// Fonction de déconnexion
function logout() {
    auth.signOut()
        .then(() => {
            // Déconnexion réussie
            console.log("Utilisateur déconnecté");
            // Redirection vers la page de connexion
            window.location.href = "login.html";
            showNotification("Déconnecté avec succes !","info")
        })
        .catch((error) => {
            // Gestion des erreurs
            console.error("Erreur lors de la déconnexion:", error);
            alert("Une erreur est survenue lors de la déconnexion");
        });
}
document.getElementById('logoutButton').addEventListener('click', logout);

// Sélecteurs DOM pour tableau, pagination, etc.
const tableBody = document.getElementById('reglement-fournisseur-table-body');
const noReglementMessage = document.getElementById('no-reglement-fournisseur');
const paginationContainer = document.getElementById('pagination');
const paginationInfoText = document.getElementById('pagination-info-text');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumbersContainer = document.getElementById('page-numbers');
const searchInput = document.getElementById('search-input');
const dateFilter = document.getElementById('datefilter');
const modalSave = document.getElementById("modalSave");
const modalFinish = document.getElementById('modalFinish');

// Variables globales
const CACHE_KEY = "reglementsCacheSession";
const reglementsLocal = [];
let reglementsAffiches = [];  // tableau filtré affiché
const reglementsParPage = 12;
let pageActuelle = 1;
let reglementEnCoursId = null; // pour edition ou ajout

// Fonction pour trier reglementsLocal par createdAt décroissant (plus récent en premier)
function trierReglementsParDate() {
    reglementsLocal.sort((a, b) => {
        const aDate = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
        const bDate = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
        return bDate - aDate;
    });
}

// Charger données depuis sessionStorage
function chargerDepuisSession() {
    const cacheData = sessionStorage.getItem(CACHE_KEY);
    if (cacheData) {
        try {
            const reglements = JSON.parse(cacheData);
            reglementsLocal.push(...reglements);
            trierReglementsParDate();
            reglementsAffiches = [...reglementsLocal];
            afficherReglementsPage(pageActuelle, reglementsAffiches);
            console.log("✅ Données chargées depuis sessionStorage");
            return true;
        } catch (e) {
            console.warn("Erreur lecture sessionStorage", e);
            sessionStorage.removeItem(CACHE_KEY);
        }
    }
    return false;
}

// Sauvegarder dans sessionStorage
function sauvegarderDansSession() {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(reglementsLocal));
    console.log("💾 Données mises en sessionStorage");
}

// Fonction pour afficher les reglements (tableau + pagination)
function afficherReglementsPage(page, source = reglementsAffiches) {
    const debut = (page - 1) * reglementsParPage;
    const fin = debut + reglementsParPage;
    const reglementsPage = source.slice(debut, fin);

    tableBody.innerHTML = '';

    if (reglementsPage.length === 0) {
        noReglementMessage.style.display = 'block';
        paginationContainer.style.display = 'none';
        return;
    } else {
        noReglementMessage.style.display = 'none';
        paginationContainer.style.display = 'flex';
    }

    for (const reglement of reglementsPage) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${reglement.Date || ''}</td>
            <td>${reglement.Fournisseur || ''}</td>
            <td>${reglement.Article || ''}</td>
            <td>${formatCurrency(reglement.MontantAchat)}</td>
            <td>${reglement.MoyenPaiement || ''}</td>
            <td>${reglement.Modalite || ''}</td>
            <td>${reglement.NumeroFacture || ''}</td>
            <td>
                <button class="table-action-btn btn-preview-reglement-fournisseur" data-id="${reglement.id}" onclick="previewReglement('${reglement.id}')"><i class="bi bi-eye"></i></button>
                <button class="table-action-btn btn-edit-reglement-fournisseur" data-id="${reglement.id}" onclick="editerReglement('${reglement.id}')"><i class="bi bi-pencil"></i></button>
                <button class="table-action-btn btn-delete-reglement-fournisseur" data-id="${reglement.id}" onclick="supprimerReglement('${reglement.id}')"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    }

    majPagination(source);
    afficherStats();
}

// Mise à jour pagination dynamique
function majPagination(source) {
    const totalPages = Math.ceil(source.length / reglementsParPage);
    paginationInfoText.textContent = `Affichage de ${(pageActuelle - 1) * reglementsParPage + 1}-${Math.min(pageActuelle * reglementsParPage, source.length)} sur ${source.length} enregistrements`;

    prevPageBtn.disabled = pageActuelle === 1;
    nextPageBtn.disabled = pageActuelle === totalPages || totalPages === 0;

    pageNumbersContainer.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = 'pagination-btn' + (i === pageActuelle ? ' active' : '');
        btn.textContent = i;
        btn.addEventListener('click', () => {
            pageActuelle = i;
            afficherReglementsPage(pageActuelle, source);
        });
        pageNumbersContainer.appendChild(btn);
    }
}

// Pagination boutons précédent/suivant
prevPageBtn.addEventListener('click', () => {
    if (pageActuelle > 1) {
        pageActuelle--;
        afficherReglementsPage(pageActuelle, reglementsAffiches);
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(reglementsAffiches.length / reglementsParPage);
    if (pageActuelle < totalPages) {
        pageActuelle++;
        afficherReglementsPage(pageActuelle, reglementsAffiches);
    }
});

// Fonction filtrage (texte + date)
function filtrerReglements() {
    const recherche = searchInput.value.trim().toLowerCase();
    const dateValeur = dateFilter.value;

    reglementsAffiches = reglementsLocal.filter(reglement => {
        const fournisseur = (reglement.Fournisseur || '').toLowerCase();
        const article = (reglement.Article || '').toLowerCase();
        const numeroFacture = (reglement.NumeroFacture || '').toLowerCase();

        const correspondRecherche = recherche === '' || 
            fournisseur.includes(recherche) || 
            article.includes(recherche) ||
            numeroFacture.includes(recherche);
        
        const correspondDate = !dateValeur || reglement.Date === dateValeur;

        return correspondRecherche && correspondDate;
    });

    pageActuelle = 1;
    afficherReglementsPage(pageActuelle, reglementsAffiches);
}

// Écouteurs sur filtres
searchInput.addEventListener('input', filtrerReglements);
dateFilter.addEventListener('change', filtrerReglements);

// Affichage statistiques
function afficherStats() {
    let totalAchat = 0;
    let totalArticles = 0;
    let moyenPaiementCounts = {};

    reglementsLocal.forEach(reglement => {
        totalAchat += parseFloat(reglement.MontantAchat) || 0;
        totalArticles += 1;
        
        const moyenPaiement = reglement.MoyenPaiement || 'Inconnu';
        moyenPaiementCounts[moyenPaiement] = (moyenPaiementCounts[moyenPaiement] || 0) + 1;
    });

    // Trouver le moyen de paiement le plus utilisé
    let moyenPaiementPlusUtilise = 'Aucun';
    let maxCount = 0;
    for (const [moyen, count] of Object.entries(moyenPaiementCounts)) {
        if (count > maxCount) {
            maxCount = count;
            moyenPaiementPlusUtilise = moyen;
        }
    }

    document.getElementById('total-achat').textContent = totalArticles.toLocaleString('fr-FR');
    document.getElementById('total-vente').textContent = totalAchat.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' CFA';
    document.getElementById('marge-brute').textContent = moyenPaiementPlusUtilise;
}

// Gestion des modals
const openModal = document.getElementById('openModal');
const mouvementModal = document.getElementById("mouvementModal");
const modalTitle = document.getElementById("modalTitle");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");
const BtnOpenModal = document.getElementById('btnOpenModal');

// Ouvrir modal nouveau reglement
function openMouvementModal() {
    modalTitle.textContent = "Nouveau Règlement";
    document.getElementById("mouvementForm").reset();
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    const dateInput = document.getElementById("date");
    if (dateInput) {
        dateInput.value = formattedDate;
    }
    mouvementModal.classList.add('show');
    
}

// Fermer modal
function closeMouvementModal() {
    mouvementModal.classList.remove('show');
}

// Fermer modal si clic à l'extérieur
window.addEventListener("click", (e) => {
    if (e.target === mouvementModal) {
        closeMouvementModal();
    }
});

// Écouteurs sur boutons fermeture
modalClose.addEventListener("click", closeMouvementModal);
modalCancel.addEventListener("click", closeMouvementModal);
openModal.addEventListener("click", openMouvementModal);
BtnOpenModal.addEventListener("click", openMouvementModal);

// Modal de visualisation
function openViewModal() {
    document.getElementById('viewModal').classList.add('show');
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('show');
}

document.getElementById('viewModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('viewModal')) {
        closeViewModal();
    }
});

// Voir les détails d'un reglement
window.previewReglement = function (id) {
    const reglement = reglementsLocal.find(r => r.id === id);
    if (!reglement) return alert("Règlement introuvable");

    reglementEnCoursId = id;
    openViewModal();
    document.getElementById("view-date").textContent = reglement.Date || 'Non spécifié';
    document.getElementById("view-fournisseur").textContent = reglement.Fournisseur || 'Non spécifié';
    document.getElementById("view-article").textContent = reglement.Article || 'Non spécifié';
    document.getElementById("view-montantachat").textContent = formatCurrency(reglement.MontantAchat);
    document.getElementById("view-moyenpaiement").textContent = reglement.MoyenPaiement || 'Non spécifié';
    document.getElementById("view-modalite").textContent = reglement.Modalite || 'Non spécifié';
    document.getElementById("view-numerofacture").textContent = reglement.NumeroFacture || 'Non spécifié';
};

// Fonction pour formater les montants
function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '0 CFA';
    const num = Number(amount);
    const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
    return `${formatted}`;
}

// Fermeture modal visualisation
document.getElementById('viewModalClose').addEventListener('click', closeViewModal);
document.getElementById('viewModalCloseBtn').addEventListener('click', closeViewModal);

// Édition d'un reglement
window.editerReglement = function (id) {
    const reglement = reglementsLocal.find(r => r.id === id);
    if (!reglement) return alert("Règlement introuvable");

    reglementEnCoursId = id;
    openMouvementModal();
    document.getElementById('modalTitle').textContent = "Modifier Règlement";

    document.getElementById("date").value = reglement.Date || '';
    document.getElementById("fournisseur").value = reglement.Fournisseur || '';
    document.getElementById("article").value = reglement.Article || '';
    document.getElementById("montantachat").value = reglement.MontantAchat || '';
    document.getElementById("moyenpaiement").value = reglement.MoyenPaiement || '';
    document.getElementById("modalite").value = reglement.Modalite || '';
    document.getElementById("numerofacture").value = reglement.NumeroFacture || '';
};

// Suppression d'un reglement
window.supprimerReglement = async function (id) {
    if (!confirm("Voulez-vous vraiment supprimer ce règlement ?")) return;
    try {
        await db.collection("reglementsFournisseurs").doc(id).delete();
        const index = reglementsLocal.findIndex(r => r.id === id);
        if (index !== -1) reglementsLocal.splice(index, 1);

        reglementsAffiches = [...reglementsLocal];
        sauvegarderDansSession();
        afficherReglementsPage(pageActuelle, reglementsAffiches);
        showNotification("Règlement supprimé avec succès", "success");
    } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        showNotification("Erreur lors de la suppression", "error");
    }
};

// Sauvegarde/Modification d'un reglement
modalSave.addEventListener('click', async (e) => {
    e.preventDefault();

    // Validation des champs requis
    const requiredFields = ['date', 'fournisseur', 'montantachat', 'moyenpaiement','article'];
    let isValid = true;
    const invalidFields = [];

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            isValid = false;
            invalidFields.push(fieldId);
            field.classList.add('is-invalid');
        } else {
            field.classList.remove('is-invalid');
        }
    });

    if (!isValid) {
        showNotification(`Champs requis manquants: ${invalidFields.join(', ')}`, 'error');
        return;
    };
    console.log(reglementEnCoursId)
    const reglementData = {
        Date: document.getElementById("date").value,
        Fournisseur: document.getElementById("fournisseur").value,
        MontantAchat: parseFloat(document.getElementById("montantachat").value) || 0,
        Article : document.getElementById("article").value,
        MoyenPaiement: document.getElementById("moyenpaiement").value,
        Modalite: document.getElementById("modalite").value || '',
        NumeroFacture: document.getElementById("numerofacture").value || ''
    };

    try {
        if (reglementEnCoursId) {
            // Modification
            await db.collection("reglementsFournisseurs").doc(reglementEnCoursId).update(reglementData);
            const index = reglementsLocal.findIndex(r => r.id === reglementEnCoursId);
            if (index !== -1) {
                reglementsLocal[index] = { id: reglementEnCoursId, ...reglementData };
            }
            showNotification("Règlement modifié avec succès", "success");
        } else {
            // Nouveau reglement
            reglementData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection("reglementsFournisseurs").add(reglementData);
            reglementsLocal.unshift({ id: docRef.id, ...reglementData, createdAt: new Date().getTime() });
            showNotification("Règlement enregistré avec succès", "success");
            document.getElementById("mouvementForm").reset();
        }

        reglementsAffiches = [...reglementsLocal];
        sauvegarderDansSession();
        afficherReglementsPage(pageActuelle, reglementsAffiches);
        closeMouvementModal();
        reglementEnCoursId = null;

    } catch (error) {
        console.error("Erreur lors de la sauvegarde :", error);
        showNotification("Erreur lors de la sauvegarde", "error");
    }
});

// Bouton Terminer (même fonction que Sauvegarder mais ferme le modal)
modalFinish.addEventListener('click', function(e) {
    modalSave.click(); // Déclenche l'événement click du bouton Sauvegarder
    closeMouvementModal();
});

// Synchronisation Firestore temps réel + gestion cache
if (!chargerDepuisSession()) {
    console.log("🔄 Chargement depuis Firestore...");
    db.collection("reglementsFournisseurs")
        .orderBy("createdAt", "desc")
        .limit(500)
        .onSnapshot(snapshot => {
            let modif = false;
            snapshot.docChanges().forEach(change => {
                const reglement = { id: change.doc.id, ...change.doc.data() };

                if (change.type === "added") {
                    if (!reglementsLocal.some(r => r.id === reglement.id)) {
                        reglementsLocal.push(reglement);
                        modif = true;
                    }
                }
                if (change.type === "modified") {
                    const index = reglementsLocal.findIndex(r => r.id === reglement.id);
                    if (index !== -1) {
                        reglementsLocal[index] = reglement;
                        modif = true;
                    }
                }
                if (change.type === "removed") {
                    const index = reglementsLocal.findIndex(r => r.id === reglement.id);
                    if (index !== -1) {
                        reglementsLocal.splice(index, 1);
                        modif = true;
                    }
                }
            });

            if (modif) {
                trierReglementsParDate();
                sauvegarderDansSession();
                filtrerReglements();
            }
        });
}

// Gestion des notifications
document.addEventListener('DOMContentLoaded', function() {
    const archiveBtn = document.getElementById('archive');
    if (archiveBtn) {
        archiveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification("Fonctionnalité bientôt disponible", "info");
        });
    }
});

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = 'notification ' + type;

    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';

    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="notification-message">${message || 'Notification'}</div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            notification.remove();
        });
    }

    container.appendChild(notification);

    setTimeout(function() {
        notification.classList.add('show');
    }, 100);

    setTimeout(function() {
        notification.classList.remove('show');
        setTimeout(function() {
            notification.remove();
        }, 300);
    }, 5000);
}