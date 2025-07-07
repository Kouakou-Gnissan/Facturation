// Gestion de la liste des clients avec Firebase
class ClientManager {
    constructor() {
        this.currentUser = null;
        this.clientData = []; // Stockage des données des clients
        this.filteredClientData = []; // Données filtrées
        this.currentView = 'grid'; // Vue par défaut
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.searchTerm = '';
        this.statusFilterValue = ''; // Valeur du filtre de statut
        this.sortBy = 'nom-asc'; // Tri par défaut
        this.editingClientId = null; // ID du client en cours d'édition

        // Initialisation
        this.initializeElements();
        this.initializeEventListeners();
        this.checkAuthState();
    }

    initializeElements() {
        // Vérification des éléments DOM essentiels
        if (!document.getElementById('clients-grid') || !document.getElementById('clients-list')) {
            console.error('Éléments DOM essentiels manquants');
            return;
        }

        // Éléments DOM
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.statusMessages = document.getElementById('status-messages');
        this.searchInput = document.getElementById('search-input');
        this.statusFilterElement = document.getElementById('status-filter');
        this.sortSelect = document.getElementById('sort-select');
        this.clientsGrid = document.getElementById('clients-grid');
        this.clientsListElement = document.getElementById('clients-list');
        this.clientsTableBody = document.getElementById('clients-table-body');
        this.noClients = document.getElementById('no-clients');
        this.pagination = document.getElementById('pagination');

        // Statistiques spécifiques aux clients
        this.totalClients = document.getElementById('total-clients');
        this.clientsActifs = document.getElementById('clients-actifs');
        this.pourcentageActifs = document.getElementById('pourcentage-actifs');
        this.nouveauxClients = document.getElementById('nouveaux-clients');
        this.evolutionNouveaux = document.getElementById('evolution-nouveaux');
        this.caMoyen = document.getElementById('ca-moyen');
        this.caTotalClients = document.getElementById('ca-total-clients');
        this.transactionsMoyennes = document.getElementById('transactions-moyennes');
        this.totalTransactions = document.getElementById('total-transactions');

        // Boutons de vue
        this.viewButtons = document.querySelectorAll('.view-btn');

        // Pagination
        this.prevPageBtn = document.getElementById('prev-page');
        this.nextPageBtn = document.getElementById('next-page');
        this.pageNumbers = document.getElementById('page-numbers');
        this.paginationInfo = document.getElementById('pagination-info-text');

        // Formulaire client
        this.clientForm = document.getElementById('clientForm');
        this.saveClientBtn = document.getElementById('save-client');
    }

