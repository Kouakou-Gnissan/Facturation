// Gestion des factures avec Firebase

class FactureManager {
    constructor() {
        this.currentFactureId = null;
        this.itemsCount = 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.ajouterLigneArticle(); // Ajouter une ligne par défaut
        this.calculerTotaux();
    }

    setupEventListeners() {
        // Bouton sauvegarder
        document.getElementById('btn-enregistrer').addEventListener('click', () => {
            this.sauvegarderFacture();
        });

        // Bouton supprimer
        document.getElementById('btn-supprimer').addEventListener('click', () => {
            this.supprimerFacture();
        });

        // Bouton Imprimer 
        document.getElementById('btn-imprimer').addEventListener('click', () => {
            this.ImprimerFacture();
        });

        // Bouton nouvelle facture 
        document.getElementById('btn-nouvelle').addEventListener('click', () => {
            this.nouvelleFacture();
        });

        // Calcul automatique des totaux
        document.addEventListener('input', (e) => {
            if (e.target.matches('.quantity-input, .price-input, #remise, #main-oeuvre, #tva')) {
                this.calculerTotaux();
            }
        });

        // Validation des formulaires
        document.addEventListener('blur', (e) => {
            if (e.target.matches('input[required]')) {
                this.validateField(e.target);
            }
        }, true);
    }

