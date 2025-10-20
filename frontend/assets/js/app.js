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
      mobileMenuBtn.addEventListener("click", () => {
        nav.classList.toggle("mobile-active");
        mobileMenuBtn.classList.toggle("active");
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
      } else if (path === "/saucesca") {
        this.showPostsPage("dova");
      } else if (path === "/pomeni") {
        this.showPostsPage("pomen");
      } else if (path.startsWith("/objava/")) {
        const postId = path.split("/")[2];
        this.showPostPage(postId);
      } else if (path === "/mezaristani") {
        this.showCemeteriesPage();
      } else if (path === "/profil") {
        this.showDashboardPage();
      } else if (path === "/admin") {
        this.showAdminPage();
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
                        Prvi bosanski portal za obavještenja o odlasku u ahiret i saučešća
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
                            Najnovija obavještenja o odlasku u ahiret, saučešća i pomeni
                        </p>
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
    const heroSearchBtn = document.getElementById("heroSearchBtn");
    const heroCreateBtn = document.getElementById("heroCreateBtn");

    if (heroSearchBtn) {
      heroSearchBtn.addEventListener("click", () => {
        show(document.getElementById("searchModal"));
      });
    }

    if (heroCreateBtn) {
      heroCreateBtn.addEventListener("click", () => {
        if (this.auth.isLoggedIn()) {
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

  async loadRecentPosts() {
    try {
      const response = await api.getPosts({ page: 1, limit: 6 });
      const postsContainer = document.getElementById("recentPosts");

      if (postsContainer) {
        postsContainer.innerHTML = PostCard.renderGrid(response.posts);
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
      dova: "Saučešća",
      pomen: "Pomeni",
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

      // Render post detail page
      mainContent.innerHTML = `
        <div class="post-detail">
          <div class="container">
            <div class="post-detail-header">
              <button class="btn btn-secondary" id="backBtn">
                <i class="fas fa-arrow-left"></i> Nazad
              </button>
            </div>
            
            <article class="post-detail-content">
              <div class="post-detail-main">
                <div class="post-header">
                  <h1 class="post-title">${this.escapeHtml(
                    post.deceased_name
                  )}</h1>
                  <div class="post-meta">
                    <span class="post-date">
                      <i class="fas fa-calendar"></i>
                      ${this.formatDate(post.deceased_death_date)}
                    </span>
                    ${
                      post.deceased_age
                        ? `<span class="post-age">
                      <i class="fas fa-user"></i>
                      ${post.deceased_age} godina
                    </span>`
                        : ""
                    }
                  </div>
                </div>

                ${
                  post.deceased_photo_url
                    ? `
                  <div class="post-image">
                    <img src="${
                      post.deceased_photo_url
                    }" alt="${this.escapeHtml(post.deceased_name)}" />
                  </div>
                `
                    : ""
                }

                <div class="post-content">
                  ${post.content || post.generated_html || ""}
                </div>

                <div class="post-details-grid">
                  ${
                    post.dzenaza_date
                      ? `
                    <div class="detail-item">
                      <h3><i class="fas fa-mosque"></i> Dženaza</h3>
                      <p><strong>Datum:</strong> ${this.formatDate(
                        post.dzenaza_date
                      )}</p>
                      ${
                        post.dzenaza_time
                          ? `<p><strong>Vreme:</strong> ${post.dzenaza_time}</p>`
                          : ""
                      }
                      ${
                        post.dzenaza_location
                          ? `<p><strong>Lokacija:</strong> ${this.escapeHtml(
                              post.dzenaza_location
                            )}</p>`
                          : ""
                      }
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    post.burial_cemetery || post.burial_location
                      ? `
                    <div class="detail-item">
                      <h3><i class="fas fa-map-marker-alt"></i> Sahrana</h3>
                      ${
                        post.burial_cemetery
                          ? `<p><strong>Mezaristan:</strong> ${this.escapeHtml(
                              post.burial_cemetery
                            )}</p>`
                          : ""
                      }
                      ${
                        post.burial_location
                          ? `<p><strong>Lokacija:</strong> ${this.escapeHtml(
                              post.burial_location
                            )}</p>`
                          : ""
                      }
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>
            </article>

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
      this.onAuthSuccess(authData);
    });
  }

  showRegisterModal() {
    AuthManager.showAuthModal("register", (authData) => {
      this.onAuthSuccess(authData);
    });
  }

  onAuthSuccess(authData) {
    this.currentUser = authData.user;
    this.updateAuthUI();
    showToast("Uspešno ste se prijavili!", "success");

    // Reload posts to show user-specific content
    this.loadPosts();
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
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new App();
});
