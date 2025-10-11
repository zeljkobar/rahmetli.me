// Main Application
import API from './utils/api.js';
import { AuthManager } from './components/AuthManager.js';
import { PostCard } from './components/PostCard.js';
import { Pagination } from './components/Pagination.js';
import { 
    show, hide, handleError, showToast, showLoading, hideLoading,
    validateEmail, validatePassword, getQueryParam, setQueryParam 
} from './utils/helpers.js';

class App {
    constructor() {
        this.auth = new AuthManager();
        this.currentPage = 1;
        this.currentFilters = {};
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupRouting();
        await this.loadInitialData();
    }

    setupEventListeners() {
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const nav = document.getElementById('mainNav');
        
        if (mobileMenuBtn && nav) {
            mobileMenuBtn.addEventListener('click', () => {
                nav.classList.toggle('mobile-active');
            });
        }

        // Search modal
        const searchBtn = document.getElementById('searchBtn');
        const searchModal = document.getElementById('searchModal');
        const searchModalClose = document.getElementById('searchModalClose');
        const searchForm = document.getElementById('searchForm');

        if (searchBtn && searchModal) {
            searchBtn.addEventListener('click', () => show(searchModal));
        }

        if (searchModalClose && searchModal) {
            searchModalClose.addEventListener('click', () => hide(searchModal));
        }

        if (searchModal) {
            searchModal.addEventListener('click', (e) => {
                if (e.target === searchModal) hide(searchModal);
            });
        }

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSearch();
            });
        }

        // Auth buttons
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userAvatar = document.getElementById('userAvatar');
        const dropdownMenu = document.getElementById('dropdownMenu');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.showRegisterModal());
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.auth.logout());
        }

        if (userAvatar && dropdownMenu) {
            userAvatar.addEventListener('click', () => {
                dropdownMenu.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userAvatar.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.add('hidden');
                }
            });
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                this.navigate(href);
            });
        });
    }

    setupRouting() {
        // Simple client-side routing
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });
        
        this.handleRoute();
    }

    handleRoute() {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);

        // Update active navigation
        this.updateActiveNav(path);

        if (path === '/' || path === '/pocetna') {
            this.showHomePage();
        } else if (path === '/dzenaze') {
            this.showPostsPage('dzenaza');
        } else if (path === '/saucesca') {
            this.showPostsPage('dova');
        } else if (path === '/pomeni') {
            this.showPostsPage('pomen');
        } else if (path.startsWith('/objava/')) {
            const postId = path.split('/')[2];
            this.showPostPage(postId);
        } else if (path === '/mezaristani') {
            this.showCemeteriesPage();
        } else {
            this.show404();
        }
    }

    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    updateActiveNav(path) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === path) {
                link.classList.add('active');
            }
        });
    }

    async loadInitialData() {
        try {
            showLoading();
            // Load any initial data needed
            hideLoading();
        } catch (error) {
            hideLoading();
            console.error('Failed to load initial data:', error);
        }
    }

    async showHomePage() {
        const mainContent = document.getElementById('mainContent');
        
        mainContent.innerHTML = `
            <section class="hero">
                <div class="container">
                    <h1 class="hero-title">Rahmetli.me</h1>
                    <p class="hero-subtitle">
                        Prvi bosanski portal za obavještenja o smrti i saučešća
                    </p>
                    <div class="hero-actions">
                        <button class="btn btn-secondary btn-lg" id="heroSearchBtn">
                            🔍 Pretražite objave
                        </button>
                        <button class="btn btn-primary btn-lg" id="heroCreateBtn">
                            ➕ Nova objava
                        </button>
                    </div>
                </div>
            </section>

            <section class="section">
                <div class="container">
                    <div class="section-header">
                        <h2 class="section-title">Najnovije objave</h2>
                        <p class="section-subtitle">
                            Najnovija obavještenja o smrti, saučešća i pomeni
                        </p>
                    </div>
                    
                    <div id="recentPosts">
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            <p>Učitavanje objava...</p>
                        </div>
                    </div>
                </div>
            </section>
        `;

        // Setup hero button events
        const heroSearchBtn = document.getElementById('heroSearchBtn');
        const heroCreateBtn = document.getElementById('heroCreateBtn');

        if (heroSearchBtn) {
            heroSearchBtn.addEventListener('click', () => {
                show(document.getElementById('searchModal'));
            });
        }

        if (heroCreateBtn) {
            heroCreateBtn.addEventListener('click', () => {
                if (this.auth.isLoggedIn()) {
                    this.showCreatePostModal();
                } else {
                    showToast('Morate se prijaviti da biste kreirali objavu', 'warning');
                    this.showLoginModal();
                }
            });
        }

        // Load recent posts
        await this.loadRecentPosts();
    }

    async loadRecentPosts() {
        try {
            const response = await API.getPosts({ page: 1, limit: 6 });
            const postsContainer = document.getElementById('recentPosts');
            
            if (postsContainer) {
                postsContainer.innerHTML = PostCard.renderGrid(response.posts);
            }
        } catch (error) {
            const postsContainer = document.getElementById('recentPosts');
            if (postsContainer) {
                postsContainer.innerHTML = `
                    <div class="alert alert-danger">
                        Greška pri učitavanju objava: ${handleError(error)}
                    </div>
                `;
            }
        }
    }

    async showPostsPage(type = null) {
        const mainContent = document.getElementById('mainContent');
        
        const pageTitle = type ? this.getTypePageTitle(type) : 'Sve objave';
        
        mainContent.innerHTML = `
            <div class="page-header">
                <div class="container">
                    <h1 class="page-title">${pageTitle}</h1>
                </div>
            </div>

            <section class="section">
                <div class="container">
                    <div class="filter-bar">
                        <div class="filter-row">
                            <div class="filter-group">
                                <label class="form-label">Pretraži</label>
                                <input type="text" class="form-input" id="filterSearch" placeholder="Ime pokojnog...">
                            </div>
                            <div class="filter-group">
                                <label class="form-label">Lokacija</label>
                                <input type="text" class="form-input" id="filterLocation" placeholder="Grad, mjesto...">
                            </div>
                            <div class="filter-group">
                                <label class="form-label">&nbsp;</label>
                                <button class="btn btn-primary" id="applyFilters">Filtriraj</button>
                            </div>
                        </div>
                    </div>
                    
                    <div id="postsContent">
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            <p>Učitavanje objava...</p>
                        </div>
                    </div>
                    
                    <div id="paginationContainer"></div>
                </div>
            </section>
        `;

        // Setup filter events
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters(type);
            });
        }

        // Load posts
        this.currentFilters = { type };
        await this.loadPosts(1, this.currentFilters);
    }

    async loadPosts(page = 1, filters = {}) {
        try {
            showLoading(document.querySelector('#postsContent .loading'));
            
            const params = { page, limit: 12, ...filters };
            const response = await API.getPosts(params);
            
            const postsContainer = document.getElementById('postsContent');
            const paginationContainer = document.getElementById('paginationContainer');
            
            if (postsContainer) {
                postsContainer.innerHTML = PostCard.renderGrid(response.posts);
            }

            if (paginationContainer && response.pagination.totalPages > 1) {
                const pagination = new Pagination(response.pagination, (newPage) => {
                    this.loadPosts(newPage, filters);
                });
                paginationContainer.innerHTML = pagination.render();
                pagination.attachEventListeners(paginationContainer);
            } else if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }

            this.currentPage = page;
            
        } catch (error) {
            const postsContainer = document.getElementById('postsContent');
            if (postsContainer) {
                postsContainer.innerHTML = `
                    <div class="alert alert-danger">
                        Greška pri učitavanju objava: ${handleError(error)}
                    </div>
                `;
            }
        }
    }

    applyFilters(baseType = null) {
        const searchInput = document.getElementById('filterSearch');
        const locationInput = document.getElementById('filterLocation');
        
        const filters = {};
        
        if (baseType) filters.type = baseType;
        if (searchInput?.value.trim()) filters.q = searchInput.value.trim();
        if (locationInput?.value.trim()) filters.location = locationInput.value.trim();
        
        this.currentFilters = filters;
        this.loadPosts(1, filters);
    }

    getTypePageTitle(type) {
        const titles = {
            'dzenaza': 'Dženaze',
            'dova': 'Saučešća',
            'pomen': 'Pomeni',
            'hatma': 'Hatme'
        };
        return titles[type] || 'Objave';
    }

    async handleSearch() {
        const query = document.getElementById('searchQuery')?.value.trim();
        const type = document.getElementById('searchType')?.value;
        const location = document.getElementById('searchLocation')?.value.trim();

        const filters = {};
        if (query) filters.q = query;
        if (type) filters.type = type;
        if (location) filters.location = location;

        // Close search modal
        hide(document.getElementById('searchModal'));

        // Navigate to search results
        this.navigate('/');
        
        // Update page to show search results
        await this.showSearchResults(filters);
    }

    async showSearchResults(filters) {
        const mainContent = document.getElementById('mainContent');
        
        mainContent.innerHTML = `
            <div class="page-header">
                <div class="container">
                    <h1 class="page-title">Rezultati pretrage</h1>
                </div>
            </div>

            <section class="section">
                <div class="container">
                    <div id="postsContent">
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            <p>Pretražujem...</p>
                        </div>
                    </div>
                    
                    <div id="paginationContainer"></div>
                </div>
            </section>
        `;

        await this.loadPosts(1, filters);
    }

    show404() {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h1 class="empty-state-title">Stranica nije pronađena</h1>
                <p class="empty-state-description">
                    Stranica koju tražite ne postoji ili je uklonjena.
                </p>
                <a href="/" class="btn btn-primary">Povratak na početnu</a>
            </div>
        `;
    }

    showLoginModal() {
        // Implementation for login modal
        showToast('Login modal - to be implemented', 'info');
    }

    showRegisterModal() {
        // Implementation for register modal
        showToast('Register modal - to be implemented', 'info');
    }

    showCreatePostModal() {
        // Implementation for create post modal
        showToast('Create post modal - to be implemented', 'info');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});