    initializeEventListeners() {
        // Recherche
        this.searchInput?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterAndDisplayClients();
        });

        // Filtre par statut
        this.statusFilterElement?.addEventListener('change', (e) => {
            this.statusFilterValue = e.target.value;
            this.filterAndDisplayClients();
        });

        // Tri
        this.sortSelect?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.filterAndDisplayClients();
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
                this.displayClients();
            }
        });

        this.nextPageBtn?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredClientData.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.displayClients();
            }
        });

        // Formulaire client
        this.saveClientBtn?.addEventListener('click', () => {
            this.saveClient();
        });

        // Bouton d'édition depuis les détails
        document.getElementById('edit-from-details')?.addEventListener('click', () => {
            const detailsModal = bootstrap.Modal.getInstance(document.getElementById('detailsModal'));
            detailsModal.hide();
            this.showEditClientModal(this.editingClientId);
        });
    }

    checkAuthState() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.updateUserProfile(user);
                this.loadClients();
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

    async loadClients() {
        try {
            this.showLoading(true);
            console.log("Chargement des clients pour l'utilisateur:", this.currentUser.uid);

            // Vérification de la connexion Firestore
            if (!firebase.firestore) {
                throw new Error("Firestore n'est pas initialisé");
            }

            const clientsRef = firebase.firestore()
                .collection('clients')
                .where('userId', '==', this.currentUser.uid)
                .orderBy('dateCreation', 'desc');

            const snapshot = await clientsRef.get();
            console.log(`Nombre de clients trouvés: ${snapshot.size}`);

            this.clientData = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log("Client trouvé:", doc.id, data);
                
                this.clientData.push({
                    id: doc.id,
                    ...data,
                    dateCreation: data.dateCreation?.toDate?.() || new Date(data.dateCreation || Date.now()),
                    statut: this.determineClientStatus(data)
                });
            });

            // Charger les données de facturation pour les statistiques
            await this.loadClientStatistics();
            this.updateStatistics();
            this.filterAndDisplayClients();

        } catch (error) {
            console.error('Erreur lors du chargement des clients:', error);
            this.showMessage('Erreur lors du chargement des clients. Veuillez réessayer.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async loadClientStatistics() {
        try {
            // Charger les factures pour calculer les statistiques
            const facturesRef = firebase.firestore()
                .collection('factures')
                .where('userId', '==', this.currentUser.uid);

            const facturesSnapshot = await facturesRef.get();
            const factures = [];
            facturesSnapshot.forEach(doc => {
                factures.push(doc.data());
            });

            // Charger les devis pour les statistiques
            const devisRef = firebase.firestore()
                .collection('devis')
                .where('userId', '==', this.currentUser.uid);

            const devisSnapshot = await devisRef.get();
            const devis = [];
            devisSnapshot.forEach(doc => {
                devis.push(doc.data());
            });

            // Calculer les statistiques pour chaque client
            this.clientData.forEach(client => {
                const clientFactures = factures.filter(f => f.clientName === client.nom || f.clientName === `${client.nom} ${client.prenom || ''}`.trim());
                const clientDevis = devis.filter(d => d.clientName === client.nom || d.clientName === `${client.nom} ${client.prenom || ''}`.trim());

                client.chiffreAffaires = clientFactures
                    .filter(f => f.statut === 'payee')
                    .reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);

                client.nombreTransactions = clientFactures.length + clientDevis.length;
                client.derniereTransaction = this.getLastTransactionDate(clientFactures, clientDevis);
            });

        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    }

    determineClientStatus(clientData) {
        const now = new Date();
        const creationDate = clientData.dateCreation?.toDate?.() || new Date(clientData.dateCreation || Date.now());
        const daysSinceCreation = Math.floor((now - creationDate) / (1000 * 60 * 60 * 24));

        if (daysSinceCreation <= 30) {
            return 'nouveau';
        }

        // Déterminer si le client est actif basé sur les transactions récentes
        // Pour l'instant, on considère tous les clients comme actifs
        // Cette logique peut être affinée avec les données de facturation
        return 'actif';
    }

    getLastTransactionDate(factures, devis) {
        const allTransactions = [...factures, ...devis];
        if (allTransactions.length === 0) return null;

        const dates = allTransactions.map(t => {
            return t.dateCreation?.toDate?.() || new Date(t.dateCreation || 0);
        });

        return new Date(Math.max(...dates));
    }

    updateStatistics() {
        const total = this.clientData.length;
        const actifs = this.clientData.filter(c => c.statut === 'actif').length;
        const nouveaux = this.clientData.filter(c => c.statut === 'nouveau').length;
        
        // Calcul du CA total et moyen
        const caTotal = this.clientData.reduce((sum, c) => sum + (c.chiffreAffaires || 0), 0);
        const caMoyenValue = total > 0 ? caTotal / total : 0;
        
        // Calcul des transactions moyennes
        const totalTransactionsValue = this.clientData.reduce((sum, c) => sum + (c.nombreTransactions || 0), 0);
        const transactionsMoyennesValue = total > 0 ? totalTransactionsValue / total : 0;

        // Calcul du pourcentage de clients actifs
        const pourcentageActifsValue = total > 0 ? Math.round((actifs / total) * 100) : 0;

        // Mise à jour des éléments DOM
        if (this.totalClients) this.totalClients.textContent = total;
        if (this.clientsActifs) this.clientsActifs.textContent = actifs;
        if (this.pourcentageActifs) this.pourcentageActifs.textContent = `${pourcentageActifsValue}% du total`;
        if (this.nouveauxClients) this.nouveauxClients.textContent = nouveaux;
        if (this.evolutionNouveaux) this.evolutionNouveaux.textContent = `+${nouveaux} ce mois`;
        if (this.caMoyen) this.caMoyen.textContent = this.formatCurrency(caMoyenValue);
        if (this.caTotalClients) this.caTotalClients.textContent = `CA total: ${this.formatCurrency(caTotal)}`;
        if (this.transactionsMoyennes) this.transactionsMoyennes.textContent = Math.round(transactionsMoyennesValue);
        if (this.totalTransactions) this.totalTransactions.textContent = `Total: ${totalTransactionsValue} transactions`;
    }

    filterAndDisplayClients() {
        if (!this.clientData || this.clientData.length === 0) {
            this.showNoClients();
            return;
        }

        // Filtrer les clients
        this.filteredClientData = this.clientData.filter(client => {
            // Filtre par recherche
            const searchMatch = !this.searchTerm ||
                client.nom?.toLowerCase().includes(this.searchTerm) ||
                client.prenom?.toLowerCase().includes(this.searchTerm) ||
                client.email?.toLowerCase().includes(this.searchTerm) ||
                client.entreprise?.toLowerCase().includes(this.searchTerm) ||
                client.telephone?.toLowerCase().includes(this.searchTerm);

            // Filtre par statut
            const statusMatch = !this.statusFilterValue || client.statut === this.statusFilterValue;

            return searchMatch && statusMatch;
        });

        // Trier les clients
        this.sortClients();

        // Réinitialiser la pagination
        this.currentPage = 1;

        // Afficher les clients
        this.displayClients();
    }

    sortClients() {
        this.filteredClientData.sort((a, b) => {
            switch (this.sortBy) {
                case 'nom-asc':
                    return (a.nom || '').localeCompare(b.nom || '');
                case 'nom-desc':
                    return (b.nom || '').localeCompare(a.nom || '');
                case 'date-desc':
                    return new Date(b.dateCreation) - new Date(a.dateCreation);
                case 'date-asc':
                    return new Date(a.dateCreation) - new Date(b.dateCreation);
                case 'ca-desc':
                    return (b.chiffreAffaires || 0) - (a.chiffreAffaires || 0);
                case 'ca-asc':
                    return (a.chiffreAffaires || 0) - (b.chiffreAffaires || 0);
                case 'transactions-desc':
                    return (b.nombreTransactions || 0) - (a.nombreTransactions || 0);
                default:
                    return 0;
            }
        });
    }

    displayClients() {
        console.log("Affichage des clients...", this.filteredClientData);

        if (!this.filteredClientData || this.filteredClientData.length === 0) {
            this.showNoClients();
            return;
        }

        // Calculer la pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageClients = this.filteredClientData.slice(startIndex, endIndex);

        if (this.currentView === 'grid') {
            this.displayGridView(pageClients);
        } else {
            this.displayListView(pageClients);
        }

        this.updatePagination();
        this.hideNoClients();
    }

    displayGridView(clients) {
        if (!this.clientsGrid) return;

        this.clientsGrid.innerHTML = '';
        this.clientsGrid.style.display = 'grid';
        this.clientsListElement.style.display = 'none';

        clients.forEach(client => {
            const card = this.createClientCard(client);
            this.clientsGrid.appendChild(card);
        });
    }

    displayListView(clients) {
        if (!this.clientsTableBody) return;

        this.clientsTableBody.innerHTML = '';
        this.clientsGrid.style.display = 'none';
        this.clientsListElement.style.display = 'block';

        clients.forEach(client => {
            const row = this.createClientRow(client);
            this.clientsTableBody.appendChild(row);
        });
    }

    createClientCard(client) {
        const card = document.createElement('div');
        card.className = `client-card status-${client.statut || 'actif'}`;

        const initials = this.getClientInitials(client);
        const fullName = `${client.nom || ''} ${client.prenom || ''}`.trim();
        const statusText = this.getStatusText(client.statut);
        const statusClass = `status-${client.statut || 'actif'}`;

        card.innerHTML = `
            <div class="client-card-header">
                <span class="client-status ${statusClass}">${statusText}</span>
            </div>
            
            <div class="client-avatar">${initials}</div>
            
            <div class="client-nom">${fullName || 'Nom non spécifié'}</div>
            ${client.entreprise ? `<div class="client-entreprise">${client.entreprise}</div>` : ''}
            
            <div class="client-contact">
                ${client.email ? `
                    <div class="client-contact-item">
                        <i class="bi bi-envelope"></i>
                        <span>${client.email}</span>
                    </div>
                ` : ''}
                ${client.telephone ? `
                    <div class="client-contact-item">
                        <i class="bi bi-telephone"></i>
                        <span>${client.telephone}</span>
                    </div>
                ` : ''}
                ${client.ville ? `
                    <div class="client-contact-item">
                        <i class="bi bi-geo-alt"></i>
                        <span>${client.ville}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="client-stats">
                <div class="client-stat-item">
                    <span class="client-stat-value">${this.formatCurrency(client.chiffreAffaires || 0)}</span>
                    <span class="client-stat-label">Chiffre d'affaires</span>
                </div>
                <div class="client-stat-item">
                    <span class="client-stat-value">${client.nombreTransactions || 0}</span>
                    <span class="client-stat-label">Transactions</span>
                </div>
            </div>
            
            <div class="client-actions">
                <button class="action-btn btn-details" onclick="clientManager.showClientDetails('${client.id}')" title="Détails">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="action-btn btn-edit" onclick="clientManager.showEditClientModal('${client.id}')" title="Modifier">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="action-btn btn-delete" onclick="clientManager.confirmDeleteClient('${client.id}', '${fullName}', '${client.email || ''}')" title="Supprimer">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;

        return card;
    }

    createClientRow(client) {
        const row = document.createElement('tr');

        const fullName = `${client.nom || ''} ${client.prenom || ''}`.trim();
        const statusText = this.getStatusText(client.statut);
        const statusClass = `status-${client.statut || 'actif'}`;

        row.innerHTML = `
            <td><strong>${fullName || 'Nom non spécifié'}</strong></td>
            <td>${client.email || 'N/A'}</td>
            <td>${client.telephone || 'N/A'}</td>
            <td>${this.formatDate(client.dateCreation)}</td>
            <td><strong>${this.formatCurrency(client.chiffreAffaires || 0)}</strong></td>
            <td>${client.nombreTransactions || 0}</td>
            <td><span class="client-status ${statusClass}">${statusText}</span></td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn btn-details" onclick="clientManager.showClientDetails('${client.id}')" title="Détails">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="table-action-btn btn-edit" onclick="clientManager.showEditClientModal('${client.id}')" title="Modifier">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="table-action-btn btn-delete" onclick="clientManager.confirmDeleteClient('${client.id}', '${fullName}', '${client.email || ''}')" title="Supprimer">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    getClientInitials(client) {
        const nom = client.nom || '';
        const prenom = client.prenom || '';
        
        if (nom && prenom) {
            return (nom[0] + prenom[0]).toUpperCase();
        } else if (nom) {
            return nom.substring(0, 2).toUpperCase();
        } else {
            return 'CL';
        }
    }

    switchView(view) {
        this.currentView = view;

        // Mettre à jour les boutons
        this.viewButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Réafficher les clients
        this.displayClients();
    }

    updatePagination() {
        if (!this.pagination) return;

        const totalItems = this.filteredClientData.length;
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
            this.paginationInfo.textContent = `Affichage de ${startItem}-${endItem} sur ${totalItems} clients`;
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
                this.displayClients();
            });

            this.pageNumbers.appendChild(pageBtn);
        }
    }

    showNoClients() {
        if (this.noClients) {
            this.noClients.style.display = 'block';
        }
        if (this.clientsGrid) {
            this.clientsGrid.style.display = 'none';
        }
        if (this.clientsListElement) {
            this.clientsListElement.style.display = 'none';
        }
        if (this.pagination) {
            this.pagination.style.display = 'none';
        }
    }

    hideNoClients() {
        if (this.noClients) {
            this.noClients.style.display = 'none';
        }
    }

    showAddClientModal() {
        this.editingClientId = null;
        this.resetClientForm();
        document.getElementById('clientModalTitle').textContent = 'Ajouter un client';
        
        const modal = new bootstrap.Modal(document.getElementById('clientModal'));
        modal.show();
    }

    showEditClientModal(clientId) {
        const client = this.clientData.find(c => c.id === clientId);
        if (!client) return;

        this.editingClientId = clientId;
        this.populateClientForm(client);
        document.getElementById('clientModalTitle').textContent = 'Modifier le client';
        
        const modal = new bootstrap.Modal(document.getElementById('clientModal'));
        modal.show();
    }

    resetClientForm() {
        if (this.clientForm) {
            this.clientForm.reset();
        }
    }

    populateClientForm(client) {
        document.getElementById('client-nom').value = client.nom || '';
        document.getElementById('client-prenom').value = client.prenom || '';
        document.getElementById('client-email').value = client.email || '';
        document.getElementById('client-telephone').value = client.telephone || '';
        document.getElementById('client-entreprise').value = client.entreprise || '';
        document.getElementById('client-adresse').value = client.adresse || '';
        document.getElementById('client-ville').value = client.ville || '';
        document.getElementById('client-code-postal').value = client.codePostal || '';
        document.getElementById('client-notes').value = client.notes || '';
    }

    async saveClient() {
        try {
            const clientData = {
                nom: document.getElementById('client-nom').value.trim(),
                prenom: document.getElementById('client-prenom').value.trim(),
                email: document.getElementById('client-email').value.trim(),
                telephone: document.getElementById('client-telephone').value.trim(),
                entreprise: document.getElementById('client-entreprise').value.trim(),
                adresse: document.getElementById('client-adresse').value.trim(),
                ville: document.getElementById('client-ville').value.trim(),
                codePostal: document.getElementById('client-code-postal').value.trim(),
                notes: document.getElementById('client-notes').value.trim(),
                userId: this.currentUser.uid
            };

            // Validation
            if (!clientData.nom) {
                this.showMessage('Le nom du client est obligatoire.', 'warning');
                return;
            }

            if (this.editingClientId) {
                // Modification
                clientData.dateModification = firebase.firestore.FieldValue.serverTimestamp();
                
                await firebase.firestore().collection('clients').doc(this.editingClientId).update(clientData);
                
                // Mettre à jour les données locales
                const clientIndex = this.clientData.findIndex(c => c.id === this.editingClientId);
                if (clientIndex !== -1) {
                    this.clientData[clientIndex] = { ...this.clientData[clientIndex], ...clientData };
                }

                this.showMessage('Client modifié avec succès.', 'success');
            } else {
                // Ajout
                clientData.dateCreation = firebase.firestore.FieldValue.serverTimestamp();
                
                const docRef = await firebase.firestore().collection('clients').add(clientData);
                
                // Ajouter aux données locales
                this.clientData.unshift({
                    id: docRef.id,
                    ...clientData,
                    dateCreation: new Date(),
                    statut: 'nouveau'
                });

                this.showMessage('Client ajouté avec succès.', 'success');
            }

            this.updateStatistics();
            this.filterAndDisplayClients();

            const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
            modal.hide();

        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            this.showMessage('Erreur lors de la sauvegarde du client.', 'danger');
        }
    }

    showClientDetails(clientId) {
        const client = this.clientData.find(c => c.id === clientId);
        if (!client) return;

        this.editingClientId = clientId;
        const detailsContent = this.generateDetailsContent(client);
        const detailsContentDiv = document.getElementById('details-content');

        if (detailsContentDiv) {
            detailsContentDiv.innerHTML = detailsContent;
        }

        const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
        modal.show();
    }

    generateDetailsContent(client) {
        const fullName = `${client.nom || ''} ${client.prenom || ''}`.trim();
        const statusText = this.getStatusText(client.statut);
        
        return `
            <div class="client-details">
                <div class="row">
                    <div class="col-md-6">
                        <h5>Informations personnelles</h5>
                        <p><strong>Nom complet:</strong> ${fullName || 'N/A'}</p>
                        <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
                        <p><strong>Téléphone:</strong> ${client.telephone || 'N/A'}</p>
                        <p><strong>Entreprise:</strong> ${client.entreprise || 'N/A'}</p>
                        <p><strong>Statut:</strong> <span class="client-status status-${client.statut}">${statusText}</span></p>
                    </div>
                    <div class="col-md-6">
                        <h5>Adresse</h5>
                        <p><strong>Adresse:</strong> ${client.adresse || 'N/A'}</p>
                        <p><strong>Ville:</strong> ${client.ville || 'N/A'}</p>
                        <p><strong>Code postal:</strong> ${client.codePostal || 'N/A'}</p>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-6">
                        <h5>Statistiques</h5>
                        <p><strong>Chiffre d'affaires:</strong> ${this.formatCurrency(client.chiffreAffaires || 0)}</p>
                        <p><strong>Nombre de transactions:</strong> ${client.nombreTransactions || 0}</p>
                        <p><strong>Dernière transaction:</strong> ${client.derniereTransaction ? this.formatDate(client.derniereTransaction) : 'Aucune'}</p>
                    </div>
                    <div class="col-md-6">
                        <h5>Informations système</h5>
                        <p><strong>Date d'ajout:</strong> ${this.formatDate(client.dateCreation)}</p>
                        <p><strong>Dernière modification:</strong> ${client.dateModification ? this.formatDate(client.dateModification) : 'Jamais'}</p>
                    </div>
                </div>
                
                ${client.notes ? `
                    <div class="row mt-3">
                        <div class="col-12">
                            <h5>Notes</h5>
                            <p>${client.notes}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    confirmDeleteClient(clientId, clientName, clientEmail) {
        document.getElementById('delete-client-nom').textContent = clientName;
        document.getElementById('delete-client-email').textContent = clientEmail;

        const confirmBtn = document.getElementById('confirm-delete');
        confirmBtn.onclick = () => this.deleteClient(clientId);

        const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        deleteModal.show();
    }

    async deleteClient(clientId) {
        try {
            await firebase.firestore().collection('clients').doc(clientId).delete();

            this.clientData = this.clientData.filter(c => c.id !== clientId);
            this.updateStatistics();
            this.filterAndDisplayClients();

            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            deleteModal.hide();

            this.showMessage('Client supprimé avec succès.', 'success');
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            this.showMessage('Erreur lors de la suppression du client.', 'danger');
        }
    }

    // Utilitaires
    getStatusText(statut) {
        const statusMap = {
            'actif': 'Actif',
            'inactif': 'Inactif',
            'nouveau': 'Nouveau'
        };
        return statusMap[statut] || 'Actif';
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

// Initialiser le gestionnaire de clients
let clientManager;

document.addEventListener('DOMContentLoaded', function () {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        clientManager = new ClientManager();
    } else {
        console.error('Firebase n\'est pas initialisé');
        document.getElementById('status-messages').innerHTML = `
            <div class="alert alert-danger">
                Erreur de configuration Firebase. Veuillez vérifier votre configuration.
            </div>
        `;
    }
});

