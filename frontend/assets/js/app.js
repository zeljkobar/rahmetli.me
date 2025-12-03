// Main Application
import { api } from "../../utils/api.js";
import { AuthManager } from "../../components/AuthManager.js";
import { PostCreateForm } from "../../components/PostCreateForm.js";
import { PostCard } from "../../components/PostCard.js";
import { CommentsSection } from "../../components/CommentsSection.js";
import { Pagination } from "../../components/Pagination.js";
import { UserDashboard } from "../../components/UserDashboard.js";
import { UserProfile } from "../../components/UserProfile.js";
import { AdminDashboard } from "../../components/AdminDashboard.js";
import { SubscriptionPayment } from "../../pages/SubscriptionPayment.js";
import {
  show,
  hide,
  handleError,
  showToast,
  showLoading,
  hideLoading,
  validateEmail,
  validatePassword,
  getQueryParam,
  setQueryParam,
} from "../../utils/helpers.js";

class App {
  constructor() {
    this.currentPage = 1;
    this.currentFilters = {};
    this.currentUser = null;
    this.isHandlingRoute = false; // Add flag to prevent infinite loops
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.setupRouting();
    await this.initializeAuth();
    await this.loadInitialData();
  }

  async initializeAuth() {
    // Check if user is already logged in
    if (AuthManager.isAuthenticated()) {
      const userData = AuthManager.getCurrentUser();
      if (userData) {
        this.currentUser = userData;
        this.updateAuthUI();
      } else {
        // Try to get user profile from API
        try {
          const response = await api.getProfile();
          if (response.success) {
            this.currentUser = response.data.user;
            this.updateAuthUI();
          }
        } catch (error) {
          console.error("Failed to get user profile:", error);
          // Clear invalid token
          AuthManager.logout();
        }
      }
    } else {
      this.updateAuthUI();
    }
  }

  setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const nav = document.getElementById("mainNav");

