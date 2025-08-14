// Gestionnaire du tableau de bord avec Firebase et Chart.js
class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.factureData = [];
        this.devisData = [];
        this.clientData = [];
        this.revenueChart = null;
        this.invoiceStatusChart = null;
        this.currentRevenuePeriod = 30; // 30 jours par défaut

        // Initialisation
        this.initializeElements();
        this.initializeEventListeners();
        this.checkAuthState();
    }

    initializeElements() {
        // Éléments DOM
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.statusMessages = document.getElementById('status-messages');

        // Statistiques principales
        this.totalRevenue = document.getElementById('total-revenue');
        this.revenueTrend = document.getElementById('revenue-trend');
        this.revenuePeriod = document.getElementById('revenue-period');
        this.totalInvoices = document.getElementById('total-invoices');
        this.invoicesTrend = document.getElementById('invoices-trend');
        this.invoicesBreakdown = document.getElementById('invoices-breakdown');
        this.totalQuotes = document.getElementById('total-quotes');
        this.quotesTrend = document.getElementById('quotes-trend');
        this.quotesBreakdown = document.getElementById('quotes-breakdown');
        this.totalClients = document.getElementById('total-clients');
        this.clientsTrend = document.getElementById('clients-trend');
        this.clientsBreakdown = document.getElementById('clients-breakdown');

        // Alertes
        this.overdueCount = document.getElementById('overdue-count');
        this.overdueAmount = document.getElementById('overdue-amount');
        this.pendingQuotesCount = document.getElementById('pending-quotes-count');
        this.pendingQuotesAmount = document.getElementById('pending-quotes-amount');
        this.goalProgress = document.getElementById('goal-progress');
        this.goalPercentage = document.getElementById('goal-percentage');
        this.goalAmount = document.getElementById('goal-amount');

        // Activités et top clients
        this.recentActivities = document.getElementById('recent-activities');
        this.topClientsList = document.getElementById('top-clients-list');
        this.invoiceLegend = document.getElementById('invoice-legend');

        // Contrôles
        this.revenuePeriodSelect = document.getElementById('revenue-period-select');
        this.saveQuickClientBtn = document.getElementById('save-quick-client');
    }

    initializeEventListeners() {
        // Changement de période pour le graphique des revenus
        this.revenuePeriodSelect?.addEventListener('change', (e) => {
            this.currentRevenuePeriod = parseInt(e.target.value);
            this.updateRevenueChart();
        });

        // Sauvegarde rapide de client
        this.saveQuickClientBtn?.addEventListener('click', () => {
            this.saveQuickClient();
        });
    }

    checkAuthState() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.updateUserProfile(user);
                this.loadDashboardData();
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

    async loadDashboardData() {
        try {
            this.showLoading(true);
            console.log("Chargement des données du tableau de bord pour l'utilisateur:", this.currentUser.uid);

            // Charger toutes les données en parallèle
            await Promise.all([
                this.loadFactures(),
                this.loadDevis(),
                this.loadClients()
            ]);

            // Mettre à jour toutes les statistiques et graphiques
            this.updateMainStatistics();
            this.updateAlerts();
            this.updateRecentActivities();
            this.updateTopClients();
            this.initializeCharts();

        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            this.showMessage('Erreur lors du chargement du tableau de bord. Veuillez réessayer.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async loadFactures() {
        const facturesRef = firebase.firestore()
            .collection('factures')
            .where('userId', '==', this.currentUser.uid)
            .orderBy('dateCreation', 'desc');

        const snapshot = await facturesRef.get();
        this.factureData = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            this.factureData.push({
                id: doc.id,
                ...data,
                dateCreation: data.dateCreation?.toDate?.() || new Date(data.dateCreation || Date.now()),
                dateFacture: data.dateFacture?.toDate?.() || new Date(data.dateFacture || Date.now()),
                dateEcheance: data.dateEcheance?.toDate?.() || new Date(data.dateEcheance || Date.now())
            });
        });

        console.log(`${this.factureData.length} factures chargées`);
    }

    async loadDevis() {
        const devisRef = firebase.firestore()
            .collection('devis')
            .where('userId', '==', this.currentUser.uid)
            .orderBy('dateCreation', 'desc');

        const snapshot = await devisRef.get();
        this.devisData = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            this.devisData.push({
                id: doc.id,
                ...data,
                dateCreation: data.dateCreation?.toDate?.() || new Date(data.dateCreation || Date.now()),
                dateDevis: data.dateDevis?.toDate?.() || new Date(data.dateDevis || Date.now())
            });
        });

        console.log(`${this.devisData.length} devis chargés`);
    }

    async loadClients() {
        const clientsRef = firebase.firestore()
            .collection('clients')
            .where('userId', '==', this.currentUser.uid)
            .orderBy('dateCreation', 'desc');

        const snapshot = await clientsRef.get();
        this.clientData = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            this.clientData.push({
                id: doc.id,
                ...data,
                dateCreation: data.dateCreation?.toDate?.() || new Date(data.dateCreation || Date.now())
            });
        });

        // Calculer les statistiques pour chaque client
        this.calculateClientStatistics();

        console.log(`${this.clientData.length} clients chargés`);
    }

    calculateClientStatistics() {
        this.clientData.forEach(client => {
            const clientFactures = this.factureData.filter(f => 
                f.clientName === client.nom || 
                f.clientName === `${client.nom} ${client.prenom || ''}`.trim()
            );
            
            const clientDevis = this.devisData.filter(d => 
                d.clientName === client.nom || 
                d.clientName === `${client.nom} ${client.prenom || ''}`.trim()
            );

            client.chiffreAffaires = clientFactures
                .filter(f => f.statut === 'payee')
                .reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);

            client.nombreTransactions = clientFactures.length + clientDevis.length;
        });
    }

    updateMainStatistics() {
        // Calcul du chiffre d'affaires
        const totalRevenue = this.factureData
            .filter(f => f.statut === 'payee')
            .reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);

        // Statistiques des factures
        const totalInvoices = this.factureData.length;
        const paidInvoices = this.factureData.filter(f => f.statut === 'payee').length;
        const pendingInvoices = this.factureData.filter(f => 
            f.statut === 'envoye' || f.statut === 'impayee'
        ).length;

        // Statistiques des devis
        const totalQuotes = this.devisData.length;
        const acceptedQuotes = this.devisData.filter(d => d.statut === 'accepte').length;
        const pendingQuotes = this.devisData.filter(d => d.statut === 'envoye').length;

        // Statistiques des clients
        const totalClients = this.clientData.length;
        const activeClients = this.clientData.filter(c => c.chiffreAffaires > 0).length;
        const newClients = this.clientData.filter(c => {
            const daysSinceCreation = Math.floor((new Date() - c.dateCreation) / (1000 * 60 * 60 * 24));
            return daysSinceCreation <= 30;
        }).length;

        // Mise à jour de l'interface
        if (this.totalRevenue) this.totalRevenue.textContent = this.formatCurrency(totalRevenue);
        if (this.totalInvoices) this.totalInvoices.textContent = totalInvoices;
        if (this.invoicesBreakdown) {
            this.invoicesBreakdown.textContent = `${paidInvoices} payées, ${pendingInvoices} en attente`;
        }
        if (this.totalQuotes) this.totalQuotes.textContent = totalQuotes;
        if (this.quotesBreakdown) {
            this.quotesBreakdown.textContent = `${acceptedQuotes} acceptés, ${pendingQuotes} en attente`;
        }
        if (this.totalClients) this.totalClients.textContent = totalClients;
        if (this.clientsBreakdown) {
            this.clientsBreakdown.textContent = `${activeClients} actifs, ${newClients} nouveaux`;
        }

        // Calcul des tendances (simulation pour la démo)
        this.updateTrends();
    }

    updateTrends() {
        // Simulation des tendances (dans un vrai projet, comparer avec la période précédente)
        const trends = [
            { element: this.revenueTrend, value: 12, positive: true },
            { element: this.invoicesTrend, value: 8, positive: true },
            { element: this.quotesTrend, value: 5, positive: true },
            { element: this.clientsTrend, value: 3, positive: true }
        ];

        trends.forEach(trend => {
            if (trend.element) {
                const icon = trend.element.querySelector('i');
                const span = trend.element.querySelector('span');
                
                if (trend.positive) {
                    icon.className = 'bi bi-arrow-up';
                    trend.element.className = 'stat-trend';
                    span.textContent = `+${trend.value}%`;
                } else {
                    icon.className = 'bi bi-arrow-down';
                    trend.element.className = 'stat-trend negative';
                    span.textContent = `-${trend.value}%`;
                }
            }
        });
    }

    updateAlerts() {
        // Factures échues
        const overdueInvoices = this.factureData.filter(f => {
            if (f.statut === 'payee' || !f.dateEcheance) return false;
            return new Date(f.dateEcheance) < new Date();
        });

        const overdueAmount = overdueInvoices.reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);

        if (this.overdueCount) this.overdueCount.textContent = overdueInvoices.length;
        if (this.overdueAmount) this.overdueAmount.textContent = this.formatCurrency(overdueAmount);

        // Devis en attente
        const pendingQuotes = this.devisData.filter(d => d.statut === 'envoye');
        const pendingQuotesAmount = pendingQuotes.reduce((sum, d) => sum + (parseFloat(d.montantTTC) || 0), 0);

        if (this.pendingQuotesCount) this.pendingQuotesCount.textContent = pendingQuotes.length;
        if (this.pendingQuotesAmount) this.pendingQuotesAmount.textContent = this.formatCurrency(pendingQuotesAmount);

        // Objectif du mois (simulation)
        const monthlyGoal = 10000000; // 1M FCFA
        const currentRevenue = this.factureData
            .filter(f => {
                if (f.statut !== 'payee') return false;
                const factureDate = new Date(f.dateFacture);
                const now = new Date();
                return factureDate.getMonth() === now.getMonth() && factureDate.getFullYear() === now.getFullYear();
            })
            .reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);

        const goalPercentage = Math.min(100, Math.round((currentRevenue / monthlyGoal) * 100));

        if (this.goalProgress) this.goalProgress.style.width = `${goalPercentage}%`;
        if (this.goalPercentage) this.goalPercentage.textContent = `${goalPercentage}%`;
        if (this.goalAmount) {
            this.goalAmount.textContent = `${this.formatCurrency(currentRevenue)} / ${this.formatCurrency(monthlyGoal)}`;
        }
    }

    updateRecentActivities() {
        if (!this.recentActivities) return;

        // Combiner toutes les activités récentes
        const allActivities = [];

        // Ajouter les factures récentes
        this.factureData.slice(0, 3).forEach(facture => {
            allActivities.push({
                type: 'facture',
                icon: 'bi-receipt',
                iconColor: 'var(--card-blue)',
                title: `Facture ${facture.numeroFacture || 'N/A'}`,
                description: `${facture.clientName || 'Client'} - ${this.formatCurrency(facture.montantTTC)}`,
                time: this.getRelativeTime(facture.dateCreation),
                date: facture.dateCreation
            });
        });

        // Ajouter les devis récents
        this.devisData.slice(0, 3).forEach(devis => {
            allActivities.push({
                type: 'devis',
                icon: 'bi-file-text',
                iconColor: 'var(--card-purple)',
                title: `Devis ${devis.numeroDevis || 'N/A'}`,
                description: `${devis.clientName || 'Client'} - ${this.formatCurrency(devis.montantTTC)}`,
                time: this.getRelativeTime(devis.dateCreation),
                date: devis.dateCreation
            });
        });

        // Ajouter les clients récents
        this.clientData.slice(0, 2).forEach(client => {
            allActivities.push({
                type: 'client',
                icon: 'bi-person-plus',
                iconColor: 'var(--card-green)',
                title: 'Nouveau client',
                description: `${client.nom || ''} ${client.prenom || ''}`.trim() || 'Client',
                time: this.getRelativeTime(client.dateCreation),
                date: client.dateCreation
            });
        });

        // Trier par date et prendre les 5 plus récents
        allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentActivities = allActivities.slice(0, 5);

        // Générer le HTML
        this.recentActivities.innerHTML = recentActivities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${activity.iconColor}">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `).join('');
    }

    updateTopClients() {
        if (!this.topClientsList) return;

        // Trier les clients par chiffre d'affaires
        const topClients = this.clientData
            .filter(c => c.chiffreAffaires > 0)
            .sort((a, b) => b.chiffreAffaires - a.chiffreAffaires)
            .slice(0, 5);

        if (topClients.length === 0) {
            this.topClientsList.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-people" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    Aucun client avec chiffre d'affaires pour le moment
                </div>
            `;
            return;
        }

        this.topClientsList.innerHTML = topClients.map((client, index) => {
            const fullName = `${client.nom || ''} ${client.prenom || ''}`.trim();
            const initials = this.getClientInitials(client);
            
            return `
                <div class="top-client-item">
                    <div class="client-rank">${index + 1}</div>
                    <div class="client-avatar-small">${initials}</div>
                    <div class="client-info">
                        <div class="client-name">${fullName || 'Client'}</div>
                        <div class="client-company">${client.entreprise || 'Particulier'}</div>
                    </div>
                    <div class="client-revenue">
                        <div class="client-amount">${this.formatCurrency(client.chiffreAffaires)}</div>
                        <div class="client-transactions">${client.nombreTransactions || 0} transactions</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    initializeCharts() {
        this.initializeRevenueChart();
        this.initializeInvoiceStatusChart();
    }

    initializeRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        // Préparer les données pour le graphique
        const chartData = this.prepareRevenueChartData();

        this.revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Chiffre d\'affaires',
                    data: chartData.data,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(16, 185, 129)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBackgroundColor: 'rgb(16, 185, 129)'
                    }
                }
            }
        });
    }

    prepareRevenueChartData() {
        const now = new Date();
        const labels = [];
        const data = [];

        // Générer les labels et calculer les revenus pour chaque période
        for (let i = this.currentRevenuePeriod - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            let label;
            if (this.currentRevenuePeriod <= 7) {
                label = date.toLocaleDateString('fr-FR', { weekday: 'short' });
            } else if (this.currentRevenuePeriod <= 30) {
                label = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
            } else {
                label = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
            }
            
            labels.push(label);

            // Calculer le revenu pour cette date
            const dayRevenue = this.factureData
                .filter(f => {
                    if (f.statut !== 'payee') return false;
                    const factureDate = new Date(f.dateFacture);
                    return this.isSameDay(factureDate, date);
                })
                .reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);

            data.push(dayRevenue);
        }

        return { labels, data };
    }

    initializeInvoiceStatusChart() {
        const ctx = document.getElementById('invoiceStatusChart');
        if (!ctx) return;

        // Calculer la répartition des statuts
        const statusCounts = {
            'payee': 0,
            'impayee': 0,
            'envoye': 0,
            'echue': 0,
            'brouillon': 0
        };

        this.factureData.forEach(facture => {
            const statut = facture.statut || 'brouillon';
            if (statusCounts.hasOwnProperty(statut)) {
                statusCounts[statut]++;
            }
        });

        const statusLabels = {
            'payee': 'Payées',
            'impayee': 'Impayées',
            'envoye': 'Envoyées',
            'echue': 'Échues',
            'brouillon': 'Brouillons'
        };

        const statusColors = {
            'payee': 'rgb(16, 185, 129)',
            'impayee': 'rgb(249, 115, 22)',
            'envoye': 'rgb(59, 130, 246)',
            'echue': 'rgb(239, 68, 68)',
            'brouillon': 'rgb(107, 114, 128)'
        };

        const chartData = Object.keys(statusCounts).map(status => ({
            label: statusLabels[status],
            value: statusCounts[status],
            color: statusColors[status]
        })).filter(item => item.value > 0);

        // Créer la légende
        if (this.invoiceLegend) {
            this.invoiceLegend.innerHTML = chartData.map(item => `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${item.color}"></div>
                    <span>${item.label} (${item.value})</span>
                </div>
            `).join('');
        }

        this.invoiceStatusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.map(item => item.label),
                datasets: [{
                    data: chartData.map(item => item.value),
                    backgroundColor: chartData.map(item => item.color),
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                cutout: '60%'
            }
        });
    }

    updateRevenueChart() {
        if (!this.revenueChart) return;

        const chartData = this.prepareRevenueChartData();
        this.revenueChart.data.labels = chartData.labels;
        this.revenueChart.data.datasets[0].data = chartData.data;
        this.revenueChart.update();
    }

    showAddClientModal() {
        const modal = new bootstrap.Modal(document.getElementById('quickClientModal'));
        modal.show();
    }

    async saveQuickClient() {
        try {
            const clientData = {
                nom: document.getElementById('quick-client-nom').value.trim(),
                prenom: document.getElementById('quick-client-prenom').value.trim(),
                email: document.getElementById('quick-client-email').value.trim(),
                telephone: document.getElementById('quick-client-telephone').value.trim(),
                entreprise: document.getElementById('quick-client-entreprise').value.trim(),
                userId: this.currentUser.uid,
                dateCreation: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Validation
            if (!clientData.nom) {
                this.showMessage('Le nom du client est obligatoire.', 'warning');
                return;
            }

            await firebase.firestore().collection('clients').add(clientData);

            // Ajouter aux données locales
            this.clientData.unshift({
                id: 'temp-' + Date.now(),
                ...clientData,
                dateCreation: new Date(),
                chiffreAffaires: 0,
                nombreTransactions: 0
            });

            this.updateMainStatistics();
            this.updateTopClients();
            this.updateRecentActivities();

            const modal = bootstrap.Modal.getInstance(document.getElementById('quickClientModal'));
            modal.hide();

            // Réinitialiser le formulaire
            document.getElementById('quickClientForm').reset();

            this.showMessage('Client ajouté avec succès.', 'success');

        } catch (error) {
            console.error('Erreur lors de l\'ajout du client:', error);
            this.showMessage('Erreur lors de l\'ajout du client.', 'danger');
        }
    }

    // Utilitaires
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

    getRelativeTime(date) {
        const now = new Date();
        const diffTime = Math.abs(now - new Date(date));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));

        if (diffDays > 0) {
            return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
        } else if (diffMinutes > 0) {
            return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
        } else {
            return 'À l\'instant';
        }
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
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

// Initialiser le gestionnaire du tableau de bord
let dashboardManager;

document.addEventListener('DOMContentLoaded', function () {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        dashboardManager = new DashboardManager();
    } else {
        console.error('Firebase n\'est pas initialisé');
        document.getElementById('status-messages').innerHTML = `
            <div class="alert alert-danger">
                Erreur de configuration Firebase. Veuillez vérifier votre configuration.
            </div>
        `;
    }
});

