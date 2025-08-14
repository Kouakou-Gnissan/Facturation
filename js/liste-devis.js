// Gestion de la liste des devis avec Firebase
class DevisManager {
    constructor() {
        this.currentUser = null;
        this.devisData = []; // Stockage des données des devis
        this.filteredDevisData = []; // Données filtrées
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
        if (!document.getElementById('devis-grid') || !document.getElementById('devis-list')) {
            console.error('Éléments DOM essentiels manquants');
            return;
        }

        // Éléments DOM
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.statusMessages = document.getElementById('status-messages');
        this.searchInput = document.getElementById('search-input');
        this.statusFilterElement = document.getElementById('status-filter');
        this.sortSelect = document.getElementById('sort-select');
        this.devisGrid = document.getElementById('devis-grid');
        this.devisListElement = document.getElementById('devis-list');
        this.devisTableBody = document.getElementById('devis-table-body');
        this.noDevis = document.getElementById('no-devis');
        this.pagination = document.getElementById('pagination');

        // Statistiques
        this.totalDevis = document.getElementById('total-devis');
        this.devisEnAttente = document.getElementById('devis-en-attente');
        this.devisAcceptes = document.getElementById('devis-acceptes');
        this.montantTotal = document.getElementById('montant-total');

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
            this.filterAndDisplayDevis();
        });

        // Filtre par statut
        this.statusFilterElement?.addEventListener('change', (e) => {
            this.statusFilterValue = e.target.value;
            this.filterAndDisplayDevis();
        });

        // Tri
        this.sortSelect?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.filterAndDisplayDevis();
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
                this.displayDevis();
            }
        });

        this.nextPageBtn?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredDevisData.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.displayDevis();
            }
        });
    }

    checkAuthState() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.updateUserProfile(user);
                this.loadDevis();
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

    async loadDevis() {
        try {
            this.showLoading(true);
            console.log("Chargement des devis pour l'utilisateur:", this.currentUser.uid);

            // Vérification de la connexion Firestore
            if (!firebase.firestore) {
                throw new Error("Firestore n'est pas initialisé");
            }

            const devisRef = firebase.firestore()
                .collection('devis')
                .where('userId', '==', this.currentUser.uid)
                .orderBy('dateCreation', 'desc');

            const snapshot = await devisRef.get();
            console.log(`Nombre de devis trouvés: ${snapshot.size}`);

            this.devisData = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log("Devis trouvé:", doc.id, data);

                this.devisData.push({
                    id: doc.id,
                    ...data,
                    statut: data.statut || 'brouillon',
                    dateCreation: data.dateCreation?.toDate?.() || new Date(data.dateCreation || Date.now()),
                    dateDevis: data.dateDevis?.toDate?.() || new Date(data.dateDevis || Date.now())
                });
            });

            this.updateStatistics();
            this.filterAndDisplayDevis();

        } catch (error) {
            console.error('Erreur lors du chargement des devis:', error);
            this.showMessage('Erreur lors du chargement des devis. Veuillez réessayer.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    updateStatistics() {
        const total = this.devisData.length;
        const enAttente = this.devisData.filter(d => d.statut === 'envoye' || d.statut === 'brouillon').length;
        const acceptes = this.devisData.filter(d => d.statut === 'accepte').length;
        const montantTotal = this.devisData
            .filter(d => d.statut === 'accepte')
            .reduce((sum, d) => sum + (parseFloat(d.montantTTC) || 0), 0);

        if (this.totalDevis) this.totalDevis.textContent = total;
        if (this.devisEnAttente) this.devisEnAttente.textContent = enAttente;
        if (this.devisAcceptes) this.devisAcceptes.textContent = acceptes;
        if (this.montantTotal) {
            this.montantTotal.textContent = this.formatCurrency(montantTotal);
        }
    }

    filterAndDisplayDevis() {
        if (!this.devisData || this.devisData.length === 0) {
            this.showNoDevis();
            return;
        }

        // Filtrer les devis
        this.filteredDevisData = this.devisData.filter(devis => {
            // Filtre par recherche
            const searchMatch = !this.searchTerm ||
                devis.numeroDevis?.toLowerCase().includes(this.searchTerm) ||
                devis.clientName?.toLowerCase().includes(this.searchTerm) ||
                devis.objet?.toLowerCase().includes(this.searchTerm);

            // Filtre par statut
            const statusMatch = !this.statusFilterValue || devis.statut === this.statusFilterValue;

            return searchMatch && statusMatch;
        });

        // Trier les devis
        this.sortDevis();

        // Réinitialiser la pagination
        this.currentPage = 1;

        // Afficher les devis
        this.displayDevis();
    }

    sortDevis() {
        this.filteredDevisData.sort((a, b) => {
            switch (this.sortBy) {
                case 'date-desc':
                    return new Date(b.dateCreation) - new Date(a.dateCreation);
                case 'date-asc':
                    return new Date(a.dateCreation) - new Date(b.dateCreation);
                case 'numero-asc':
                    return (a.numeroDevis || '').localeCompare(b.numeroDevis || '');
                case 'numero-desc':
                    return (b.numeroDevis || '').localeCompare(a.numeroDevis || '');
                case 'client-asc':
                    return (a.clientName || '').localeCompare(b.clientName || '');
                case 'montant-desc':
                    return (parseFloat(b.montantTTC) || 0) - (parseFloat(a.montantTTC) || 0);
                case 'montant-asc':
                    return (parseFloat(a.montantTTC) || 0) - (parseFloat(b.montantTTC) || 0);
                default:
                    return 0;
            }
        });
    }

    displayDevis() {
        console.log("Affichage des devis...", this.filteredDevisData);

        if (!this.filteredDevisData || this.filteredDevisData.length === 0) {
            this.showNoDevis();
            return;
        }

        // Calculer la pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageDevis = this.filteredDevisData.slice(startIndex, endIndex);

        if (this.currentView === 'grid') {
            this.displayGridView(pageDevis);
        } else {
            this.displayListView(pageDevis);
        }

        this.updatePagination();
        this.hideNoDevis();
    }

    displayGridView(devis) {
        if (!this.devisGrid) return;

        this.devisGrid.innerHTML = '';
        this.devisGrid.style.display = 'grid';
        this.devisListElement.style.display = 'none';

        devis.forEach(devis => {
            const card = this.createDevisCard(devis);
            this.devisGrid.appendChild(card);
        });
    }

    displayListView(devis) {
        if (!this.devisTableBody) return;

        this.devisTableBody.innerHTML = '';
        this.devisGrid.style.display = 'none';
        this.devisListElement.style.display = 'block';

        devis.forEach(devis => {
            const row = this.createDevisRow(devis);
            this.devisTableBody.appendChild(row);
        });
    }

    createDevisCard(devis) {
        const card = document.createElement('div');
        card.className = `devis-card status-${devis.statut || 'brouillon'}`;

        const statusText = this.getStatusText(devis.statut);
        const statusClass = `status-${devis.statut || 'brouillon'}`;

        card.innerHTML = `
            <div class="devis-card-header">
                <h3 class="devis-numero">${devis.numeroDevis || 'N/A'}</h3>
                <span class="devis-status ${statusClass}">${statusText}</span>
            </div>
            
            <div class="devis-client">
                <i class="bi bi-person"></i>
                ${devis.clientName || 'Client non spécifié'}
            </div>
            
            <div class="devis-info">
                <div class="devis-info-item">
                    <span class="devis-info-label">Date</span>
                    <span class="devis-info-value">${this.formatDate(devis.dateDevis)}</span>
                </div>
                <div class="devis-info-item">
                    <span class="devis-info-label">Montant</span>
                    <span class="devis-info-value devis-montant">${this.formatCurrency(devis.montantTTC)}</span>
                </div>
                <div class="devis-info-item">
                    <span class="devis-info-label">Objet</span>
                    <span class="devis-info-value">${devis.objet || 'Non spécifié'}</span>
                </div>
                <div class="devis-info-item">
                    <span class="devis-info-label">Validité</span>
                    <span class="devis-info-value">${devis.validite || 'Non spécifiée'}</span>
                </div>
            </div>
            
            <div class="devis-actions">
                <button class="action-btn btn-preview" onclick="devisManager.previewDevis('${devis.id}')" title="Aperçu">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="action-btn btn-edit" onclick="devisManager.editDevis('${devis.id}')" title="Modifier">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="action-btn btn-facture" onclick="devisManager.convertirFacture('${devis.id}')" title="Convertir en facture">
                    <i class="bi bi-receipt"></i>
                </button>
                <button class="action-btn btn-facture" onclick="devisManager.dupliquerDevis('${devis.id}')" title="Dupliquer le devis">
                    <i class="bi bi-files"></i>
                </button>                                 
                <button class="action-btn btn-delete" onclick="devisManager.confirmDeleteDevis('${devis.id}', '${devis.numeroDevis}', '${devis.clientName}')" title="Supprimer">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;

        return card;
    }

    createDevisRow(devis) {
        const row = document.createElement('tr');

        const statusText = this.getStatusText(devis.statut);
        const statusClass = `status-${devis.statut || 'brouillon'}`;

        row.innerHTML = `
            <td><strong>${devis.numeroDevis || 'N/A'}</strong></td>
            <td>${devis.clientName || 'Client non spécifié'}</td>
            <td>${this.formatDate(devis.dateDevis)}</td>
            <td><strong>${this.formatCurrency(devis.montantTTC)}</strong></td>
            <td><span class="devis-status ${statusClass}">${statusText}</span></td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn btn-previewdevis" onclick="devisManager.previewDevis('${devis.id}')" title="Aperçu">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="table-action-btn btn-editdevis" onclick="devisManager.editDevis('${devis.id}')" title="Modifier">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="table-action-btn btn-facturedevis" onclick="devisManager.convertirFacture('${devis.id}')" title="Convertir en facture">
                        <i class="bi bi-receipt"></i>
                    </button>
                    <button class="table-action-btn btn-dupliquerdevis" onclick="devisManager.dupliquerDevis('${devis.id}')" title="Dupliquer le devis">
                        <i class="bi bi-files"></i>
                    </button>                                        
                    <button class="table-action-btn btn-deletedevis" onclick="devisManager.confirmDeleteDevis('${devis.id}', '${devis.numeroDevis}', '${devis.clientName}')" title="Supprimer">
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

        // Réafficher les devis
        this.displayDevis();
    }

    updatePagination() {
        if (!this.pagination) return;

        const totalItems = this.filteredDevisData.length;
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
            this.paginationInfo.textContent = `Affichage de ${startItem}-${endItem} sur ${totalItems} devis`;
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
                this.displayDevis();
            });

            this.pageNumbers.appendChild(pageBtn);
        }
    }

    showNoDevis() {
        if (this.noDevis) {
            this.noDevis.style.display = 'block';
        }
        if (this.devisGrid) {
            this.devisGrid.style.display = 'none';
        }
        if (this.devisListElement) {
            this.devisListElement.style.display = 'none';
        }
        if (this.pagination) {
            this.pagination.style.display = 'none';
        }
    }

    hideNoDevis() {
        if (this.noDevis) {
            this.noDevis.style.display = 'none';
        }
    }

    previewDevis(devisId) {
        const devis = this.devisData.find(d => d.id === devisId);
        if (!devis) return;

        const previewContent = this.generatePreviewContent(devis);
        const previewContentDiv = document.getElementById('preview-content');

        if (previewContentDiv) {
            previewContentDiv.innerHTML = previewContent;
        }

        const modal = new bootstrap.Modal(document.getElementById('previewModal'));
        modal.show();
    }

    generatePreviewContent(devis) {
        return `
            <div class="preview-devis">
                <div class="preview-header">
                    <h4>Devis N° ${devis.numeroDevis}</h4>
                    <p><strong>Date:</strong> ${this.formatDate(devis.dateDevis)}</p>
                </div>
                
                <div class="preview-client">
                    <h5>Informations Client</h5>
                    <p><strong>Nom:</strong> ${devis.clientName || 'N/A'}</p>
                    <p><strong>Téléphone:</strong> ${devis.telephone || 'N/A'}</p>
                    <p><strong>Email:</strong> ${devis.email || 'N/A'}</p>
                </div>
                
                <div class="preview-details">
                    <h5>Détails du Devis</h5>
                    <p><strong>Objet:</strong> ${devis.objet || 'N/A'}</p>
                    <p><strong>Validité:</strong> ${devis.validite || 'N/A'}</p>
                    <p><strong>Conditions:</strong> ${devis.condition || 'N/A'}</p>
                </div>
                
                <div class="preview-totals">
                    <h5>Montants</h5>
                    <p><strong>Montant HT:</strong> ${this.formatCurrency(devis.montantHT)}</p>
                    <p><strong>TVA:</strong> ${devis.tva || 0}%</p>
                    <p><strong>Montant TTC:</strong> ${this.formatCurrency(devis.montantTTC)}</p>
                </div>
            </div>
        `;
    }

    editDevis(devisId) {
        window.location.href = `nouveau-devis.html?type=devis&id=${devisId}`;
    }

    convertirFacture(devisId) {
        window.location.href = `nouvelle-facture.html?type=devis&id=${devisId}`;
    }

    dupliquerDevis(devisId) {
         window.location.href = `nouveau-devis.html?type=devisdupliquer&id=${devisId}`;
    }


    confirmDeleteDevis(devisId, numeroDevis, clientName) {
        document.getElementById('delete-devis-numero').textContent = numeroDevis;
        document.getElementById('delete-devis-client').textContent = clientName;

        const confirmBtn = document.getElementById('confirm-delete');
        confirmBtn.onclick = () => this.deleteDevis(devisId);

        const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        deleteModal.show();
    }

    async deleteDevis(devisId) {
        try {
            await firebase.firestore().collection('devis').doc(devisId).delete();

            this.devisData = this.devisData.filter(d => d.id !== devisId);
            this.updateStatistics();
            this.filterAndDisplayDevis();

            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            deleteModal.hide();

            this.showMessage('Devis supprimé avec succès.', 'success');
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            this.showMessage('Erreur lors de la suppression du devis.', 'danger');
        }
    }

    // Utilitaires
    getStatusText(statut) {
        const statusMap = {
            'brouillon': 'Brouillon',
            'envoye': 'Envoyé',
            'accepte': 'Accepté',
            'refuse': 'Refusé',
            'expire': 'Expiré'
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

// Initialiser le gestionnaire de devis
let devisManager;

document.addEventListener('DOMContentLoaded', function () {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        devisManager = new DevisManager();
    } else {
        console.error('Firebase n\'est pas initialisé');
        document.getElementById('status-messages').innerHTML = `
            <div class="alert alert-danger">
                Erreur de configuration Firebase. Veuillez vérifier votre configuration.
            </div>
        `;
    }
});