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

// Vérifier connexion utilisateur
auth.onAuthStateChanged(user => {
    if (!user) {
        // window.location.replace("login.html");
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
const modalFinish = document.getElementById('modalFinish')


// Variables globales
const CACHE_KEY = "ventesCacheSession";
const ventesLocal = [];
let ventesAffichees = [];  // tableau filtré affiché
const ventesParPage = 12;
let pageActuelle = 1;
let venteEnCoursId = null; // pour edition ou ajout

// Fonction pour trier ventesLocal par createdAt décroissant (plus récent en premier)
function trierVentesParDate() {
    ventesLocal.sort((a, b) => {
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
            const ventes = JSON.parse(cacheData);
            ventesLocal.push(...ventes);
            trierVentesParDate();
            ventesAffichees = [...ventesLocal];
            afficherVentesPage(pageActuelle, ventesAffichees);
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
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(ventesLocal));
    console.log("💾 Données mises en sessionStorage");
}

// Fonction pour afficher les ventes (tableau + pagination)
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


// Mise à jour pagination dynamique
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

// Pagination boutons précédent/suivant
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

// Fonction filtrage (texte + date)
function filtrerVentes() {
    const recherche = searchInput.value.trim().toLowerCase();
    const dateValeur = dateFilter.value;

    ventesAffichees = ventesLocal.filter(vente => {
        const fournisseur = (vente.Fournisseur || '').toLowerCase();
        const article = (vente.Article || '').toLowerCase();

        const correspondRecherche = recherche === '' || fournisseur.includes(recherche) || article.includes(recherche);
        const correspondDate = !dateValeur || vente.Date === dateValeur;

        return correspondRecherche && correspondDate;
    });

    pageActuelle = 1;
    afficherVentesPage(pageActuelle, ventesAffichees);
}

// Écouteurs sur filtres
searchInput.addEventListener('input', filtrerVentes);
dateFilter.addEventListener('change', filtrerVentes);

// Affichage statistiques
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


// ouverture et fermeture du modale pour l'ajout et la modification

// Sélecteurs modal
const openModal = document.getElementById('openModal');
const mouvementModal = document.getElementById("mouvementModal");
const modalTitle = document.getElementById("modalTitle");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");
const BtnOpenModal = document.getElementById('btnOpenModal')

// Ouvrir modal nouveau mouvement
function openMouvementModal() {
    modalTitle.textContent = "Nouveau Mouvement";
    document.getElementById("mouvementForm").reset();
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


// Pour le modal de la visualisation

// Fonction pour fermer le modal
function openViewModal() {
    document.getElementById('viewModal').classList.add('show');
}

// Fonction pour fermer le modal de visualisation
function closeViewModal() {
    document.getElementById('viewModal').classList.remove('show');
}

// Fermer le modal de visualisation en cliquant à l'extérieur
document.getElementById('viewModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('viewModal')) {
        closeViewModal();
    }
});

// Voir les détails d'une vente 
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

// Fonction pour formater les nombres avec séparateurs de milliers et "CFA"
function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '0 CFA';

    // Convertir en nombre au cas où c'est une chaîne
    const num = Number(amount);

    // Formater avec séparateurs de milliers
    const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);

    return `${formatted} CFA`;
}

// Fonction pour formater les montants du tableau
function formatCurrencyTB(amount) {
    if (amount === undefined || amount === null) return '0 CFA';
    const num = Number(amount);
    const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
    return `${formatted}`;
}

// Écouteurs d'événements
document.getElementById('viewModalClose').addEventListener('click', closeViewModal);
document.getElementById('viewModalCloseBtn').addEventListener('click', closeViewModal);



// Édition d'une vente
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

// Suppression d'une vente
window.supprimerVente = async function (id) {
    if (!confirm("Voulez-vous vraiment supprimer ce mouvement ?")) return;
    try {
        await db.collection("ventes").doc(id).delete();
        // onSnapshot gère la mise à jour locale
        const index = ventesLocal.findIndex(v => v.id === id);
        if (index !== -1) ventesLocal.splice(index, 1);

        // Mise à jour affichage et cache
        ventesAffichees = [...ventesLocal];
        sauvegarderDansSession();
        afficherVentesPage(pageActuelle, ventesAffichees);
        console.log("vente supprimer")

    } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        alert("Erreur lors de la suppression. Voir console.");
    }
};