    // Ajouter une ligne d'article
    ajouterLigneArticle() {

        const table = document.querySelector('#items-table');
        table.style.tableLayout = 'fixed';
        table.style.width = '100%';

        const tbody = document.querySelector('#items-table tbody');
        if (tbody.children.length > 18) {
            showStatusMessage('Trop d\'article pour cette facture. Veuillez en faire une nouvelle', 'warning');
            return;
        }
        const row = document.createElement('tr');
        row.dataset.itemId = this.itemsCount++;

        row.innerHTML = `
            <td style="width: 40%";>
                <input type="text" class="tb-control description-input" placeholder="Description de l'article..." required>
            </td>
            <td style="width: 15%";>
                <input type="number" class="tb-control quantity-input" min="1" value="1" required>
            </td>
            <td style="width: 20%";>
                <input type="number" class="tb-control price-input" min="0" step="0.01" placeholder="0.00" required>
            </td>
            <td style="width: 20%";>
                <input type="number" class="tb-control total-input" readonly>
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="factureManager.supprimerLigneArticle(this)">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);

        // Ajouter les événements pour cette ligne
        const quantityInput = row.querySelector('.quantity-input');
        const priceInput = row.querySelector('.price-input');

        [quantityInput, priceInput].forEach(input => {
            input.addEventListener('input', () => {
                this.calculerLigneTotal(row);
                this.calculerTotaux();
            });
        });

        this.calculerLigneTotal(row);
    }

    // Supprimer une ligne d'article
    supprimerLigneArticle(button) {
        const row = button.closest('tr');
        const tbody = document.querySelector('#items-table tbody');

        // Garder au moins une ligne
        if (tbody.children.length > 1) {
            row.remove();
            this.calculerTotaux();
        } else {
            showStatusMessage('Au moins un article doit être présent', 'warning');
        }
    }

    // Calculer le total d'une ligne
    calculerLigneTotal(row) {
        const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
        const price = parseFloat(row.querySelector('.price-input').value) || 0;
        const total = quantity * price;

        row.querySelector('.total-input').value = total.toFixed(2);
    }

    // Calculer tous les totaux
    calculerTotaux() {
        // Calculer le montant HT
        let montantHT = 0;
        document.querySelectorAll('.total-input').forEach(input => {
            montantHT += parseFloat(input.value) || 0;
        });

        document.getElementById('montantht').value = montantHT.toFixed(2);

        // Calculer après remise
        const remise = parseFloat(document.getElementById('remise').value) || 0;
        const apresRemise = montantHT * (1 - remise / 100);
        document.getElementById('apres-remise').value = apresRemise.toFixed(2);

        // Ajouter main d'œuvre
        const mainOeuvre = parseFloat(document.getElementById('main-oeuvre').value) || 0;
        const sousTotal = apresRemise + mainOeuvre;

        // Calculer TVA
        const tva = parseFloat(document.getElementById('tva').value) || 0;
        const montantTVA = sousTotal * (tva / 100);
        const montantTTC = sousTotal + montantTVA;

        document.getElementById('montant-ttc').value = montantTTC.toFixed(2);
    }

    // Valider un champ
    validateField(field) {
        const value = field.value.trim();
        const isValid = field.checkValidity();

        // Supprimer les classes précédentes
        field.classList.remove('error', 'success');

        // Supprimer les messages d'erreur précédents
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        if (!isValid || (field.hasAttribute('required') && !value)) {
            field.classList.add('error');

            const errorMsg = document.createElement('span');
            errorMsg.className = 'error-message';
            errorMsg.textContent = field.validationMessage || 'Ce champ est requis';
            field.parentNode.appendChild(errorMsg);

            return false;
        } else {
            field.classList.add('success');
            return true;
        }
    }

    // Valider tout le formulaire
    validateForm() {
        const requiredFields = document.querySelectorAll('input[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Vérifier qu'il y a au moins un article avec description et prix
        const rows = document.querySelectorAll('#items-table tbody tr');
        let hasValidItem = false;

        rows.forEach(row => {
            const description = row.querySelector('.description-input').value.trim();
            const price = parseFloat(row.querySelector('.price-input').value) || 0;

            if (description && price > 0) {
                hasValidItem = true;
            }
        });

        if (!hasValidItem) {
            showStatusMessage('Au moins un article avec description et prix doit être ajouté', 'error');
            isValid = false;
        }

        return isValid;
    }

    // Collecter les données du formulaire
    collectFormData() {
        const formData = {
            // Informations générales
            numeroFacture: document.getElementById('numero-facture').value,
            dateFacture: document.getElementById('date-facture').value,
            dateEcheance: document.getElementById('date-echeance').value,
            statut: document.getElementById('statut-facture').value,

            // Informations facture
            regime: document.getElementById('regime').value,
            objet: document.getElementById('objet').value,
            article: document.getElementById('article').value,
            modePaiement: document.getElementById('mode-paiement').value,
            condition: document.getElementById('condition').value,
            garantie: document.getElementById('garantie').value,

            // Informations client
            clientName: document.getElementById('client-name').value,
            att: document.getElementById('att').value,
            telephone: document.getElementById('telephone').value,
            bp: document.getElementById('bp').value,
            cc: document.getElementById('cc').value,
            email: document.getElementById('email').value,

            // Articles
            articles: [],

            // Totaux
            montantHT: parseFloat(document.getElementById('montantht').value) || 0,
            remise: parseFloat(document.getElementById('remise').value) || 0,
            apresRemise: parseFloat(document.getElementById('apres-remise').value) || 0,
            mainOeuvre: parseFloat(document.getElementById('main-oeuvre').value) || 0,
            tva: parseFloat(document.getElementById('tva').value) || 0,
            montantTTC: parseFloat(document.getElementById('montant-ttc').value) || 0,

            // Métadonnées
            dateCreation: new Date().toISOString(),
            dateModification: new Date().toISOString()
        };

        // Collecter les articles
        document.querySelectorAll('#items-table tbody tr').forEach(row => {
            const description = row.querySelector('.description-input').value.trim();
            const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
            const price = parseFloat(row.querySelector('.price-input').value) || 0;
            const total = parseFloat(row.querySelector('.total-input').value) || 0;

            if (description && quantity > 0 && price >= 0) {
                formData.articles.push({
                    description,
                    quantity,
                    price,
                    total
                });
            }
        });

        return formData;
    }

    // Sauvegarder la facture dans Firebase
    async sauvegarderFacture() {
        if (!window.isFirebaseConfigured()) {
            showStatusMessage('Firebase n\'est pas configuré. Veuillez configurer Firebase pour sauvegarder les factures.', 'warning');
            return;
        }

        if (!this.validateForm()) {
            showStatusMessage('Veuillez corriger les erreurs dans le formulaire', 'error');
            return;
        }

        try {
            // Afficher l'indicateur de chargement
            this.showLoading(true);

            const formData = this.collectFormData();

            // Ajouter l'utilisateur connecté à la facture
            const user = window.firebaseAuth.currentUser;
            if (!user) {
                showStatusMessage('Vous devez être connecté pour sauvegarder une facture.', 'error');
                return;
            }
            formData.userId = user.uid;

            // Générer un ID unique si c'est une nouvelle facture
            if (!this.currentFactureId) {
                this.currentFactureId = 'facture_' + Date.now();
            }

            // Sauvegarder dans Firestore
            await window.firebaseDb.collection('factures').doc(this.currentFactureId).set(formData);

            showStatusMessage('Facture sauvegardée avec succès!', 'success');

            // Réinitialiser le formulaire
            this.nouvelleFacture();

        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            showStatusMessage('Erreur lors de la sauvegarde: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Charger une facture depuis Firebase
    async chargerFacture(factureId) {
        if (!window.isFirebaseConfigured()) {
            showStatusMessage('Firebase n\'est pas configuré', 'warning');
            return;
        }

        try {
            this.showLoading(true);

            const doc = await window.firebaseDb.collection('factures').doc(factureId).get();

            if (doc.exists) {
                const data = doc.data();
                this.populateForm(data);
                this.currentFactureId = factureId;
                showStatusMessage('Facture chargée avec succès!', 'success');
            } else {
                showStatusMessage('Facture non trouvée', 'error');
            }

        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            showStatusMessage('Erreur lors du chargement: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Remplir le formulaire avec les données
    populateForm(data) {
        // Informations générales
        document.getElementById('numero-facture').value = data.numeroFacture || '';
        document.getElementById('date-facture').value = data.dateFacture || '';
        document.getElementById('date-echeance').value = data.dateEcheance || '';
        document.getElementById('statut-facture').value = data.statut || 'brouillon';

        // Informations facture
        document.getElementById('regime').value = data.regime || '';
        document.getElementById('objet').value = data.objet || '';
        document.getElementById('article').value = data.article || '';
        document.getElementById('mode-paiement').value = data.modePaiement || '';
        document.getElementById('condition').value = data.condition || '';
        document.getElementById('garantie').value = data.garantie || '';

        // Informations client
        document.getElementById('client-name').value = data.clientName || '';
        document.getElementById('att').value = data.att || '';
        document.getElementById('telephone').value = data.telephone || '';
        document.getElementById('bp').value = data.bp || '';
        document.getElementById('cc').value = data.cc || '';
        document.getElementById('email').value = data.email || '';

        // Totaux
        document.getElementById('remise').value = data.remise || 0;
        document.getElementById('main-oeuvre').value = data.mainOeuvre || 0;
        document.getElementById('tva').value = data.tva || 18;

        // Vider le tableau actuel
        const tbody = document.querySelector('#items-table tbody');
        tbody.innerHTML = '';

        // Ajouter les articles
        if (data.articles && data.articles.length > 0) {
            data.articles.forEach(article => {
                this.ajouterLigneArticle();
                const lastRow = tbody.lastElementChild;

                lastRow.querySelector('.description-input').value = article.description;
                lastRow.querySelector('.quantity-input').value = article.quantity;
                lastRow.querySelector('.price-input').value = article.price;

                this.calculerLigneTotal(lastRow);
            });
        } else {
            this.ajouterLigneArticle();
        }

        this.calculerTotaux();
    }

    // Supprimer une facture
    async supprimerFacture() {
        if (!this.currentFactureId) {
            showStatusMessage('Aucune facture à supprimer', 'warning');
            return;
        }

        if (!window.isFirebaseConfigured()) {
            showStatusMessage('Firebase n\'est pas configuré', 'warning');
            return;
        }

        if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.')) {
            return;
        }

        try {
            this.showLoading(true);

            await window.firebaseDb.collection('factures').doc(this.currentFactureId).delete();

            showStatusMessage('Facture supprimée avec succès!', 'success');

            // Réinitialiser le formulaire
            this.nouvelleFacture();

        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            showStatusMessage('Erreur lors de la suppression: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Imprimer facture 
    async ImprimerFacture() {

        // Proceder d'abord a l'enregistrement 

        if (!window.isFirebaseConfigured()) {
            showStatusMessage('Firebase n\'est pas configuré. Veuillez configurer Firebase pour sauvegarder les factures.', 'warning');
            return;
        }

        if (!this.validateForm()) {
            showStatusMessage('Veuillez corriger les erreurs dans le formulaire', 'error');
            return;
        }

        try {
            // Afficher l'indicateur de chargement
            this.showLoading(true);

            const formData = this.collectFormData();

            // Ajouter l'utilisateur connecté à la facture
            const user = window.firebaseAuth.currentUser;
            if (!user) {
                showStatusMessage('Vous devez être connecté pour sauvegarder une facture.', 'error');
                return;
            }
            formData.userId = user.uid;

            // Générer un ID unique si c'est une nouvelle facture
            if (!this.currentFactureId) {
                this.currentFactureId = 'facture_' + Date.now();
            }

            // Sauvegarder dans Firestore
            await window.firebaseDb.collection('factures').doc(this.currentFactureId).set(formData);

            showStatusMessage('Facture sauvegardée avec succès!', 'success');

            const factureData = this.collectFormData();

            localStorage.setItem("factureData", JSON.stringify(factureData));
            window.open("facture.html", "_blank");

        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            showStatusMessage('Erreur lors de la sauvegarde: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Créer une nouvelle facture
    nouvelleFacture() {
        this.currentFactureId = null;

        // Réinitialiser le formulaire
        document.querySelectorAll('input').forEach(input => {
            if (input.type === 'number') {
                input.value = input.id === 'tva' ? '18' : '0';
            } else if (input.type === 'date') {
                if (input.id === 'date-facture') {
                    input.value = new Date().toISOString().split('T')[0];
                } else if (input.id === 'date-echeance') {
                    const echeanceDate = new Date();
                    echeanceDate.setDate(echeanceDate.getDate() + 30);
                    input.value = echeanceDate.toISOString().split('T')[0];
                }
            } else if (input.id === 'numero-facture') {
                input.value = 'FAC-L2EP-AFRIC-' + Date.now().toString().slice(-6);
            } else {
                input.value = '';
            }

            input.classList.remove('error', 'success');
        });

        // Réinitialiser les selects
        document.getElementById('statut-facture').value = 'brouillon';
        document.getElementById('mode-paiement').value = '';

        // Supprimer les messages d'erreur
        document.querySelectorAll('.error-message').forEach(msg => msg.remove());

        // Réinitialiser le tableau
        const tbody = document.querySelector('#items-table tbody');
        tbody.innerHTML = '';
        this.itemsCount = 0;
        this.ajouterLigneArticle();

        this.calculerTotaux();
        showStatusMessage('Nouvelle facture créée', 'info');
    }

    // Afficher/masquer l'indicateur de chargement
    showLoading(show) {
        const loadingIndicator = document.getElementById('loading-indicator');
        const container = document.querySelector('.invoice-container');

        if (show) {
            loadingIndicator.style.display = 'block';
            container.classList.add('loading');
        } else {
            loadingIndicator.style.display = 'none';
            container.classList.remove('loading');
        }
    }

    // Lister toutes les factures
    async listerFactures() {
        if (!window.isFirebaseConfigured()) {
            showStatusMessage('Firebase n\'est pas configuré', 'warning');
            return [];
        }

        try {
            const snapshot = await window.firebaseDb.collection('factures')
                .orderBy('dateModification', 'desc')
                .get();

            const facturesList = [];
            snapshot.forEach(doc => {
                facturesList.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return facturesList;

        } catch (error) {
            console.error('Erreur lors de la récupération des factures:', error);
            showStatusMessage('Erreur lors de la récupération des factures: ' + error.message, 'error');
            return [];
        }
    }
}

// Fonction globale pour ajouter une ligne (appelée depuis le HTML)
function ajouterLigneArticle() {
    if (window.factureManager) {
        window.factureManager.ajouterLigneArticle();
    }
}

// Fonctions globales pour les boutons (appelées depuis le HTML)
function SauvegarderFacture() {
    if (window.factureManager) {
        window.factureManager.sauvegarderFacture();
    }
}

function ImprimerFacture() {
    if (window.factureManager) {
        window.factureManager.ImprimerFacture();
    }
}

// Initialiser le gestionnaire de factures
let factureManager;

document.addEventListener('DOMContentLoaded', function () {
    factureManager = new FactureManager();
    window.factureManager = factureManager; // Rendre accessible globalement

    // Vérifier si un ID de facture est passé dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const factureId = urlParams.get('id');

    if (factureId) {
        factureManager.chargerFacture(factureId);
    }
});

// Export pour utilisation dans d'autres fichiers
window.FactureManager = FactureManager;

