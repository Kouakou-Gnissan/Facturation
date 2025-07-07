// Gestion de la liste des factures avec Firebase
class FactureManager {
    constructor() {
        this.currentUser = null;
        this.factureData = []; // Stockage des données des factures
        this.filteredFactureData = []; // Données filtrées
        this.currentView = 'grid'; // Vue par défaut
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.searchTerm = '';
        this.statusFilterValue = ''; // Valeur du filtre de statut
        this.sortBy = 'date-desc'; // Tri par défaut

        // Initialisation
        this.initializeElements();
        this.initializeEventListeners();
        this.checkAuthState();
    }

    initializeElements() {
        // Vérification des éléments DOM essentiels
        if (!document.getElementById('factures-grid') || !document.getElementById('factures-list')) {
            console.error('Éléments DOM essentiels manquants');
            return;
        }

        // Éléments DOM
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.statusMessages = document.getElementById('status-messages');
        this.searchInput = document.getElementById('search-input');
        this.statusFilterElement = document.getElementById('status-filter');
        this.sortSelect = document.getElementById('sort-select');
        this.facturesGrid = document.getElementById('factures-grid');
        this.facturesListElement = document.getElementById('factures-list');
        this.facturesTableBody = document.getElementById('factures-table-body');
        this.noFactures = document.getElementById('no-factures');
        this.pagination = document.getElementById('pagination');

        // Statistiques spécifiques aux factures
        this.totalFactures = document.getElementById('total-factures');
        this.chiffreAffaires = document.getElementById('chiffre-affaires');
        this.montantPaye = document.getElementById('montant-paye');
        this.nombrePayees = document.getElementById('nombre-payees');
        this.montantImpaye = document.getElementById('montant-impaye');
        this.nombreImpayees = document.getElementById('nombre-impayees');
        this.montantEchu = document.getElementById('montant-echu');
        this.nombreEchues = document.getElementById('nombre-echues');

        // Boutons de vue
        this.viewButtons = document.querySelectorAll('.view-btn');

        // Pagination
        this.prevPageBtn = document.getElementById('prev-page');
        this.nextPageBtn = document.getElementById('next-page');
        this.pageNumbers = document.getElementById('page-numbers');
        this.paginationInfo = document.getElementById('pagination-info-text');
    }

