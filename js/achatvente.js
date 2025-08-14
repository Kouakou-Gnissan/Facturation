// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCwCkHtoEqwKalAXePnO6246UeUL1AKkOg",
    authDomain: "appli-facturation.firebaseapp.com",
    projectId: "appli-facturation",
    storageBucket: "appli-facturation.firebasestorage.app",
    messagingSenderId: "731190370993",
    appId: "1:731190370993:web:db710c33dab92ef79ef890",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Configuration du cache
const CACHE_CONFIG = {
    KEY: "ventesCache_v2",
    MAX_AGE: 30 * 60 * 1000, // 30 minutes
    SYNC_INTERVAL: 2 * 60 * 1000 // Resync toutes les 2 minutes
};

// Variables globales
const ventesLocal = [];
let ventesAffichees = [];
const ventesParPage = 12;
let pageActuelle = 1;
let venteEnCoursId = null;
let lastSyncTime = 0;
let isSyncing = false;
let unsubscribeFirestore;

// Sélecteurs DOM
const tableBody = document.getElementById('achat-vente-table-body');
const noVenteMessage = document.getElementById('no-achat-vente');
const paginationContainer = document.getElementById('pagination');
const paginationInfoText = document.getElementById('pagination-info-text');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumbersContainer = document.getElementById('page-numbers');
const searchInput = document.getElementById('search-input');
const dateFilter = document.getElementById('datefilter');
const modalSave = document.getElementById("modalSave");
const modalFinish = document.getElementById('modalFinish');
const openModal = document.getElementById('openModal');
const mouvementModal = document.getElementById("mouvementModal");
const modalTitle = document.getElementById("modalTitle");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");
const BtnOpenModal = document.getElementById('btnOpenModal');

// ---------------------------
// INITIALISATION
// ---------------------------

// Vérifier connexion utilisateur
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        console.log("Utilisateur connecté :", user.email);
        startDataSync();
        setupEventListeners();
    }
});

// Fonction de déconnexion
function logout() {
    auth.signOut()
        .then(() => {
            console.log("Utilisateur déconnecté");
            window.location.href = "login.html";
            showNotification("Déconnecté avec succès !", "info");
        })
        .catch((error) => {
            console.error("Erreur lors de la déconnexion:", error);
            showNotification("Erreur lors de la déconnexion", "error");
        });
}

// ---------------------------
// SYNC ET CACHE
// ---------------------------

function startDataSync() {
    if (!chargerDepuisSession()) {
        console.log("🔄 Chargement initial depuis Firestore...");
    }
    unsubscribeFirestore = setupRealtimeSync();
    
    setInterval(() => {
        if (!isSyncing && navigator.onLine) {
            forceRefresh();
        }
    }, CACHE_CONFIG.SYNC_INTERVAL);
}

function setupRealtimeSync() {
    isSyncing = true;
    return db.collection("ventes")
        .orderBy("createdAt", "desc")
        .limit(1000)
        .onSnapshot(snapshot => {
            isSyncing = false;
            lastSyncTime = Date.now();
            let modif = false;

            snapshot.docChanges().forEach(change => {
                const vente = { 
                    id: change.doc.id, 
                    ...change.doc.data(),
                    createdAt: change.doc.data().createdAt?.toDate?.() || change.doc.data().createdAt,
                    updatedAt: change.doc.data().updatedAt?.toDate?.() || Date.now()
                };

                if (change.type === "added") {
                    if (!ventesLocal.some(v => v.id === vente.id)) {
                        ventesLocal.push(vente);
                        modif = true;
                    }
                }
                if (change.type === "modified") {
                    const index = ventesLocal.findIndex(v => v.id === vente.id);
                    if (index !== -1) {
                        ventesLocal[index] = vente;
                        modif = true;
                    }
                }
                if (change.type === "removed") {
                    const index = ventesLocal.findIndex(v => v.id === vente.id);
                    if (index !== -1) {
                        ventesLocal.splice(index, 1);
                        modif = true;
                    }
                }
            });

            if (modif) {
                processDataUpdate();
            }
        }, error => {
            console.error("Erreur synchronisation:", error);
            isSyncing = false;
        });
}

function processDataUpdate() {
    trierVentesParDate();
    sauvegarderDansSession();
    filtrerVentes();
}