// Sauvegarde/Modification d'une vente via modal
modalSave.addEventListener('click', async (e) => {
    e.preventDefault();

    // 1. Validation des champs requis
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
    };

    try {
        if (venteEnCoursId) {
            await db.collection("ventes").doc(venteEnCoursId).update(venteData);
            // Mise à jour locale
            const index = ventesLocal.findIndex(v => v.id === venteEnCoursId);
            if (index !== -1) {
                ventesLocal[index] = { id: venteEnCoursId, ...venteData };
            }
            closeMouvementModal();
            showNotification("Modifier avec succes", "info");
            
            console.log("Vente mise à jour :", venteEnCoursId);
        } else {
            venteData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection("ventes").add(venteData);
            // Ajout local (ici on ne connait pas le timestamp exact ni createdAt réel)
            ventesLocal.unshift({ id: docRef.id, ...venteData, createdAt: new Date().getTime() });
            showNotification("Enregistrer avec succes", "info")
            document.getElementById("mouvementForm").reset();
            console.log("Nouvelle vente ajoutée");
        }

        ventesAffichees = [...ventesLocal];
        sauvegarderDansSession();
        afficherVentesPage(pageActuelle, ventesAffichees);

        venteEnCoursId = null;

    } catch (error) {
        console.error("Erreur lors de la sauvegarde de la vente :", error);
        alert("Erreur lors de la sauvegarde. Voir console.");
    }
});

// pour le bouton terminer sauvegarde,modification

modalFinish.addEventListener('click', async (e) => {
    e.preventDefault();

    // 1. Validation des champs requis
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
    };

    try {
        if (venteEnCoursId) {
            await db.collection("ventes").doc(venteEnCoursId).update(venteData);
            // Mise à jour locale
            const index = ventesLocal.findIndex(v => v.id === venteEnCoursId);
            if (index !== -1) {
                ventesLocal[index] = { id: venteEnCoursId, ...venteData };
            }
            closeMouvementModal();
            showNotification("Modifier avec succes", "info");
            console.log("Vente mise à jour :", venteEnCoursId);
        } else {
            venteData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection("ventes").add(venteData);
            // Ajout local (ici on ne connait pas le timestamp exact ni createdAt réel)
            ventesLocal.unshift({ id: docRef.id, ...venteData, createdAt: new Date().getTime() });
            closeMouvementModal();
            showNotification("enregistrer avec succes", "info");
            console.log("Nouvelle vente ajoutée");
        }

        ventesAffichees = [...ventesLocal];
        sauvegarderDansSession();
        afficherVentesPage(pageActuelle, ventesAffichees);

        venteEnCoursId = null;

    } catch (error) {
        console.error("Erreur lors de la sauvegarde de la vente :", error);
        alert("Erreur lors de la sauvegarde. Voir console.");
    }
});

// Synchronisation Firestore temps réel + gestion cache
if (!chargerDepuisSession()) {
    console.log("🔄 Chargement depuis Firestore...");
    db.collection("ventes")
        .orderBy("createdAt", "desc")
        .limit(500)
        .onSnapshot(snapshot => {
            let modif = false;
            snapshot.docChanges().forEach(change => {
                const vente = { id: change.doc.id, ...change.doc.data() };

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

                trierVentesParDate();
                sauvegarderDansSession();
                filtrerVentes();
            }
        });
}

// gestion des notitification 

document.addEventListener('DOMContentLoaded', function () {
    const link1 = document.getElementById('archive');

    if (link1) {
        link1.addEventListener('click', function (e) {
            e.preventDefault(); // Empêche le scroll en haut de page
            showNotification("Fonctionnalité bientôt disponible", "info");
        });
    }

});


function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;

    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = 'notification ' + type;

    // Définir les icônes selon le type
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';

    // Créer le contenu HTML
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="notification-message">${message || 'Notification'}</div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Gérer la fermeture
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            notification.remove();
        });
    }

    // Ajouter la notification au conteneur
    container.appendChild(notification);

    // Afficher avec une animation simple
    setTimeout(function () {
        notification.classList.add('show');
    }, 100);

    // Retirer automatiquement après 5 secondes
    setTimeout(function () {
        notification.classList.remove('show');
        setTimeout(function () {
            notification.remove();
        }, 300);
    }, 5000);
}