    if (mobileMenuBtn && nav) {
      mobileMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        nav.classList.toggle("mobile-active");
        mobileMenuBtn.classList.toggle("active");
      });

      // Close mobile menu when clicking outside
      document.addEventListener("click", (e) => {
        if (nav.classList.contains("mobile-active")) {
          if (!nav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            nav.classList.remove("mobile-active");
            mobileMenuBtn.classList.remove("active");
          }
        }
      });

      // Close mobile menu when clicking on a nav link
      const navLinks = nav.querySelectorAll(".nav-link");
      navLinks.forEach((link) => {
        link.addEventListener("click", () => {
          nav.classList.remove("mobile-active");
          mobileMenuBtn.classList.remove("active");
        });
      });
    }

    // Search modal
    const searchBtn = document.getElementById("searchBtn");
    const searchModal = document.getElementById("searchModal");
    const searchModalClose = document.getElementById("searchModalClose");
    const searchForm = document.getElementById("searchForm");

    if (searchBtn && searchModal) {
      searchBtn.addEventListener("click", () => show(searchModal));
    }

    if (searchModalClose && searchModal) {
      searchModalClose.addEventListener("click", () => hide(searchModal));
    }

    if (searchModal) {
      searchModal.addEventListener("click", (e) => {
        if (e.target === searchModal) hide(searchModal);
      });
    }

    if (searchForm) {
      searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSearch();
      });
    }

    // Auth buttons
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const userAvatar = document.getElementById("userAvatar");
    const dropdownMenu = document.getElementById("dropdownMenu");

    if (loginBtn) {
      loginBtn.addEventListener("click", () => this.showLoginModal());
    }

    if (registerBtn) {
      registerBtn.addEventListener("click", () => this.showRegisterModal());
    }

    // Mobile auth buttons
    const mobileLoginBtn = document.getElementById("mobileLoginBtn");
    const mobileRegisterBtn = document.getElementById("mobileRegisterBtn");

    if (mobileLoginBtn) {
      mobileLoginBtn.addEventListener("click", () => this.showLoginModal());
    }

    if (mobileRegisterBtn) {
      mobileRegisterBtn.addEventListener("click", () =>
        this.showRegisterModal()
      );
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.logout());
    }

    // Create post button
    const createPostBtn = document.getElementById("createPostBtn");
    if (createPostBtn) {
      createPostBtn.addEventListener("click", () => this.showCreatePostModal());
    }

    if (userAvatar && dropdownMenu) {
      userAvatar.addEventListener("click", () => {
        dropdownMenu.classList.toggle("hidden");
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !userAvatar.contains(e.target) &&
          !dropdownMenu.contains(e.target)
        ) {
          dropdownMenu.classList.add("hidden");
        }
      });
    }

    // Custom events
    window.addEventListener("showLogin", () => {
      this.showLoginModal();
    });

    // Navigation links
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const href = link.getAttribute("href");
        this.navigate(href);
      });
    });

    // Post links delegation
    document.addEventListener("click", (e) => {
      const postLink = e.target.closest(".post-link");
      if (postLink) {
        e.preventDefault();
        const href = postLink.getAttribute("href");
        this.navigate(href);
      }
    });
  }

  setupRouting() {
    // Simple client-side routing
    window.addEventListener("popstate", () => {
      this.handleRoute();
    });

    this.handleRoute();
  }

  handleRoute() {
    if (this.isHandlingRoute) {
      return; // Prevent infinite loops
    }

    this.isHandlingRoute = true;

    try {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);

      // Update active navigation
      this.updateActiveNav(path);

      if (path === "/" || path === "/pocetna") {
        this.showHomePage();
      } else if (path === "/dzenaze") {
        this.showPostsPage("dzenaza");
      } else if (path === "/prethodna-24h") {
        this.showLast24HoursPage();
      } else if (path.startsWith("/objava/")) {
        const postId = path.split("/")[2];
        this.showPostPage(postId);
      } else if (path === "/mezaristani") {
        this.showCemeteriesPage();
      } else if (path === "/cijene") {
        this.showPricingPage();
      } else if (path === "/privatnost") {
        this.showPrivacyPage();
      } else if (path === "/uslovi") {
        this.showTermsPage();
      } else if (path === "/profil") {
        this.showDashboardPage();
      } else if (path === "/admin") {
        this.showAdminPage();
      } else if (path === "/subscription-payment") {
        this.showSubscriptionPaymentPage();
      } else if (path.startsWith("/korisnik/")) {
        const userId = path.split("/")[2];
        this.showUserProfilePage(userId);
      } else {
        this.show404();
      }
    } finally {
      this.isHandlingRoute = false;
    }
  }

  navigate(path) {
    window.history.pushState({}, "", path);
    this.handleRoute();
  }

  updateActiveNav(path) {
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === path) {
        link.classList.add("active");
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
      console.error("Failed to load initial data:", error);
    }
  }

  async showHomePage() {
    const mainContent = document.getElementById("mainContent");

    mainContent.innerHTML = `
            <section class="hero">
                <div class="container">
                    <h1 class="hero-title">Rahmetli.me</h1>
                    <p class="hero-subtitle">
                        Prvi islamski portal posvećen obavještenjima o prelasku na Ahiret
                    </p>
                    <div class="hero-actions">
                        <button class="btn btn-primary btn-lg" id="heroSearchBtn">
                            🔍 Pretražite objave
                        </button>
                        <button class="btn btn-secondary btn-lg" id="heroCreateBtn">
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
                            <p class="section-description">
                            Najnovija obavještenja o odlasku u ahiret
                        </p>
                        </p>
                    </div>
                    
                    <div id="recentPosts">
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            <p>Učitavanje objava...</p>
                        </div>
                    </div>
                    
                    <div id="recentPostsPagination"></div>
                </div>
            </section>
        `;

    // Setup hero button events
    const heroSearchBtn = document.getElementById("heroSearchBtn");
    const heroCreateBtn = document.getElementById("heroCreateBtn");

    if (heroSearchBtn) {
      heroSearchBtn.addEventListener("click", () => {
        show(document.getElementById("searchModal"));
      });
    }

    if (heroCreateBtn) {
      heroCreateBtn.addEventListener("click", () => {
        if (AuthManager.isAuthenticated()) {
          this.showCreatePostModal();
        } else {
          showToast("Morate se prijaviti da biste kreirali objavu", "warning");
          this.showLoginModal();
        }
      });
    }

    // Load recent posts
    await this.loadRecentPosts();
  }

  async loadRecentPosts(page = 1) {
    try {
      // POČETNA STRANICA: Broj postova po stranici (trenutno 6)
      const response = await api.getPosts({ page, limit: 6 });
      const postsContainer = document.getElementById("recentPosts");
      const paginationContainer = document.getElementById(
        "recentPostsPagination"
      );

      if (postsContainer) {
        postsContainer.innerHTML = PostCard.renderGrid(response.posts);
      }

      // Add pagination if there are multiple pages
      if (paginationContainer && response.pagination.totalPages > 1) {
        const pagination = new Pagination(response.pagination, (newPage) => {
          this.loadRecentPosts(newPage);
        });
        paginationContainer.innerHTML = pagination.render();
        pagination.attachEventListeners(paginationContainer);
      } else if (paginationContainer) {
        paginationContainer.innerHTML = "";
      }
    } catch (error) {
      const postsContainer = document.getElementById("recentPosts");
      if (postsContainer) {
        postsContainer.innerHTML = `
                    <div class="alert alert-danger">
                        InšaAllah, pokušajte ponovo: ${handleError(error)}
                    </div>
                `;
      }
    }
  }

  async showPostsPage(type = null) {
    const mainContent = document.getElementById("mainContent");

    const pageTitle = type ? this.getTypePageTitle(type) : "Sve objave";

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
                                <input type="text" class="form-input" id="filterSearch" placeholder="Ime rahmetlije...">
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
    const applyFiltersBtn = document.getElementById("applyFilters");
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener("click", () => {
        this.applyFilters(type);
      });
    }

    // Load posts
    this.currentFilters = { type };
    await this.loadPosts(1, this.currentFilters);
  }

  async loadPosts(page = 1, filters = {}) {
    try {
      showLoading(document.querySelector("#postsContent .loading"));

      // OSTALE STRANICE: Broj postova po stranici (trenutno 12)
      const params = { page, limit: 12, ...filters };
      const response = await api.getPosts(params);

      const postsContainer = document.getElementById("postsContent");
      const paginationContainer = document.getElementById(
        "paginationContainer"
      );

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
        paginationContainer.innerHTML = "";
      }

      this.currentPage = page;
    } catch (error) {
      const postsContainer = document.getElementById("postsContent");
      if (postsContainer) {
        postsContainer.innerHTML = `
                    <div class="alert alert-danger">
                        InšaAllah, pokušajte ponovo: ${handleError(error)}
                    </div>
                `;
      }
    }
  }

  applyFilters(baseType = null) {
    const searchInput = document.getElementById("filterSearch");
    const locationInput = document.getElementById("filterLocation");

    const filters = {};

    if (baseType) filters.type = baseType;
    if (searchInput?.value.trim()) filters.q = searchInput.value.trim();
    if (locationInput?.value.trim())
      filters.location = locationInput.value.trim();

    this.currentFilters = filters;
    this.loadPosts(1, filters);
  }

  getTypePageTitle(type) {
    const titles = {
      dzenaza: "Dženaze",
      hatma: "Hatme",
    };
    return titles[type] || "Objave";
  }

  async handleSearch() {
    const query = document.getElementById("searchQuery")?.value.trim();
    const type = document.getElementById("searchType")?.value;
    const location = document.getElementById("searchLocation")?.value.trim();

    const filters = {};
    if (query) filters.q = query;
    if (type) filters.type = type;
    if (location) filters.location = location;

    // Close search modal
    hide(document.getElementById("searchModal"));

    // Navigate to search results
    this.navigate("/");

    // Update page to show search results
    await this.showSearchResults(filters);
  }

  async showSearchResults(filters) {
    const mainContent = document.getElementById("mainContent");

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

  async showPostPage(postId) {
    const mainContent = document.getElementById("mainContent");

    try {
      showLoading();

      // Fetch post details
      const response = await api.get(`/posts/${postId}`);
      const post = response.post;

      if (!post) {
        this.show404();
        return;
      }

      // Use PostCard component to render obituary
      const postCard = new PostCard(post);
      const obituaryHtml = postCard.renderObituary();

      // Render post detail page with obituary format
      mainContent.innerHTML = `
        <div class="post-detail">
          <div class="container">
            <div class="post-detail-header">
              <button class="btn btn-secondary" id="backBtn">
                <i class="fas fa-arrow-left"></i> Nazad
              </button>
            </div>
            
            ${obituaryHtml}

            <!-- Comments Section -->
            <div id="commentsContainer" class="comments-container">
              <!-- Comments will be loaded here -->
            </div>
          </div>
        </div>
      `;

      // Add back button functionality
      document.getElementById("backBtn").addEventListener("click", () => {
        window.history.back();
      });

      // Initialize comments section
      const commentsContainer = document.getElementById("commentsContainer");
      this.commentsSection = new CommentsSection(postId, commentsContainer);

      hideLoading();
    } catch (error) {
      hideLoading();
      console.error("Error loading post:", error);
      this.show404();
    }
  }

  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("bs", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  show404() {
    const mainContent = document.getElementById("mainContent");
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
    AuthManager.showAuthModal("login", (authData) => {
      this.onAuthSuccess(authData, false); // false = not new registration
    });
  }

  showRegisterModal() {
    AuthManager.showAuthModal("register", (authData) => {
      this.onAuthSuccess(authData, true); // true = new registration
    });
  }

  onAuthSuccess(authData, isNewRegistration = false) {
    this.currentUser = authData.user;
    this.updateAuthUI();

    if (isNewRegistration) {
      showToast(
        "Dobrodošli! Aktivirajte sve funkcionalnosti pretplatom.",
        "success"
      );
      // Redirect na subscription payment stranicu
      this.navigate("/subscription-payment");
    } else {
      showToast("Uspešno ste se prijavili!", "success");
      // Reload posts to show user-specific content
      this.loadPosts();
    }
  }

  logout() {
    AuthManager.logout();
  }

  updateAuthUI() {
    const authButtons = document.getElementById("authButtons");
    const userMenu = document.getElementById("userMenu");
    const userInitials = document.getElementById("userInitials");

    if (this.currentUser) {
      // User is logged in
      hide(authButtons);
      show(userMenu);

      if (userInitials) {
        const initials = this.getInitials(
          this.currentUser.full_name || this.currentUser.username
        );
        userInitials.textContent = initials;
      }

      // Add admin link if user is admin
      this.updateAdminNavigation();
    } else {
      // User is not logged in
      show(authButtons);
      hide(userMenu);
      this.removeAdminNavigation();
    }
  }

  updateAdminNavigation() {
    // Remove existing admin link
    const existingAdminLink = document.getElementById("admin-nav-link");
    if (existingAdminLink) {
      existingAdminLink.remove();
    }

    // Add admin link if user is admin
    if (this.currentUser && this.currentUser.role === "admin") {
      const navList = document.querySelector(".nav-list");
      if (navList) {
        const adminLi = document.createElement("li");
        adminLi.innerHTML =
          '<a href="/admin" class="nav-link" id="admin-nav-link"><i class="fas fa-shield-alt"></i> Admin</a>';
        navList.appendChild(adminLi);
      }
    }
  }

  removeAdminNavigation() {
    const adminLink = document.getElementById("admin-nav-link");
    if (adminLink) {
      adminLink.parentElement.remove();
    }
  }

  getInitials(name) {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  showCreatePostModal() {
    // Check if user is authenticated
    if (!AuthManager.isAuthenticated()) {
      showToast("Morate se prijaviti da biste kreirali objavu", "warning");
      this.showLoginModal();
      return;
    }

    // Create and show post form modal
    const postForm = new PostCreateForm(
      (postData) => {
        // Success callback - post created
        showToast("Objava je uspešno kreirana!", "success");

        // Reload posts to show the new post
        this.loadPosts();
      },
      () => {
        // Cancel callback - modal closed
        console.log("Post creation cancelled");
      }
    );

    // Render and show modal
    postForm
      .render()
      .then((modalElement) => {
        document.body.appendChild(modalElement);
      })
      .catch((error) => {
        console.error("Failed to render post form:", error);
        showToast("Greška pri učitavanju forme", "error");
      });
  }

  async showAdminPage() {
    // Check if user is authenticated and admin
    const hasToken = AuthManager.isAuthenticated();
    const hasUserData =
      localStorage.getItem("user_data") || sessionStorage.getItem("user_data");
    const userData = hasUserData ? JSON.parse(hasUserData) : null;

    if (!hasToken || !hasUserData || !userData || userData.role !== "admin") {
      showToast("Nemate dozvolu za pristup admin panelu", "error");
      this.navigate("/");
      return;
    }

    const mainContent = document.getElementById("mainContent");

    try {
      showLoading();

      // Include admin CSS
      const adminCSS = document.createElement("link");
      adminCSS.rel = "stylesheet";
      adminCSS.href = "/css/admin.css";
      if (!document.querySelector('link[href="/css/admin.css"]')) {
        document.head.appendChild(adminCSS);
      }

      const adminDashboard = new AdminDashboard(mainContent);

      // Make it globally available for debugging
      window.adminDashboard = adminDashboard;

      hideLoading();
    } catch (error) {
      hideLoading();
      console.error("Failed to load admin dashboard:", error);
      showToast("Greška pri učitavanju admin panela", "error");
    }
  }

  async showDashboardPage() {
    // Check if user is authenticated - check both token and user data
    const hasToken = AuthManager.isAuthenticated();
    const hasUserData =
      localStorage.getItem("user_data") || sessionStorage.getItem("user_data");

    if (!hasToken && !hasUserData) {
      this.showLoginModal();
      // Redirect to home to prevent infinite loop
      this.navigate("/");
      return;
    }

    const mainContent = document.getElementById("mainContent");

    try {
      showLoading();
      const dashboard = new UserDashboard();
      const dashboardElement = await dashboard.render();

      mainContent.innerHTML = "";
      mainContent.appendChild(dashboardElement);

      hideLoading();
    } catch (error) {
      hideLoading();
      console.error("Failed to load dashboard:", error);
      showToast("Greška pri učitavanju profila", "error");
      this.navigate("/");
    }
  }

  async showUserProfilePage(userId) {
    if (!userId) {
      this.show404();
      return;
    }

    const mainContent = document.getElementById("mainContent");

    try {
      showLoading();
      const userProfile = new UserProfile(userId);
      const profileElement = await userProfile.render();

      mainContent.innerHTML = "";
      mainContent.appendChild(profileElement);

      hideLoading();
    } catch (error) {
      hideLoading();
      console.error("Failed to load user profile:", error);
      showToast("Greška pri učitavanju korisničkog profila", "error");
      this.show404();
    }
  }

  async showLast24HoursPage() {
    const mainContent = document.getElementById("mainContent");

    mainContent.innerHTML = `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Prethodna 24 sata</h1>
          <p class="page-subtitle">Objave u zadnjih 24 sata</p>
        </div>
      </div>

      <section class="section">
        <div class="container">
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

    // Izračunaj datum i vrijeme prije 24 sata
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dateFrom = yesterday.toISOString().slice(0, 19).replace("T", " "); // Format: 2025-12-01 15:30:00

    // Učitaj objave kreirane u zadnjih 24 sata
    this.currentFilters = { dateFrom };
    await this.loadPosts(1, this.currentFilters);
  }

  async showSubscriptionPaymentPage() {
    // Provjeri da li je korisnik prijavljen
    if (!AuthManager.isAuthenticated()) {
      showToast("Morate biti prijavljeni", "warning");
      this.navigate("/");
      return;
    }

    try {
      showLoading();
      const subscriptionPayment = new SubscriptionPayment();
      await subscriptionPayment.render();
      hideLoading();
    } catch (error) {
      hideLoading();
      console.error("Failed to load subscription payment page:", error);
      showToast("Greška pri učitavanju stranice", "error");
      this.navigate("/");
    }
  }

  async showPrivacyPage() {
    const mainContent = document.getElementById("mainContent");

    mainContent.innerHTML = `
      <section class="section">
        <div class="container" style="max-width: 900px;">
          <div class="section-header" style="margin-bottom: 2rem;">
            <h1 class="section-title">Politika Privatnosti</h1>
            <p class="section-subtitle">Odredbe i smjernice privatnosti korisnika</p>
          </div>

          <div style="background: white; padding: 2rem; border-radius: 12px; line-height: 1.8; color: #374151;">
            <p style="margin-bottom: 2rem;">
              Ova politika privatnosti je sastavljena tako da bolje služi onima koji se bave pitanjima kako se njihove „lične informacije" koriste na mreži. Molimo pažljivo pročitajte našu politiku privatnosti kako biste jasno razumjeli kako sakupljamo, koristimo, štitimo, ili na neki drugi način rukujemo, Vašim ličnim podacima u skladu sa našim sajtom. Korišćenjem ovog sajta prihvatate i politiku privatnosti.
            </p>

            <h2 id="sakupljanje" style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">1. SAKUPLJANJE LIČNIH PODATAKA</h2>
            
            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">1.1 Koje lične podatke prikupljamo?</h3>
            <p>Ime, Email adresu, IP adresu korisnika. Ipak, sajt možete posjetiti i anonimno.</p>

            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">1.2 Kada sakupljamo lične informacije?</h3>
            <p>Mi prikupljamo podatke od Vas kada:</p>
            <ul style="margin: 1rem 0; padding-left: 2rem;">
              <li>Posjetite sajt (IP adresa, kolačići)</li>
              <li>Pošaljete email preko kontakt forme (ime, email)</li>
              <li>Registrujete se (IP adresa, kolačići, email, korisničko ime)</li>
              <li>Kupite neku od usluga (IP adresa, kolačići, email, ime i prezime, adresa, grad, država, broj telefona)</li>
            </ul>

            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">1.3 Kako koristimo Vaše podatke?</h3>
            <p>Možemo da koristimo informacije koje sakupljamo od Vas na sljedeće načine:</p>
            <ul style="margin: 1rem 0; padding-left: 2rem;">
              <li>Da personalizujemo Vaše iskustvo na sajtu</li>
              <li>Da poboljšamo našu internet stranicu</li>
              <li>Za zaštitu našeg sajta</li>
              <li>Za slanje periodičnih email poruka o obavještenjima</li>
              <li>Za sprovođenje promocija i drugih sličnih funkcija</li>
            </ul>
            <p style="margin-top: 1rem;"><strong>Napomena:</strong> Ako u bilo koje vrijeme želite da se odjavite od primanja budućih e-poruka, link za odjavu se nalazi na dnu svake email poruke.</p>

            <h2 id="kolacici" style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">2. KORIŠĆENJE „KOLAČIĆA"</h2>
            <p>
              Kolačići su mali fajlovi koje sajt, ili njegov provajder usluga, prenese na disk Vašeg računara preko veb browser-a (ako to dozvolite) koji omogućava sistemima da prepoznaju Vaš pretraživač i snimaju određene informacije.
            </p>
            <p style="margin-top: 1rem;">Koristimo kolačiće za:</p>
            <ul style="margin: 1rem 0; padding-left: 2rem;">
              <li>Razumijevanje i čuvanje korisničkih podešavanja za buduće posjete</li>
              <li>Sastavljanje agregatnih podataka o prometu sajta</li>
              <li>Poboljšanje korisničkog iskustva</li>
            </ul>
            <p style="margin-top: 1rem;">
              Možete da izaberete da Vaš računar upozorava svaki put kada se preuzima kolačić ili možete da odaberete da isključite sve kolačiće kroz podešavanja pretraživača. Ako isključite kolačiće, neke funkcije možda neće funkcionisati ispravno.
            </p>

            <h2 id="zastita" style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">3. ZAŠTITA LIČNIH PODATAKA</h2>
            <p>
              Obavezujemo se pružati zaštitu ličnim podacima korisnika, na način da prikupljamo samo nužne, osnovne podatke koji su neophodni za ispunjenje naših obaveza. Informišemo korisnike o načinu korišćenja prikupljenih podataka i redovno dajemo mogućnost izbora o upotrebi njihovih podataka.
            </p>
            <p style="margin-top: 1rem;">
              Svi se podaci o korisnicima strogo čuvaju i dostupni su samo administraciji. Svi naši zaposleni i poslovni partneri odgovorni su za poštivanje načela zaštite privatnosti.
            </p>
            <p style="margin-top: 1rem;">
              Pružalac usluga će sve dobijene podatke trajno čuvati u skladu sa Zakonom o zaštiti ličnih podataka.
            </p>

            <h2 id="vlasnistvo" style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">4. INTELEKTUALNO VLASNIŠTVO</h2>
            <p>
              Sadržaj i dizajn portala su vlasništvo Rahmetli.me. Zabranjeno je kopiranje i komercijalna upotreba bilo kojeg dijela stranice, uključujući sve podatke koje daju korisnici, bez prethodnog pismenog dopuštenja.
            </p>

            <div style="background: #f0fff4; border-left: 4px solid #006233; padding: 1.5rem; border-radius: 8px; margin-top: 3rem;">
              <h4 style="color: #006233; margin-bottom: 0.75rem; font-size: 1.1rem;">Kontakt</h4>
              <p style="color: #4b5563; margin: 0;">
                Ako imate pitanja o našoj politici privatnosti, možete nas kontaktirati putem kontakt forme na sajtu.
              </p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async showTermsPage() {
    const mainContent = document.getElementById("mainContent");

    mainContent.innerHTML = `
      <section class="section">
        <div class="container" style="max-width: 900px;">
          <div class="section-header" style="margin-bottom: 2rem;">
            <h1 class="section-title">Uslovi Korišćenja</h1>
            <p class="section-subtitle">Odredbe i smjernice korišćenja usluga</p>
          </div>

          <div style="background: white; padding: 2rem; border-radius: 12px; line-height: 1.8; color: #374151;">
            <p style="margin-bottom: 2rem;">
              Korištenjem internetske stranice <strong>rahmetli.me</strong> smatra se da ste u potpunosti upoznati i saglasni s ovdje navedenim Uslovima korišćenja.
            </p>

            <h2 id="uslovi" style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">1. OSNOVNE ODREDBE</h2>
            <p>
              • <strong>rahmetli.me</strong> je internet stranica u vlasništvu preduzeća. Korištenjem internet stranice rahmetli.me smatra se da ste u potpunosti upoznati i saglasni s ovdje navedenim Uslovima korišćenja.
            </p>
            <p style="margin-top: 1rem;">
              • Usluge internet stranice <strong>rahmetli.me</strong> su objave obavještenja o smrti, dženazama, saučešćima, kao i informisanje populacije o islamskim običajima i procedurama.
            </p>
            <p style="margin-top: 1rem;">
              • Opšti uslovi poslovanja predstavljaju valjan i obavezujući sporazum između davaoca usluga i korisnika portala rahmetli.me.
            </p>
            <p style="margin-top: 1rem;">
              • Korisnik je dužan da se upozna prije objave sa opštim uslovima poslovanja, a samom objavom potvrđuje da se sa njima slaže.
            </p>

            <h2 style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">2. OPŠTI USLOVI POSLOVANJA</h2>
            
            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">2.1 Usluge</h3>
            <p>
              • <strong>rahmetli.me</strong> nudi usluge objave obavještenja o smrti, dženazama, saučešćima i pomenima.
            </p>
            <p style="margin-top: 1rem;">
              • Zabranjeno je naručivanje i objavljivanje sadržaja koji su štetni, nezakoniti, prijeteći, koji zlostavljaju, kleveću ili uznemiravaju.
            </p>
            <p style="margin-top: 1rem;">
              • Korisnik se obavezuje da neće objavljivati sadržaje koji nijesu u skladu sa zakonom, ostalim propisima i Ustavom Crne Gore.
            </p>
            <p style="margin-top: 1rem;">
              • Davalac usluga zadržava pravo da ne objavi neprimjeren sadržaj.
            </p>

            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">2.2 Dostupnost usluga</h3>
            <p>
              • Iako Vam rahmetli.me nastoji dati najbolju moguću ponudu usluga, rahmetli.me ne može garantovati da će usluge uvijek odgovarati Vašim potrebama.
            </p>
            <p style="margin-top: 1rem;">
              • Ukoliko dođe do greške, molimo Vas da je prijavite našem kontakt centru na e-mail <strong>info@rahmetli.me</strong> kako bismo je otklonili na najbrži mogući način.
            </p>
            <p style="margin-top: 1rem;">
              • Objava će biti vidljiva trajno na portalu, ili dok jedna od strana ne zatraži uklanjanje iz opravdanog razloga.
            </p>

            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">2.3 Prava korišćenja sadržaja</h3>
            <p>
              • Korisnici svojim zahtjevom za objavu saučešća, zahvalnice, posljednjeg pozdrava ili pomeni neopozivo ovlašćuju davaoca usluga da taj sadržaj koristi, kopira, objavljuje i distribuira.
            </p>
            <p style="margin-top: 1rem;">
              • rahmetli.me neće objaviti korisnikove lične podatke, nego samo sadržaj objave i link na stranicu rahmetli.me.
            </p>

            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">2.4 Izmjene usluga</h3>
            <p>
              • Korisnik je suglasan s time da pristup internet stranici rahmetli.me ponekad može biti u prekidu, privremeno nedostupan ili isključen.
            </p>
            <p style="margin-top: 1rem;">
              • rahmetli.me ne može biti odgovoran za bilo kakav gubitak podataka ili kakav drugi događaj do kojeg može doći za vrijeme pružanja usluga.
            </p>
            <p style="margin-top: 1rem;">
              • rahmetli.me zadržava pravo u bilo kom trenutku da izmijeni ili ukine bilo koji segment poslovanja, uključujući vrijeme dostupnosti, sadržaj, kao i opremu potrebnu za pristup.
            </p>
            <p style="margin-top: 1rem;">
              • rahmetli.me zadržava pravo da u svakom trenutku, i bez prethodne obavijesti, ukoliko to smatra potrebnim, ukine ili izmijeni bilo koji od ovdje navedenih Uslova korišćenja.
            </p>

            <h2 style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">3. ODGOVORNOSTI</h2>
            
            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">3.1 Odgovornost za sadržaj</h3>
            <p>
              • Svi oglasi, fotografije, objave, poruke, tekstovi i drugi materijali koji su objavljeni na stranicama rahmetli.me, isključiva su odgovornost lica od koje je takav sadržaj potekao.
            </p>
            <p style="margin-top: 1rem;">
              • Davalac usluga ne daje nikakve garancije tačnosti i istinitosti takvih sadržaja.
            </p>
            <p style="margin-top: 1rem;">
              • Davalac usluga ne odgovara za bilo kakvu štetu koja bi mogla nastati radi prekida dostupnosti ili grešaka u djelovanju.
            </p>

            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">3.2 Zaštita podataka i korisnika</h3>
            <p>
              • Davalac usluga zadržava pravo isključenja stranice onog korisnika koji zloupotrebljava podatke objavljene na ovim stranicama, ili na bilo koji način neovlašćeno koristi stranice portala rahmetli.me.
            </p>
            <p style="margin-top: 1rem;">
              • Kopiranje sadržaja objavljenih na ovim stranicama i njihovo objavljivanje u/na nekom drugom mediju oglašavanja je pravno kažnjivo.
            </p>

            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">3.3 Ograničenje odgovornosti</h3>
            <p>
              • rahmetli.me isključuje svaku odgovornost za bilo kakva oštećenja opreme i drugih stvari krajnjeg korisnika koja eventualno mogu nastati kao posljedica korišćenja internet stranice.
            </p>
            <p style="margin-top: 1rem;">
              • rahmetli.me se izričito ograđuje u svakom smislu od sadržaja materijala na internet stranicama trećih strana, a na koje se može ili se moglo pristupiti sa internet stranice rahmetli.me.
            </p>
            <p style="margin-top: 1rem;">
              • Korisnik pristupanjem internet stranicama trećih strana, isti to čini isključivo i samo na vlastitu odgovornost.
            </p>

            <h2 style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">4. INTELEKTUALNO VLASNIŠTVO</h2>
            <p>
              • Sadržaj i dizajn portala rahmetli.me su vlasništvo rahmetli.me.
            </p>
            <p style="margin-top: 1rem;">
              • Zabranjeno je kopiranje i komercijalna upotreba bilo kojeg dijela stranice rahmetli.me, uključujući sve podatke koje daju korisnici, bez prethodnog pismenog dopuštenja davaoca usluga.
            </p>

            <h2 style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">5. ZAŠTITA LIČNIH PODATAKA</h2>
            <p>
              • Davanje korisnikovih ličnih podataka je nužno kako bi se mogle ispuniti obaveze korisnika prema davaocu usluga.
            </p>
            <p style="margin-top: 1rem;">
              • Davalac usluga će sve dobijene podatke trajno čuvati u skladu sa Zakonom o zaštiti ličnih podataka.
            </p>
            <p style="margin-top: 1rem;">
              • Korisnicima portala strogo je zabranjeno:
            </p>
            <ul style="margin: 1rem 0; padding-left: 2rem;">
              <li>Objavljivanje, slanje i razmjena sadržaja koji krše postojeće crnogorske ili međunarodne zakone</li>
              <li>Sadržaj koji je uvredljiv, vulgaran, prijeteći, rasistički ili šovinistički ili štetan na bilo koji drugi način</li>
              <li>Objavljivanje, slanje i razmjena informacija za koje korisnik zna ili pretpostavlja da su lažne</li>
              <li>Lažno predstavljanje, odnosno predstavljanje u ime drugog pravnog ili fizičkog lica</li>
              <li>Manipulisanje identifikatorima kako bi se prikrilo porijeklo sadržaja</li>
              <li>Objavljivanje, slanje i razmjena sadržaja koji su zaštićeni autorskim pravom</li>
              <li>Svjesno objavljivanje, slanje i razmjena sadržaja koji sadrži viruse ili slične programe</li>
              <li>Prikupljanje, čuvanje i objavljivanje ličnih podataka drugih posjetitelja portala</li>
            </ul>

            <h2 style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">6. PLAĆANJE</h2>
            
            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">6.1 Načini plaćanja</h3>
            <p>
              • Plaćanje usluga na našoj internet stranici je moguće izvršiti platnim karticama – VISA, Maestro ili MasterCard koje podržavaju plaćanje preko interneta.
            </p>
            <p style="margin-top: 1rem;">
              • Plaćanje karticama je realizovano u saradnji sa platnim provajderima i obavlja se na bezbedan i sertifikovan način.
            </p>
            <p style="margin-top: 1rem;">
              • Nakon što se unesu podaci o kartici i potvrdi plaćanje, banka autorizuje transakciju i time je porudžbina odobrena.
            </p>

            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">6.2 Sigurnost plaćanja</h3>
            <p>
              • Prilikom unošenja podataka o platnoj kartici, povjerljive informacije se prenose putem javne mreže u zaštićenoj (kriptovanoj) formi upotrebom SSL protokola.
            </p>
            <p style="margin-top: 1rem;">
              • Brojevi platnih kartica kupaca se ne čuvaju na sistemu.
            </p>
            <p style="margin-top: 1rem;">
              • Svi trgovci koji koriste platne servise su automatski uključeni u 3D-Secure zaštitu, čime se kupcima garantuje bezbjednost kupovine.
            </p>

            <h3 style="color: #1f2937; font-size: 1.25rem; margin: 1.5rem 0 1rem 0;">6.3 Povraćaj sredstava</h3>
            <p>
              • U slučaju povraćaja sredstava kupcu koji je prethodno platio nekom od platnih kartica, djelimično ili u cjelosti, a bez obzira na razlog vraćanja, taj povraćaj se vrši isključivo preko iste platne kartice koja je korištena za plaćanje.
            </p>

            <h2 style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">7. ISPORUKA</h2>
            <p>
              • Kod plaćanja karticom, isporuka odnosno aktivacija objave predstavlja proces, na taj način da nakon uspješno izvršenog plaćanja korisnika, uplaćena objava bude objavljena nakon pregleda i provjere od strane rahmetli.me administracije i nakon toga postaje dostupna na portalu.
            </p>

            <h2 style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">8. REKLAMACIJA</h2>
            <p>
              • rahmetli.me se obavezuje isporučiti uslugu koja je tehnički ispravna te odgovara opisu navedenom na stranici.
            </p>
            <p style="margin-top: 1rem;">
              • U slučaju tehničke neispravnosti, kupac je dužan reklamirati uslugu u roku od 4 (četiri) radna dana.
            </p>
            <p style="margin-top: 1rem;">
              • Nakon što reklamira tehničku neispravnost, rahmetli.me će u roku od 3 (tri) radna dana poslati kupcu odgovor o nastalom tehničkom problemu i obezbijediti ispravku, bez ikakve naknade.
            </p>
            <p style="margin-top: 1rem;">
              • Prodavac nije odgovoran za eventualna oštećenja i ostale obaveze koje se nalaze u domenu internet provajdera ili ostalih trećih lica.
            </p>

            <h2 style="color: #006233; font-size: 1.5rem; margin: 2rem 0 1rem 0;">9. NADLEŽNOST SUDA</h2>
            <p>
              Za sve pravne sporove koji mogu nastati vezano za korištenje internetske stranice <strong>rahmetli.me</strong> nadležan je sud u Crnoj Gori.
            </p>

            <div style="background: #f0fff4; border-left: 4px solid #006233; padding: 1.5rem; border-radius: 8px; margin-top: 3rem;">
              <h4 style="color: #006233; margin-bottom: 0.75rem; font-size: 1.1rem;">Važna napomena</h4>
              <p style="color: #4b5563; margin: 0;">
                Korištenjem internetske stranice rahmetli.me smatra se da je korisnik ove Uslove korišćenja u cijelosti pročitao i prihvatio.
              </p>
            </div>

            <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin-top: 2rem; text-align: center;">
              <p style="color: #6b7280; margin-bottom: 1rem;">Ažurirano: Decembar 2025</p>
              <p style="color: #4b5563; margin: 0;">
                Za dodatna pitanja, kontaktirajte nas na: <a href="mailto:info@rahmetli.me" style="color: #006233; text-decoration: none; font-weight: 500;">info@rahmetli.me</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async showPricingPage() {
    const mainContent = document.getElementById("mainContent");

    mainContent.innerHTML = `
      <section class="section">
        <div class="container" style="max-width: 900px;">
          <div class="section-header" style="text-align: center; margin-bottom: 3rem;">
            <h1 class="section-title">Cijene usluga</h1>
            <p class="section-subtitle">Jednostavno i transparentno</p>
          </div>

          <div style="display: grid; gap: 2rem; margin-bottom: 2rem;">
            <!-- Objava Dženaze -->
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 2rem;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                  <h3 style="color: #006233; font-size: 1.5rem; margin-bottom: 0.5rem;">Objava Dženaze</h3>
                  <p style="color: #6b7280; font-size: 0.95rem;">Obavještenje o dženazi sa svim detaljima</p>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 2rem; font-weight: bold; color: #006233;">20€</div>
                </div>
              </div>
              <ul style="list-style: none; padding: 0; margin: 1.5rem 0 0 0;">
                <li style="padding: 0.5rem 0; color: #4b5563; display: flex; align-items: center;">
                  <span style="color: #006233; margin-right: 0.5rem;">✓</span>
                  Mogućnost komentarisanja (saučešća)
                </li>
                <li style="padding: 0.5rem 0; color: #4b5563; display: flex; align-items: center;">
                  <span style="color: #006233; margin-right: 0.5rem;">✓</span>
                  Lokacija mezaristana i vrijeme
                </li>
                <li style="padding: 0.5rem 0; color: #4b5563; display: flex; align-items: center;">
                  <span style="color: #006233; margin-right: 0.5rem;">✓</span>
                  Vidljivo svim posjetiteljima portala
                </li>
              </ul>
            </div>

            <!-- Izjava Hatara -->
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 2rem;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                  <h3 style="color: #006233; font-size: 1.5rem; margin-bottom: 0.5rem;">Izjava Hatara</h3>
                  <p style="color: #6b7280; font-size: 0.95rem;">Komentar/saučešće na objavu</p>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 2rem; font-weight: bold; color: #006233;">10€</div>
                </div>
              </div>
              <ul style="list-style: none; padding: 0; margin: 1.5rem 0 0 0;">
                <li style="padding: 0.5rem 0; color: #4b5563; display: flex; align-items: center;">
                  <span style="color: #006233; margin-right: 0.5rem;">✓</span>
                  Objava jednog hatara/komentara
                </li>
                <li style="padding: 0.5rem 0; color: #4b5563; display: flex; align-items: center;">
                  <span style="color: #006233; margin-right: 0.5rem;">✓</span>
                  Ime i prezime uz komentar
                </li>
                <li style="padding: 0.5rem 0; color: #4b5563; display: flex; align-items: center;">
                  <span style="color: #006233; margin-right: 0.5rem;">✓</span>
                  Vidljivo uz objavu
                </li>
              </ul>
            </div>

            <!-- Godišnja Pretplata -->
            <div style="background: linear-gradient(135deg, #006233 0%, #00a651 100%); border-radius: 12px; padding: 2rem; color: white; position: relative; overflow: hidden;">
              <div style="position: absolute; top: 1rem; right: 1rem; background: #ffd700; color: #006233; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem; font-weight: bold;">
                Najbolja ponuda
              </div>
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                  <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Godišnja Pretplata</h3>
                  <p style="opacity: 0.9; font-size: 0.95rem;">Neograničeno korištenje tokom godine</p>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 2rem; font-weight: bold;">20€</div>
                  <div style="font-size: 0.875rem; opacity: 0.9;">/godišnje</div>
                </div>
              </div>
              <ul style="list-style: none; padding: 0; margin: 1.5rem 0 0 0;">
                <li style="padding: 0.5rem 0; display: flex; align-items: center;">
                  <span style="margin-right: 0.5rem;">✓</span>
                  Neograničeno hatara/komentara
                </li>
                <li style="padding: 0.5rem 0; display: flex; align-items: center;">
                  <span style="margin-right: 0.5rem;">✓</span>
                  Email obavještenja o novim dženazama
                </li>
                <li style="padding: 0.5rem 0; display: flex; align-items: center;">
                  <span style="margin-right: 0.5rem;">✓</span>
                  Filtriranje obavještenja po mjestu
                </li>
                <li style="padding: 0.5rem 0; display: flex; align-items: center;">
                  <span style="margin-right: 0.5rem;">✓</span>
                  Podrška za korisnike
                </li>
                <li style="padding: 0.5rem 0; display: flex; align-items: center;">
                  <span style="margin-right: 0.5rem;">✓</span>
                  Bez skrivenih troškova
                </li>
              </ul>
            </div>
          </div>

          <div style="background: #f0fff4; border-left: 4px solid #006233; padding: 1.5rem; border-radius: 8px; margin-top: 2rem;">
            <h4 style="color: #006233; margin-bottom: 0.75rem; font-size: 1.1rem;">Način plaćanja</h4>
            <p style="color: #4b5563; margin: 0; line-height: 1.6;">
              Prihvatamo plaćanja putem PayPal-a i kreditnih kartica. Nakon uspješne uplate, vaša objava ili pretplata će biti odmah aktivirana.
            </p>
          </div>

          <div style="text-align: center; margin-top: 3rem;">
            <p style="color: #6b7280; font-size: 0.95rem; margin-bottom: 1rem;">
              Imate pitanja? Kontaktirajte nas
            </p>
            <a href="/kontakt" class="btn btn-outline" style="display: inline-block;">Kontakt</a>
          </div>
        </div>
      </section>
    `;
  }

  async showCemeteriesPage() {
    const mainContent = document.getElementById("mainContent");

    try {
      showLoading();
      const response = await api.getCemeteries();
      const cemeteries = response.cemeteries || [];

      // Group cemeteries by city
      const citiesMap = {};
      cemeteries.forEach((cemetery) => {
        const city = cemetery.city || "Ostalo";
        if (!citiesMap[city]) {
          citiesMap[city] = [];
        }
        citiesMap[city].push(cemetery);
      });

      mainContent.innerHTML = `
        <section class="section">
          <div class="container">
            <div class="section-header">
              <h1 class="section-title">Mezaristani</h1>
              <p class="section-subtitle">
                Direktorij mezaristana u Crnoj Gori
              </p>
            </div>

            <div class="cemeteries-grid">
              ${Object.keys(citiesMap)
                .sort()
                .map(
                  (city) => `
                <div class="city-group">
                  <h2 class="city-name">${city}</h2>
                  <div class="cemeteries-list">
                    ${citiesMap[city]
                      .map(
                        (cemetery) => `
                      <div class="cemetery-card">
                        <h3 class="cemetery-name">
                          <i class="fas fa-mosque"></i>
                          ${cemetery.name}
                        </h3>
                        ${
                          cemetery.address
                            ? `
                          <p class="cemetery-address">
                            <i class="fas fa-map-marker-alt"></i>
                            ${cemetery.address}
                          </p>
                        `
                            : ""
                        }
                        ${
                          cemetery.description
                            ? `
                          <p class="cemetery-description">${cemetery.description}</p>
                        `
                            : ""
                        }
                        ${
                          cemetery.latitude && cemetery.longitude
                            ? `
                          <a 
                            href="https://www.google.com/maps?q=${cemetery.latitude},${cemetery.longitude}" 
                            target="_blank"
                            class="cemetery-map-link"
                          >
                            <i class="fas fa-map"></i> Vidi na mapi
                          </a>
                        `
                            : ""
                        }
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                </div>
              `
                )
                .join("")}
            </div>

            ${
              cemeteries.length === 0
                ? `
              <div class="alert alert-info">
                Trenutno nema unesenih mezaristana.
              </div>
            `
                : ""
            }
          </div>
        </section>
      `;

      hideLoading();
    } catch (error) {
      hideLoading();
      console.error("Failed to load cemeteries:", error);
      mainContent.innerHTML = `
        <section class="section">
          <div class="container">
            <div class="alert alert-error">
              Greška pri učitavanju mezaristana. Pokušajte ponovo.
            </div>
          </div>
        </section>
      `;
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new App();
});