function forceRefresh() {
    console.log("🔄 Forcer la resynchronisation");
    if (unsubscribeFirestore) unsubscribeFirestore();
    unsubscribeFirestore = setupRealtimeSync();
}

function chargerDepuisSession() {
    const cacheData = sessionStorage.getItem(CACHE_CONFIG.KEY);
    if (!cacheData) return false;

    try {
        const parsed = JSON.parse(cacheData);
        const cacheExpired = Date.now() - parsed.timestamp > CACHE_CONFIG.MAX_AGE;
        
        if (parsed.version !== 2 || cacheExpired) {
            sessionStorage.removeItem(CACHE_CONFIG.KEY);
            return false;
        }

        ventesLocal.length = 0;
        ventesLocal.push(...parsed.data);
        trierVentesParDate();
        ventesAffichees = [...ventesLocal];
        afficherVentesPage(pageActuelle, ventesAffichees);
        return true;
    } catch (e) {
        console.error("Erreur cache:", e);
        sessionStorage.removeItem(CACHE_CONFIG.KEY);
        return false;
    }
}

function sauvegarderDansSession() {
    const cacheData = {
        data: ventesLocal,
        timestamp: Date.now(),
        version: 2
    };
    sessionStorage.setItem(CACHE_CONFIG.KEY, JSON.stringify(cacheData));
    console.log("💾 Cache mis à jour");
}

// ---------------------------
// FONCTIONS EXISTANTES (conservées)
// ---------------------------

function trierVentesParDate() {
    ventesLocal.sort((a, b) => {
        const aDate = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
        const bDate = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
        return bDate - aDate;
    });
}

function afficherVentesPage(page, source = ventesAffichees) {
    const debut = (page - 1) * ventesParPage;
    const fin = debut + ventesParPage;
    const ventesPage = source.slice(debut, fin);

    tableBody.innerHTML = '';

    if (ventesPage.length === 0) {
        noVenteMessage.style.display = 'block';
        paginationContainer.style.display = 'none';
        return;
    } else {
        noVenteMessage.style.display = 'none';
        paginationContainer.style.display = 'flex';
    }

    for (const vente of ventesPage) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${vente.Date || ''}</td>
            <td>${vente.Fournisseur || ''}</td>
            <td>${vente.Article || ''}</td>
            <td>${vente.Client || ''}</td>
            <td>${formatCurrencyTB(vente.MontantAchat)}</td>
            <td>${formatCurrencyTB(vente.MontantVente)}</td>
            <td>${vente.Marge || ''}</td>
            <td>
                <button class="table-action-btn btn-preview-achat-vente" data-id="${vente.id}" onclick="previewVente('${vente.id}')"><i class="bi bi-eye"></i></button>
                <button class="table-action-btn btn-edit-achat-vente" data-id="${vente.id}" onclick="editerVente('${vente.id}')"><i class="bi bi-pencil"></i></button>
                <button class="table-action-btn btn-delete-achat-vente" data-id="${vente.id}" onclick="supprimerVente('${vente.id}')"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    }

    majPagination(source);
    afficherStats();
}

function majPagination(source) {
    const totalPages = Math.ceil(source.length / ventesParPage);
    paginationInfoText.textContent = `Affichage de ${(pageActuelle - 1) * ventesParPage + 1}-${Math.min(pageActuelle * ventesParPage, source.length)} sur ${source.length} mouvements`;

    prevPageBtn.disabled = pageActuelle === 1;
    nextPageBtn.disabled = pageActuelle === totalPages || totalPages === 0;

    pageNumbersContainer.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = 'pagination-btn' + (i === pageActuelle ? ' active' : '');
        btn.textContent = i;
        btn.addEventListener('click', () => {
            pageActuelle = i;
            afficherVentesPage(pageActuelle, source);
        });
        pageNumbersContainer.appendChild(btn);
    }
}

function filtrerVentes() {
    const recherche = searchInput.value.trim().toLowerCase();
    const dateValeur = dateFilter.value;

    ventesAffichees = ventesLocal.filter(vente => {
        const fournisseur = (vente.Fournisseur || '').toLowerCase();
        const article = (vente.Article || '').toLowerCase();

        const correspondRecherche = recherche === '' || 
            fournisseur.includes(recherche) || 
            article.includes(recherche);
        
        const correspondDate = !dateValeur || vente.Date === dateValeur;

        return correspondRecherche && correspondDate;
    });

    pageActuelle = 1;
    afficherVentesPage(pageActuelle, ventesAffichees);
}