    initializeEventListeners() {
        // Recherche
        this.searchInput?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterAndDisplayFactures();
        });

        // Filtre par statut
        this.statusFilterElement?.addEventListener('change', (e) => {
            this.statusFilterValue = e.target.value;
            this.filterAndDisplayFactures();
        });

        // Tri
        this.sortSelect?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.filterAndDisplayFactures();
        });

        // Boutons de vue
        this.viewButtons?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Pagination
        this.prevPageBtn?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.displayFactures();
            }
        });

        this.nextPageBtn?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredFactureData.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.displayFactures();
            }
        });
    }

    checkAuthState() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.updateUserProfile(user);
                this.loadFactures();
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    updateUserProfile(user) {
        const username = document.querySelector('.username');
        const role = document.querySelector('.role');
        const avatar = document.querySelector('.avatar');

        if (username) {
            username.textContent = user.displayName || user.email.split('@')[0];
        }

        if (role) {
            role.textContent = 'Utilisateur';
        }

        if (avatar) {
            const initials = (user.displayName || user.email)
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            avatar.textContent = initials;
        }
    }

    showLoading(show = true) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    showMessage(message, type = 'info') {
        if (!this.statusMessages) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        this.statusMessages.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    async loadFactures() {
        try {
            this.showLoading(true);
            console.log("Chargement des factures pour l'utilisateur:", this.currentUser.uid);

            // Vérification de la connexion Firestore
            if (!firebase.firestore) {
                throw new Error("Firestore n'est pas initialisé");
            }

            const facturesRef = firebase.firestore()
                .collection('factures')
                .where('userId', '==', this.currentUser.uid)
                .orderBy('dateCreation', 'desc');

            const snapshot = await facturesRef.get();
            console.log(`Nombre de factures trouvées: ${snapshot.size}`);

            this.factureData = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log("Facture trouvée:", doc.id, data);
                
                this.factureData.push({
                    id: doc.id,
                    ...data,
                    statut: data.statut || 'brouillon',
                    dateCreation: data.dateCreation?.toDate?.() || new Date(data.dateCreation || Date.now()),
                    dateFacture: data.dateFacture?.toDate?.() || new Date(data.dateFacture || Date.now()),
                    dateEcheance: data.dateEcheance?.toDate?.() || new Date(data.dateEcheance || Date.now())
                });
            });

            this.updateStatistics();
            this.filterAndDisplayFactures();

        } catch (error) {
            console.error('Erreur lors du chargement des factures:', error);
            this.showMessage('Erreur lors du chargement des factures. Veuillez réessayer.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    updateStatistics() {
        const total = this.factureData.length;
        const payees = this.factureData.filter(f => f.statut === 'payee');
        const impayees = this.factureData.filter(f => f.statut === 'impayee');
        const echues = this.factureData.filter(f => this.isFactureEchue(f));
        
        // Calcul du chiffre d'affaires total
        const chiffreAffairesTotal = this.factureData
            .reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);
        
        // Calcul du montant payé
        const montantPayeTotal = payees
            .reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);
        
        // Calcul du montant impayé
        const montantImpayeTotal = impayees
            .reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);
        
        // Calcul du montant échu
        const montantEchuTotal = echues
            .reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);

        // Mise à jour des éléments DOM
        if (this.totalFactures) this.totalFactures.textContent = total;
        if (this.chiffreAffaires) this.chiffreAffaires.textContent = this.formatCurrency(chiffreAffairesTotal);
        if (this.montantPaye) this.montantPaye.textContent = this.formatCurrency(montantPayeTotal);
        if (this.nombrePayees) this.nombrePayees.textContent = `${payees.length} factures payées`;
        if (this.montantImpaye) this.montantImpaye.textContent = this.formatCurrency(montantImpayeTotal);
        if (this.nombreImpayees) this.nombreImpayees.textContent = `${impayees.length} factures impayées`;
        if (this.montantEchu) this.montantEchu.textContent = this.formatCurrency(montantEchuTotal);
        if (this.nombreEchues) this.nombreEchues.textContent = `${echues.length} factures échues`;
    }

    isFactureEchue(facture) {
        if (!facture.dateEcheance || facture.statut === 'payee') return false;
        const today = new Date();
        const echeance = new Date(facture.dateEcheance);
        return echeance < today;
    }

    isFactureEcheanceSoon(facture) {
        if (!facture.dateEcheance || facture.statut === 'payee') return false;
        const today = new Date();
        const echeance = new Date(facture.dateEcheance);
        const diffTime = echeance - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && diffDays > 0;
    }

    filterAndDisplayFactures() {
        if (!this.factureData || this.factureData.length === 0) {
            this.showNoFactures();
            return;
        }

        // Filtrer les factures
        this.filteredFactureData = this.factureData.filter(facture => {
            // Filtre par recherche
            const searchMatch = !this.searchTerm ||
                facture.numeroFacture?.toLowerCase().includes(this.searchTerm) ||
                facture.clientName?.toLowerCase().includes(this.searchTerm) ||
                facture.objet?.toLowerCase().includes(this.searchTerm);

            // Filtre par statut
            const statusMatch = !this.statusFilterValue || facture.statut === this.statusFilterValue;

            return searchMatch && statusMatch;
        });

        // Trier les factures
        this.sortFactures();

        // Réinitialiser la pagination
        this.currentPage = 1;

        // Afficher les factures
        this.displayFactures();
    }

    sortFactures() {
        this.filteredFactureData.sort((a, b) => {
            switch (this.sortBy) {
                case 'date-desc':
                    return new Date(b.dateCreation) - new Date(a.dateCreation);
                case 'date-asc':
                    return new Date(a.dateCreation) - new Date(b.dateCreation);
                case 'numero-asc':
                    return (a.numeroFacture || '').localeCompare(b.numeroFacture || '');
                case 'numero-desc':
                    return (b.numeroFacture || '').localeCompare(a.numeroFacture || '');
                case 'client-asc':
                    return (a.clientName || '').localeCompare(b.clientName || '');
                case 'montant-desc':
                    return (parseFloat(b.montantTTC) || 0) - (parseFloat(a.montantTTC) || 0);
                case 'montant-asc':
                    return (parseFloat(a.montantTTC) || 0) - (parseFloat(b.montantTTC) || 0);
                case 'echeance-asc':
                    return new Date(a.dateEcheance || 0) - new Date(b.dateEcheance || 0);
                default:
                    return 0;
            }
        });
    }

    displayFactures() {
        console.log("Affichage des factures...", this.filteredFactureData);

        if (!this.filteredFactureData || this.filteredFactureData.length === 0) {
            this.showNoFactures();
            return;
        }

        // Calculer la pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageFactures = this.filteredFactureData.slice(startIndex, endIndex);

        if (this.currentView === 'grid') {
            this.displayGridView(pageFactures);
        } else {
            this.displayListView(pageFactures);
        }

        this.updatePagination();
        this.hideNoFactures();
    }

    displayGridView(factures) {
        if (!this.facturesGrid) return;

        this.facturesGrid.innerHTML = '';
        this.facturesGrid.style.display = 'grid';
        this.facturesListElement.style.display = 'none';

        factures.forEach(facture => {
            const card = this.createFactureCard(facture);
            this.facturesGrid.appendChild(card);
        });
    }

    displayListView(factures) {
        if (!this.facturesTableBody) return;

        this.facturesTableBody.innerHTML = '';
        this.facturesGrid.style.display = 'none';
        this.facturesListElement.style.display = 'block';

        factures.forEach(facture => {
            const row = this.createFactureRow(facture);
            this.facturesTableBody.appendChild(row);
        });
    }

    createFactureCard(facture) {
        const card = document.createElement('div');
        card.className = `facture-card status-${facture.statut || 'brouillon'}`;

        const statusText = this.getStatusText(facture.statut);
        const statusClass = `status-${facture.statut || 'brouillon'}`;
        
        // Déterminer la classe d'échéance
        let echeanceClass = '';
        let echeanceText = this.formatDate(facture.dateEcheance);
        
        if (this.isFactureEchue(facture)) {
            echeanceClass = 'overdue';
            echeanceText += ' (Échue)';
        } else if (this.isFactureEcheanceSoon(facture)) {
            echeanceClass = 'due-soon';
            echeanceText += ' (Bientôt)';
        }

        card.innerHTML = `
            <div class="facture-card-header">
                <h3 class="facture-numero">${facture.numeroFacture || 'N/A'}</h3>
                <span class="facture-status ${statusClass}">${statusText}</span>
            </div>
            
            <div class="facture-client">
                <i class="bi bi-person"></i>
                ${facture.clientName || 'Client non spécifié'}
            </div>
            
            <div class="facture-info">
                <div class="facture-info-item">
                    <span class="facture-info-label">Date</span>
                    <span class="facture-info-value">${this.formatDate(facture.dateFacture)}</span>
                </div>
                <div class="facture-info-item">
                    <span class="facture-info-label">Échéance</span>
                    <span class="facture-info-value facture-echeance ${echeanceClass}">${echeanceText}</span>
                </div>
                <div class="facture-info-item">
                    <span class="facture-info-label">Montant</span>
                    <span class="facture-info-value facture-montant">${this.formatCurrency(facture.montantTTC)}</span>
                </div>
                <div class="facture-info-item">
                    <span class="facture-info-label">Objet</span>
                    <span class="facture-info-value">${facture.objet || 'Non spécifié'}</span>
                </div>
            </div>
            
            <div class="facture-actions">
                <button class="action-btn btn-preview" onclick="factureManager.previewFacture('${facture.id}')" title="Aperçu">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="action-btn btn-status" onclick="factureManager.changeStatus('${facture.id}', '${facture.numeroFacture}', '${facture.clientName}')" title="Statut">
                    <i class="bi bi-arrow-repeat"></i>
                </button>
                <button class="action-btn btn-edit" onclick="factureManager.editFacture('${facture.id}')" title="Modifier">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="action-btn btn-delete" onclick="factureManager.confirmDeleteFacture('${facture.id}', '${facture.numeroFacture}', '${facture.clientName}')" title="Supprimer">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;

        return card;
    }

    createFactureRow(facture) {
        const row = document.createElement('tr');

        const statusText = this.getStatusText(facture.statut);
        const statusClass = `status-${facture.statut || 'brouillon'}`;
        
        // Déterminer la classe d'échéance
        let echeanceClass = '';
        let echeanceText = this.formatDate(facture.dateEcheance);
        
        if (this.isFactureEchue(facture)) {
            echeanceClass = 'overdue';
            echeanceText += ' (Échue)';
        } else if (this.isFactureEcheanceSoon(facture)) {
            echeanceClass = 'due-soon';
            echeanceText += ' (Bientôt)';
        }

        row.innerHTML = `
            <td><strong>${facture.numeroFacture || 'N/A'}</strong></td>
            <td>${facture.clientName || 'Client non spécifié'}</td>
            <td>${this.formatDate(facture.dateFacture)}</td>
            <td><span class="facture-echeance ${echeanceClass}">${echeanceText}</span></td>
            <td><strong>${this.formatCurrency(facture.montantTTC)}</strong></td>
            <td><span class="facture-status ${statusClass}">${statusText}</span></td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn btn-preview" onclick="factureManager.previewFacture('${facture.id}')" title="Aperçu">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="table-action-btn btn-status" onclick="factureManager.changeStatus('${facture.id}', '${facture.numeroFacture}', '${facture.clientName}')" title="Statut">
                        <i class="bi bi-arrow-repeat"></i>
                    </button>
                    <button class="table-action-btn btn-edit" onclick="factureManager.editFacture('${facture.id}')" title="Modifier">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="table-action-btn btn-delete" onclick="factureManager.confirmDeleteFacture('${facture.id}', '${facture.numeroFacture}', '${facture.clientName}')" title="Supprimer">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    switchView(view) {
        this.currentView = view;

        // Mettre à jour les boutons
        this.viewButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Réafficher les factures
        this.displayFactures();
    }

    updatePagination() {
        if (!this.pagination) return;

        const totalItems = this.filteredFactureData.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);

        if (totalPages <= 1) {
            this.pagination.style.display = 'none';
            return;
        }

        this.pagination.style.display = 'flex';

        // Mettre à jour les informations
        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);

        if (this.paginationInfo) {
            this.paginationInfo.textContent = `Affichage de ${startItem}-${endItem} sur ${totalItems} factures`;
        }

        // Mettre à jour les boutons
        this.prevPageBtn.disabled = this.currentPage === 1;
        this.nextPageBtn.disabled = this.currentPage === totalPages;

        // Générer les numéros de page
        this.generatePageNumbers(totalPages);
    }

    generatePageNumbers(totalPages) {
        if (!this.pageNumbers) return;

        this.pageNumbers.innerHTML = '';

        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.displayFactures();
            });

            this.pageNumbers.appendChild(pageBtn);
        }
    }

    showNoFactures() {
        if (this.noFactures) {
            this.noFactures.style.display = 'block';
        }
        if (this.facturesGrid) {
            this.facturesGrid.style.display = 'none';
        }
        if (this.facturesListElement) {
            this.facturesListElement.style.display = 'none';
        }
        if (this.pagination) {
            this.pagination.style.display = 'none';
        }
    }

    hideNoFactures() {
        if (this.noFactures) {
            this.noFactures.style.display = 'none';
        }
    }

    previewFacture(factureId) {
        const facture = this.factureData.find(f => f.id === factureId);
        if (!facture) return;

        const previewContent = this.generatePreviewContent(facture);
        const previewContentDiv = document.getElementById('preview-content');

        if (previewContentDiv) {
            previewContentDiv.innerHTML = previewContent;
        }

        const modal = new bootstrap.Modal(document.getElementById('previewModal'));
        modal.show();
    }

    generatePreviewContent(facture) {
        return `
            <div class="preview-facture">
                <div class="preview-header">
                    <h4>Facture N° ${facture.numeroFacture}</h4>
                    <p><strong>Date:</strong> ${this.formatDate(facture.dateFacture)}</p>
                    <p><strong>Échéance:</strong> ${this.formatDate(facture.dateEcheance)}</p>
                </div>
                
                <div class="preview-client">
                    <h5>Informations Client</h5>
                    <p><strong>Nom:</strong> ${facture.clientName || 'N/A'}</p>
                    <p><strong>Téléphone:</strong> ${facture.telephone || 'N/A'}</p>
                    <p><strong>Email:</strong> ${facture.email || 'N/A'}</p>
                </div>
                
                <div class="preview-details">
                    <h5>Détails de la Facture</h5>
                    <p><strong>Objet:</strong> ${facture.objet || 'N/A'}</p>
                    <p><strong>Statut:</strong> ${this.getStatusText(facture.statut)}</p>
                    <p><strong>Conditions:</strong> ${facture.condition || 'N/A'}</p>
                </div>
                
                <div class="preview-totals">
                    <h5>Montants</h5>
                    <p><strong>Montant HT:</strong> ${this.formatCurrency(facture.montantHT)}</p>
                    <p><strong>TVA:</strong> ${facture.tva || 0}%</p>
                    <p><strong>Montant TTC:</strong> ${this.formatCurrency(facture.montantTTC)}</p>
                </div>
            </div>
        `;
    }

    changeStatus(factureId, numeroFacture, clientName) {
        const facture = this.factureData.find(f => f.id === factureId);
        if (!facture) return;

        document.getElementById('status-facture-numero').textContent = numeroFacture;
        document.getElementById('status-facture-client').textContent = clientName;
        
        const newStatusSelect = document.getElementById('new-status');
        newStatusSelect.value = facture.statut;

        const confirmBtn = document.getElementById('confirm-status-change');
        confirmBtn.onclick = () => this.updateFactureStatus(factureId);

        const statusModal = new bootstrap.Modal(document.getElementById('statusModal'));
        statusModal.show();
    }

    async updateFactureStatus(factureId) {
        try {
            const newStatus = document.getElementById('new-status').value;
            
            await firebase.firestore().collection('factures').doc(factureId).update({
                statut: newStatus,
                dateModification: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Mettre à jour les données locales
            const factureIndex = this.factureData.findIndex(f => f.id === factureId);
            if (factureIndex !== -1) {
                this.factureData[factureIndex].statut = newStatus;
            }

            this.updateStatistics();
            this.filterAndDisplayFactures();

            const statusModal = bootstrap.Modal.getInstance(document.getElementById('statusModal'));
            statusModal.hide();

            this.showMessage('Statut de la facture mis à jour avec succès.', 'success');
        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut:', error);
            this.showMessage('Erreur lors de la mise à jour du statut.', 'danger');
        }
    }

    editFacture(factureId) {
        window.location.href = `nouvelle-facture.html?id=${factureId}`;
    }

    confirmDeleteFacture(factureId, numeroFacture, clientName) {
        document.getElementById('delete-facture-numero').textContent = numeroFacture;
        document.getElementById('delete-facture-client').textContent = clientName;

        const confirmBtn = document.getElementById('confirm-delete');
        confirmBtn.onclick = () => this.deleteFacture(factureId);

        const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        deleteModal.show();
    }

    async deleteFacture(factureId) {
        try {
            await firebase.firestore().collection('factures').doc(factureId).delete();

            this.factureData = this.factureData.filter(f => f.id !== factureId);
            this.updateStatistics();
            this.filterAndDisplayFactures();

            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            deleteModal.hide();

            this.showMessage('Facture supprimée avec succès.', 'success');
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            this.showMessage('Erreur lors de la suppression de la facture.', 'danger');
        }
    }

    // Utilitaires
    getStatusText(statut) {
        const statusMap = {
            'brouillon': 'Brouillon',
            'envoye': 'Envoyée',
            'payee': 'Payée',
            'impayee': 'Impayée',
            'echue': 'Échue',
            'annulee': 'Annulée'
        };
        return statusMap[statut] || 'Brouillon';
    }

    formatDate(date) {
        if (!date) return 'N/A';

        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    formatCurrency(amount) {
        if (!amount || isNaN(amount)) return '0 FCFA';

        return new Intl.NumberFormat('fr-FR', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount) + ' FCFA';
    }
}

// Initialiser le gestionnaire de factures
let factureManager;

document.addEventListener('DOMContentLoaded', function () {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        factureManager = new FactureManager();
    } else {
        console.error('Firebase n\'est pas initialisé');
        document.getElementById('status-messages').innerHTML = `
            <div class="alert alert-danger">
                Erreur de configuration Firebase. Veuillez vérifier votre configuration.
            </div>
        `;
    }
});