function afficherStats() {
    let totalAchat = 0;
    let totalVente = 0;
    let totalCommission = 0;

    ventesLocal.forEach(vente => {
        totalAchat += parseFloat(vente.MontantAchat) || 0;
        totalVente += parseFloat(vente.MontantVente) || 0;
        totalCommission += parseFloat(vente.Commission) || 0;
    });

    const margeBrute = totalVente - totalAchat - totalCommission;
    const margePourcentage = totalAchat > 0 ? (margeBrute / (totalAchat + totalCommission)) * 100 : 0;

    document.getElementById('total-achat').textContent = totalAchat.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
    document.getElementById('total-vente').textContent = totalVente.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
    document.getElementById('marge-brute').textContent = margeBrute.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
    document.getElementById('marge-pourcentage').textContent = margePourcentage.toFixed(0) + '%';
}

// ---------------------------
// GESTION DES MODALS
// ---------------------------

function openMouvementModal() {
    modalTitle.textContent = "Nouveau Mouvement";
    document.getElementById("mouvementForm").reset();
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    const dateInput = document.getElementById("date");
    if (dateInput) {
        dateInput.value = formattedDate;
    }
    mouvementModal.classList.add('show');
}

function closeMouvementModal() {
    mouvementModal.classList.remove('show');
}

function openViewModal() {
    document.getElementById('viewModal').classList.add('show');
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('show');
}

window.previewVente = function (id) {
    const vente = ventesLocal.find(v => v.id === id);
    if (!vente) return alert("Vente introuvable");

    venteEnCoursId = id;
    openViewModal();
    document.getElementById("view-date").textContent = vente.Date || 'Non spécifié';
    document.getElementById("view-fournisseur").textContent = vente.Fournisseur || 'Non spécifié';
    document.getElementById("view-article").textContent = vente.Article || 'Non spécifié';
    document.getElementById("view-client").textContent = vente.Client || 'Non spécifié';
    document.getElementById("view-montantachat").textContent = formatCurrency(vente.MontantAchat);
    document.getElementById("view-montantvente").textContent = formatCurrency(vente.MontantVente);
    document.getElementById("view-commission").textContent = formatCurrency(vente.Commission);
    document.getElementById("view-ordrede").textContent = vente.Ordrede || 'Non spécifié';
    document.getElementById("view-benefice").textContent = formatCurrency(vente.Benefice);
    document.getElementById("view-numerofacture").textContent = vente.NumeroFacture || 'Non spécifié';
    document.getElementById("view-marge").textContent = vente.Marge || '';
};

window.editerVente = function (id) {
    const vente = ventesLocal.find(v => v.id === id);
    if (!vente) return alert("Vente introuvable");

    venteEnCoursId = id;
    openMouvementModal();
    document.getElementById('modalTitle').textContent = "Modifier Mouvement";

    document.getElementById("date").value = vente.Date || '';
    document.getElementById("fournisseur").value = vente.Fournisseur || '';
    document.getElementById("article").value = vente.Article || '';
    document.getElementById("client").value = vente.Client || '';
    document.getElementById("montantachat").value = vente.MontantAchat || '';
    document.getElementById("montantvente").value = vente.MontantVente || '';
    document.getElementById("commission").value = vente.Commission || '';
    document.getElementById("ordrede").value = vente.Ordrede || '';
    document.getElementById("benefice").value = vente.Benefice || '';
    document.getElementById("numerofacture").value = vente.NumeroFacture || '';
    document.getElementById("marge").value = vente.Marge || '';
};

window.supprimerVente = async function (id) {
    if (!confirm("Voulez-vous vraiment supprimer ce mouvement ?")) return;
    try {
        await db.collection("ventes").doc(id).delete();
        const index = ventesLocal.findIndex(v => v.id === id);
        if (index !== -1) ventesLocal.splice(index, 1);

        ventesAffichees = [...ventesLocal];
        sauvegarderDansSession();
        afficherVentesPage(pageActuelle, ventesAffichees);
        showNotification("Mouvement supprimé avec succès", "success");
    } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        showNotification("Erreur lors de la suppression", "error");
    }
};

// ---------------------------
// ÉVÉNEMENTS
// ---------------------------

function setupEventListeners() {
    // Pagination
    prevPageBtn.addEventListener('click', () => {
        if (pageActuelle > 1) {
            pageActuelle--;
            afficherVentesPage(pageActuelle, ventesAffichees);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(ventesAffichees.length / ventesParPage);
        if (pageActuelle < totalPages) {
            pageActuelle++;
            afficherVentesPage(pageActuelle, ventesAffichees);
        }
    });

    // Filtres
    searchInput.addEventListener('input', filtrerVentes);
    dateFilter.addEventListener('change', filtrerVentes);

    // Modals
    modalClose.addEventListener("click", closeMouvementModal);
    modalCancel.addEventListener("click", closeMouvementModal);
    openModal.addEventListener("click", openMouvementModal);
    BtnOpenModal.addEventListener("click", openMouvementModal);
    document.getElementById('viewModalClose').addEventListener('click', closeViewModal);
    document.getElementById('viewModalCloseBtn').addEventListener('click', closeViewModal);

    // Clic externe modal
    window.addEventListener("click", (e) => {
        if (e.target === mouvementModal) closeMouvementModal();
        if (e.target === document.getElementById('viewModal')) closeViewModal();
    });

    // Déconnexion
    document.getElementById('logoutButton').addEventListener('click', logout);

    // Sauvegarde
    modalSave.addEventListener('click', handleSaveVente);
    modalFinish.addEventListener('click', handleSaveVente);
}

async function handleSaveVente(e) {
    e.preventDefault();

    // Validation des champs requis
    const requiredFields = [
        'date', 'fournisseur', 'article', 'client',
        'montantachat', 'montantvente', 'ordrede'
    ];

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
    }

    const venteData = {
        Date: document.getElementById("date").value,
        Fournisseur: document.getElementById("fournisseur").value,
        Article: document.getElementById("article").value,
        Client: document.getElementById("client").value,
        MontantAchat: parseFloat(document.getElementById("montantachat").value) || 0,
        MontantVente: parseFloat(document.getElementById("montantvente").value) || 0,
        Commission: parseFloat(document.getElementById("commission").value) || 0,
        Ordrede: document.getElementById("ordrede").value,
        Benefice: parseFloat(document.getElementById("benefice").value) || 0,
        NumeroFacture: document.getElementById("numerofacture").value,
        Marge: document.getElementById("marge").value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (venteEnCoursId) {
            // Modification
            await db.collection("ventes").doc(venteEnCoursId).update(venteData);
            const index = ventesLocal.findIndex(v => v.id === venteEnCoursId);
            if (index !== -1) {
                ventesLocal[index] = { id: venteEnCoursId, ...venteData };
            }
            showNotification("Mouvement modifié avec succès", "success");
        } else {
            // Nouvelle vente
            venteData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection("ventes").add(venteData);
            ventesLocal.unshift({ id: docRef.id, ...venteData });
            showNotification("Mouvement enregistré avec succès", "success");
            document.getElementById("mouvementForm").reset();
        }

        ventesAffichees = [...ventesLocal];
        sauvegarderDansSession();
        afficherVentesPage(pageActuelle, ventesAffichees);
        closeMouvementModal();
        venteEnCoursId = null;

    } catch (error) {
        console.error("Erreur lors de la sauvegarde :", error);
        showNotification("Erreur lors de la sauvegarde", "error");
    }
}

// ---------------------------
// UTILITAIRES
// ---------------------------

function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '0 CFA';
    const num = Number(amount);
    const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
    return `${formatted} CFA`;
}

function formatCurrencyTB(amount) {
    if (amount === undefined || amount === null) return '0 CFA';
    const num = Number(amount);
    const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
    return `${formatted}`;
}

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

// ---------------------------
// NETTOYAGE
// ---------------------------

window.addEventListener('beforeunload', () => {
    if (unsubscribeFirestore) unsubscribeFirestore();
});

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    const archiveBtn = document.getElementById('archive');
    if (archiveBtn) {
        archiveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification("Fonctionnalité bientôt disponible", "info");
        });
    }
});