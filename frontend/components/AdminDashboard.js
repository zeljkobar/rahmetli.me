import { api } from "../utils/api.js";
import { PostCreateForm } from "./PostCreateForm.js";

class AdminDashboard {
  constructor(container) {
    this.container = container;
    this.currentUser = this.getCurrentUser();
    this.pendingComments = [];
    this.allUsers = []; // Store all users for filtering
    this.allPosts = []; // Store all posts for filtering
    this.api = api; // Use imported API instance
    this.init();
  }

  getCurrentUser() {
    const userData =
      localStorage.getItem("user_data") || sessionStorage.getItem("user_data");
    return userData ? JSON.parse(userData) : null;
  }

  async init() {
    if (
      !this.currentUser ||
      !["admin", "moderator"].includes(this.currentUser.role)
    ) {
      this.container.innerHTML =
        '<div class="alert alert-danger">Nemate dozvolu za pristup admin panelu</div>';
      return;
    }

    this.render();
    this.setupNavigation();
    this.setupUserFilters();
    await this.loadInitialData();
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const tab = e.target.closest("button").dataset.tab;
        this.switchTab(tab);
      });
    });
  }

  setupUserFilters() {
    // Role filter
    const roleFilter = document.getElementById("user-role-filter");
    if (roleFilter) {
      roleFilter.addEventListener("change", () => {
        this.filterUsers();
      });
    }

    // Search filter
    const searchInput = document.getElementById("user-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        this.filterUsers();
      });
    }

    // Subscription filters
    const statusFilter = document.getElementById("subscription-status-filter");
    if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        this.filterSubscriptions();
      });
    }

    const paymentFilter = document.getElementById(
      "subscription-payment-filter",
    );
    if (paymentFilter) {
      paymentFilter.addEventListener("change", () => {
        this.filterSubscriptions();
      });
    }

    const subscriptionSearch = document.getElementById("subscription-search");
    if (subscriptionSearch) {
      subscriptionSearch.addEventListener("input", () => {
        this.filterSubscriptions();
      });
    }
  }

  filterUsers() {
    if (!this.allUsers.length) return;

    const roleFilter = document.getElementById("user-role-filter")?.value || "";
    const searchTerm =
      document.getElementById("user-search")?.value.toLowerCase() || "";

    let filteredUsers = this.allUsers;

    // Filter by role
    if (roleFilter) {
      filteredUsers = filteredUsers.filter((user) => user.role === roleFilter);
    }

    // Filter by search term (username, email, full_name)
    if (searchTerm) {
      filteredUsers = filteredUsers.filter(
        (user) =>
          (user.username || "").toLowerCase().includes(searchTerm) ||
          (user.email || "").toLowerCase().includes(searchTerm) ||
          (user.full_name || "").toLowerCase().includes(searchTerm),
      );
    }

    console.log("🔍 Filtering users:", {
      roleFilter,
      searchTerm,
      total: this.allUsers.length,
      filtered: filteredUsers.length,
    });
    this.renderUsers(filteredUsers);
  }

  switchTab(tab) {
    console.log("🔄 Switching to tab:", tab);

    // Update nav buttons
    document
      .querySelectorAll(".nav-btn")
      .forEach((btn) => btn.classList.remove("active"));
    document.querySelector(`[data-tab="${tab}"]`).classList.add("active");

    // Update tab content
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => (content.style.display = "none"));

    const activeTabContent = document.getElementById(`${tab}-tab`);
    console.log("📍 Active tab content:", activeTabContent);
    activeTabContent.style.display = "block";

    // Load tab data
    switch (tab) {
      case "comments":
        this.loadPendingComments();
        break;
      case "posts":
        this.loadPendingPosts();
        this.loadAllPosts();
        this.setupPostFilters();
        break;
      case "users":
        this.loadUsers();
        break;
      case "stats":
        this.loadDetailedStats();
        break;
      case "subscriptions":
        this.loadSubscriptions();
        break;
      case "cemeteries":
        this.loadCemeteries();
        break;
    }
  }

  async loadInitialData() {
    await Promise.all([
      this.loadPendingComments(),
      this.loadStats(),
      this.loadNewCemeteriesCount(),
    ]);
  }

  render() {
    const isAdmin = this.currentUser.role === "admin";

    this.container.innerHTML = `
      <div class="admin-dashboard">
        <div class="admin-header">
          <h2><i class="fas fa-shield-alt"></i> ${isAdmin ? "Admin" : "Moderator"} Panel</h2>
          <p>Dobrodošli, ${
            this.currentUser.full_name || this.currentUser.username
          }</p>
        </div>

        <div class="admin-navigation">
          <button class="nav-btn active" data-tab="comments">
            <i class="fas fa-comments"></i> Komentari
          </button>
          <button class="nav-btn" data-tab="posts">
            <i class="fas fa-newspaper"></i> Objave
          </button>
          ${
            isAdmin
              ? `
          <button class="nav-btn" data-tab="users">
            <i class="fas fa-users"></i> Korisnici
          </button>
          <button class="nav-btn" data-tab="subscriptions">
            <i class="fas fa-credit-card"></i> Pretplate
          </button>
          `
              : ""
          }
          <button class="nav-btn" data-tab="cemeteries">
            <i class="fas fa-mosque"></i> Mezaristani
            <span class="badge" id="new-cemeteries-badge" style="display: none;">0</span>
          </button>
          <button class="nav-btn" data-tab="stats">
            <i class="fas fa-chart-bar"></i> Statistike
          </button>
        </div>

        <div class="admin-stats">
          <div class="stat-card">
            <div class="stat-number" id="pending-comments-count">0</div>
            <div class="stat-label">Komentari na čekanju</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="pending-posts-count">0</div>
            <div class="stat-label">Objave na čekanju</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="new-cemeteries-count">0</div>
            <div class="stat-label">Nova groblja za pregled</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="total-users-count">0</div>
            <div class="stat-label">Ukupno korisnika</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="total-donations-count">0</div>
            <div class="stat-label">Ukupne donacije</div>
          </div>
        </div>

        <!-- Comments Tab -->
        <div class="admin-section tab-content" id="comments-tab">
          <h3><i class="fas fa-comments"></i> Komentari na čekanju</h3>
          <div id="pending-comments-list" class="comments-list">
            <div class="loading">Učitavanje...</div>
          </div>
        </div>

        <!-- Posts Tab -->
        <div class="admin-section tab-content" id="posts-tab" style="display: none;">
          <h3><i class="fas fa-newspaper"></i> Objave na čekanju</h3>
          <div id="pending-posts-list" class="posts-list">
            <div class="loading">Učitavanje...</div>
          </div>

          <h3 style="margin-top: 40px;"><i class="fas fa-list"></i> Sve objave</h3>
          <div class="all-posts-filters">
            <input type="text" id="post-search" placeholder="Pretraži po imenu pokojnika..." />
            <select id="post-status-filter">
              <option value="">Svi statusi</option>
              <option value="pending">Na čekanju</option>
              <option value="approved">Odobrene</option>
              <option value="rejected">Odbijene</option>
              <option value="draft">Nacrt</option>
            </select>
            <select id="post-city-filter">
              <option value="">Svi gradovi</option>
            </select>
            <select id="post-premium-filter">
              <option value="">Premium status</option>
              <option value="1">Premium</option>
              <option value="0">Obična</option>
            </select>
          </div>
          <div id="all-posts-table" class="table-container">
            <div class="loading">Učitavanje...</div>
          </div>
        </div>

        ${
          isAdmin
            ? `
        <!-- Users Tab -->
        <div class="admin-section tab-content" id="users-tab" style="display: none;">
          <h3><i class="fas fa-users"></i> Registrovani korisnici</h3>
          <div class="users-filters">
            <select id="user-role-filter">
              <option value="">Sve uloge</option>
              <option value="user">Korisnici</option>
              <option value="moderator">Moderatori</option>
              <option value="admin">Administratori</option>
            </select>
            <input type="text" id="user-search" placeholder="Pretraži po imenu ili email-u...">
          </div>
          <div id="users-list" class="users-list">
            <div class="loading">Učitavanje...</div>
          </div>
        </div>
        `
            : ""
        }

        <!-- Stats Tab -->
        <div class="admin-section tab-content" id="stats-tab" style="display: none;">
          <h3><i class="fas fa-chart-bar"></i> Detaljne statistike</h3>
          <div id="detailed-stats" class="stats-grid">
            <div class="loading">Učitavanje...</div>
          </div>
        </div>

        ${
          isAdmin
            ? `
        <!-- Subscriptions Tab -->
        <div class="admin-section tab-content" id="subscriptions-tab" style="display: none;">
          <h3><i class="fas fa-credit-card"></i> Upravljanje pretplatama</h3>
          <div class="subscriptions-filters">
            <select id="subscription-status-filter">
              <option value="">Svi statusi</option>
              <option value="pending">Na čekanju</option>
              <option value="active">Aktivne</option>
              <option value="expired">Istekle</option>
              <option value="cancelled">Otkazane</option>
            </select>
            <select id="subscription-payment-filter">
              <option value="">Sve metode plaćanja</option>
              <option value="bank_transfer">Bankovna transakcija</option>
              <option value="card">Kartica</option>
            </select>
            <input type="text" id="subscription-search" placeholder="Pretraži po korisniku...">
          </div>
          <div id="subscriptions-list" class="subscriptions-list">
            <div class="loading">Učitavanje...</div>
          </div>
        </div>
        `
            : ""
        }

        <!-- Cemeteries Tab -->
        <div class="admin-section tab-content" id="cemeteries-tab" style="display: none;">
          <div class="section-header-with-action">
            <h3><i class="fas fa-mosque"></i> Upravljanje mezaristanima</h3>
            <button class="btn btn-primary" id="add-cemetery-btn">
              <i class="fas fa-plus"></i> Dodaj mezaristan
            </button>
          </div>
          <div id="cemeteries-list" class="cemeteries-list">
            <div class="loading">Učitavanje...</div>
          </div>
        </div>
      </div>
    `;
  }

  async loadPendingComments() {
    try {
      console.log("🔄 Loading pending comments...");
      const response = await this.api.request("/admin/comments/pending");
      console.log("📥 Pending comments response:", response);
      this.pendingComments = response;
      this.renderPendingComments();
      this.updateStats();
    } catch (error) {
      console.error("❌ Error loading pending comments:", error);
      document.getElementById("pending-comments-list").innerHTML =
        '<div class="alert alert-danger">Greška pri učitavanju komentara na čekanju</div>';
    }
  }

  renderPendingComments() {
    console.log("🎨 Rendering pending comments:", this.pendingComments);
    const container = document.getElementById("pending-comments-list");
    console.log("📍 Comments container:", container);

    if (this.pendingComments.length === 0) {
      console.log("💡 No pending comments, showing empty message");
      container.innerHTML =
        '<div class="alert alert-info">Nema komentara na čekanju</div>';
      return;
    }

    container.innerHTML = this.pendingComments
      .map(
        (comment) => `
      <div class="comment-card" data-comment-id="${comment.id}">
        <div class="comment-header">
          <div class="comment-author">
            <strong>${comment.author_name || "Anonimni korisnik"}</strong>
            <span class="comment-email">(${
              comment.author_email || "Nema email-a"
            })</span>
          </div>
          <div class="comment-date">
            ${new Date(comment.created_at).toLocaleString("sr-RS")}
          </div>
        </div>
        
        <div class="comment-post">
          <small class="text-muted">Komentar na: "${
            comment.post_title || "Nepoznata objava"
          }"</small>
        </div>
        
        <div class="comment-content">
          ${comment.content}
        </div>
        
        <div class="comment-actions">
          <button class="btn btn-success btn-sm" data-comment-id="${
            comment.id
          }" data-action="approve">
            <i class="fas fa-check"></i> Odobri
          </button>
          <button class="btn btn-danger btn-sm" data-comment-id="${
            comment.id
          }" data-action="reject">
            <i class="fas fa-times"></i> Odbaci
          </button>
        </div>
      </div>
    `,
      )
      .join("");

    // Add event listeners to buttons
    this.attachEventListeners();
  }

  attachEventListeners() {
    const buttons = document.querySelectorAll("[data-comment-id]");
    buttons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const commentId = parseInt(
          e.target.closest("button").dataset.commentId,
        );
        const action = e.target.closest("button").dataset.action;

        if (action === "approve") {
          this.approveComment(commentId);
        } else if (action === "reject") {
          this.rejectComment(commentId);
        }
      });
    });
  }

  async approveComment(commentId) {
    await this.updateCommentStatus(commentId, "approved");
  }

  async rejectComment(commentId) {
    await this.updateCommentStatus(commentId, "rejected");
  }

  async updateCommentStatus(commentId, status) {
    try {
      await this.api.request(`/admin/comments/${commentId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      // Ukloni komentar iz liste
      this.pendingComments = this.pendingComments.filter(
        (c) => c.id !== commentId,
      );
      this.renderPendingComments();
      this.updateStats();

      // Prikaži notifikaciju
      this.showNotification(
        status === "approved" ? "Komentar je odobren" : "Komentar je odbačen",
        "success",
      );
    } catch (error) {
      console.error("Error updating comment:", error);
      this.showNotification("Greška pri ažuriranju komentara", "error");
    }
  }

  updateStats() {
    document.getElementById("pending-comments-count").textContent =
      this.pendingComments.length;
  }

  async loadStats() {
    try {
      const stats = await this.api.request("/admin/stats");
      document.getElementById("pending-comments-count").textContent =
        stats.pendingComments || 0;
      document.getElementById("pending-posts-count").textContent =
        stats.pendingPosts || 0;
      document.getElementById("total-users-count").textContent =
        stats.totalUsers || 0;
      document.getElementById("total-donations-count").textContent = "0"; // TODO: implement donations
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  async loadPendingPosts() {
    try {
      console.log("🔄 Loading pending posts...");
      const posts = await this.api.request("/admin/posts/pending");
      console.log("📥 Pending posts response:", posts);
      this.renderPendingPosts(posts);
    } catch (error) {
      console.error("❌ Error loading pending posts:", error);
      document.getElementById("pending-posts-list").innerHTML =
        '<div class="alert alert-danger">Greška pri učitavanju objava na čekanju</div>';
    }
  }

  renderPendingPosts(posts) {
    const container = document.getElementById("pending-posts-list");

    if (posts.length === 0) {
      container.innerHTML =
        '<div class="alert alert-info">Nema objava na čekanju</div>';
      return;
    }

    container.innerHTML = posts
      .map(
        (post) => `
      <div class="post-card" data-post-id="${post.id}">
        <div class="post-header">
          <h4>${post.deceased_name}</h4>
          <span class="post-date">${new Date(post.created_at).toLocaleString(
            "sr-RS",
          )}</span>
        </div>
        <div class="post-details">
          <p><strong>Korisnik:</strong> ${post.username}</p>
          <p><strong>Dženaza:</strong> ${new Date(
            post.dzenaza_date,
          ).toLocaleDateString("sr-RS")} u ${post.dzenaza_time}</p>
          <p><strong>Lokacija:</strong> ${post.dzenaza_location}</p>
          <p><strong>Mezaristan:</strong> ${post.burial_cemetery}</p>
        </div>
        <div class="post-actions">
          <button class="btn btn-success btn-sm" data-post-id="${
            post.id
          }" data-action="approve">
            <i class="fas fa-check"></i> Odobri objavu
          </button>
          <button class="btn btn-danger btn-sm" data-post-id="${
            post.id
          }" data-action="reject">
            <i class="fas fa-times"></i> Odbaci objavu
          </button>
          <button class="btn btn-info btn-sm post-preview-btn" data-id="${
            post.id
          }">
            <i class="fas fa-eye"></i> Pregledaj
          </button>
          <button class="btn ${post.is_featured ? "btn-warning" : "btn-outline"} btn-sm" data-post-id="${
            post.id
          }" data-action="toggle-featured" data-featured="${post.is_featured}">
            <i class="fas fa-star"></i> ${post.is_featured ? "Ukloni istaknutu" : "Istakni"}
          </button>
        </div>
      </div>
    `,
      )
      .join("");

    // Add event listeners for post actions
    container
      .querySelectorAll("[data-post-id][data-action]")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          const postId = parseInt(e.target.closest("button").dataset.postId);
          const action = e.target.closest("button").dataset.action;

          if (action === "toggle-featured") {
            const currentFeatured =
              e.target.closest("button").dataset.featured === "1";
            this.toggleFeaturedPost(postId, !currentFeatured);
          } else {
            this.updatePostStatus(
              postId,
              action === "approve" ? "approved" : "rejected",
            );
          }
        });
      });

    // Add event listeners for preview buttons
    container.querySelectorAll(".post-preview-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const postId = e.currentTarget.dataset.id;
        window.open(`/objava/${postId}`, "_blank");
      });
    });
  }

  async updatePostStatus(postId, status) {
    try {
      await this.api.request(`/admin/posts/${postId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      this.showNotification(
        `Objava je ${status === "approved" ? "odobrena" : "odbačena"}`,
        "success",
      );
      this.loadPendingPosts(); // Reload posts
      this.loadAllPosts(); // Reload all posts table
      this.loadStats(); // Update stats
    } catch (error) {
      console.error("Error updating post:", error);
      this.showNotification("Greška pri ažuriranju objave", "error");
    }
  }

  async toggleFeaturedPost(postId, isFeatured) {
    try {
      await this.api.request(`/admin/posts/${postId}/featured`, {
        method: "PUT",
        body: JSON.stringify({ is_featured: isFeatured }),
      });

      this.showNotification(
        isFeatured ? "Objava je istaknuta" : "Objava više nije istaknuta",
        "success",
      );
      this.loadPendingPosts(); // Reload posts
      this.loadAllPosts(); // Reload all posts table
    } catch (error) {
      console.error("Error toggling featured:", error);
      this.showNotification(
        "Greška pri promeni statusa istaknute objave",
        "error",
      );
    }
  }

  async loadAllPosts() {
    try {
      const posts = await this.api.request("/admin/posts/all");
      this.allPosts = posts;
      this.populateCityFilter(posts);
      this.filterPosts();
    } catch (error) {
      console.error("Error loading all posts:", error);
      document.getElementById("all-posts-table").innerHTML =
        '<div class="alert alert-danger">Greška pri učitavanju objava</div>';
    }
  }

  renderAllPostsTable(posts) {
    const container = document.getElementById("all-posts-table");

    if (posts.length === 0) {
      container.innerHTML = '<div class="alert alert-info">Nema objava</div>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Ime i prezime</th>
            <th>Grad</th>
            <th>Datum objave</th>
            <th>Status</th>
            <th>Premium</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          ${posts.map(post => `
            <tr>
              <td>${post.id}</td>
              <td>${post.deceased_name}</td>
              <td>${post.city}</td>
              <td>${new Date(post.created_at).toLocaleDateString("sr-RS")}</td>
              <td>
                <span class="status-badge status-${post.status}">
                  ${this.getStatusLabel(post.status)}
                </span>
              </td>
              <td>
                <button class="btn btn-sm ${post.is_premium ? 'btn-warning' : 'btn-outline'}" 
                        data-post-id="${post.id}" 
                        data-action="toggle-premium"
                        data-premium="${post.is_premium}">
                  <i class="fas fa-crown"></i> ${post.is_premium ? 'Premium' : 'Obična'}
                </button>
              </td>
              <td class="action-buttons">
                <button class="btn btn-sm btn-info" 
                        data-post-id="${post.id}" 
                        data-action="edit">
                  <i class="fas fa-edit"></i> Edituj
                </button>
                <button class="btn btn-sm btn-danger" 
                        data-post-id="${post.id}" 
                        data-action="delete">
                  <i class="fas fa-trash"></i> Obriši
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Add event listeners
    container.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', (e) => {
        const postId = parseInt(e.target.closest('button').dataset.postId);
        const action = e.target.closest('button').dataset.action;

        if (action === 'toggle-premium') {
          const currentPremium = e.target.closest('button').dataset.premium === '1';
          this.togglePremiumPost(postId, !currentPremium);
        } else if (action === 'edit') {
          this.editPost(postId);
        } else if (action === 'delete') {
          this.deletePost(postId);
        }
      });
    });
  }

  getStatusLabel(status) {
    const labels = {
      'pending': 'Na čekanju',
      'approved': 'Odobrena',
      'rejected': 'Odbijena',
      'draft': 'Nacrt'
    };
    return labels[status] || status;
  }

  async togglePremiumPost(postId, isPremium) {
    try {
      await this.api.request(`/admin/posts/${postId}/premium`, {
        method: "PUT",
        body: JSON.stringify({ is_premium: isPremium }),
      });

      this.showNotification(
        `Objava je ${isPremium ? "postavljena kao premium" : "uklonjena iz premium"}`,
        "success",
      );
      this.loadAllPosts(); // Reload table
    } catch (error) {
      console.error("Error toggling premium:", error);
      this.showNotification("Greška pri promjeni premium statusa", "error");
    }
  }

  setupPostFilters() {
    const searchInput = document.getElementById("post-search");
    const statusFilter = document.getElementById("post-status-filter");
    const cityFilter = document.getElementById("post-city-filter");
    const premiumFilter = document.getElementById("post-premium-filter");

    if (searchInput) {
      searchInput.addEventListener("input", () => this.filterPosts());
    }
    if (statusFilter) {
      statusFilter.addEventListener("change", () => this.filterPosts());
    }
    if (cityFilter) {
      cityFilter.addEventListener("change", () => this.filterPosts());
    }
    if (premiumFilter) {
      premiumFilter.addEventListener("change", () => this.filterPosts());
    }
  }

  populateCityFilter(posts) {
    const cityFilter = document.getElementById("post-city-filter");
    if (!cityFilter) return;

    const cities = [...new Set(posts.map(p => p.city).filter(Boolean))];
    cities.sort();

    cityFilter.innerHTML = '<option value="">Svi gradovi</option>' +
      cities.map(city => `<option value="${city}">${city}</option>`).join('');
  }

  filterPosts() {
    const searchTerm = document.getElementById("post-search")?.value.toLowerCase() || "";
    const statusFilter = document.getElementById("post-status-filter")?.value || "";
    const cityFilter = document.getElementById("post-city-filter")?.value || "";
    const premiumFilter = document.getElementById("post-premium-filter")?.value || "";

    const filtered = this.allPosts.filter(post => {
      const matchesSearch = post.deceased_name.toLowerCase().includes(searchTerm);
      const matchesStatus = !statusFilter || post.status === statusFilter;
      const matchesCity = !cityFilter || post.city === cityFilter;
      const matchesPremium = !premiumFilter || post.is_premium.toString() === premiumFilter;

      return matchesSearch && matchesStatus && matchesCity && matchesPremium;
    });

    this.renderAllPostsTable(filtered);
  }

  async editPost(postId) {
    try {
      // Get post details
      const post = await this.api.request(`/posts/${postId}`);
      
      // Create and show edit form modal using imported PostCreateForm
      const postCreateForm = new PostCreateForm(
        () => {
          this.loadAllPosts();
          this.loadPendingPosts();
          this.showNotification("Objava uspješno ažurirana", "success");
        },
        () => {
          this.showNotification("Editovanje otkazano", "info");
        },
        post
      );
      
      document.body.appendChild(postCreateForm.render());
    } catch (error) {
      console.error("Error loading post for edit:", error);
      this.showNotification("Greška pri učitavanju objave", "error");
    }
  }

  async deletePost(postId) {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu objavu? Ova akcija se ne može poništiti.')) {
      return;
    }

    try {
      await this.api.request(`/posts/${postId}`, {
        method: "DELETE",
      });

      this.showNotification("Objava je uspješno obrisana", "success");
      this.loadAllPosts(); // Reload table
      this.loadPendingPosts(); // Reload pending if needed
    } catch (error) {
      console.error("Error deleting post:", error);
      this.showNotification("Greška pri brisanju objave", "error");
    }
  }

  async loadUsers() {
    try {
      console.log("🔄 Loading users...");
      const users = await this.api.request("/admin/users");
      console.log("📥 Users response:", users);
      this.allUsers = users; // Store all users
      this.filterUsers(); // Apply current filters
    } catch (error) {
      console.error("❌ Error loading users:", error);
      document.getElementById("users-list").innerHTML =
        '<div class="alert alert-danger">Greška pri učitavanju korisnika</div>';
    }
  }

  renderUsers(users) {
    console.log("🎨 Rendering users:", users);
    const container = document.getElementById("users-list");
    console.log("📍 Users container:", container);

    container.innerHTML = `
      <div class="users-table">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Korisničko ime</th>
              <th>Email</th>
              <th>Puno ime</th>
              <th>Uloga</th>
              <th>Datum registracije</th>
              <th>Broj objava</th>
              <th>Status</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                (user) => `
              <tr class="${!user.is_active ? "inactive-user" : ""}">
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.full_name || "-"}</td>
                <td><span class="role-badge role-${user.role}">${
                  user.role
                }</span></td>
                <td>${new Date(user.created_at).toLocaleDateString(
                  "sr-RS",
                )}</td>
                <td>${user.posts_count || 0}</td>
                <td>
                  <span class="status-badge ${
                    user.is_active ? "active" : "inactive"
                  }">
                    ${user.is_active ? "Aktivan" : "Neaktivan"}
                  </span>
                </td>
                <td>
                  <div class="user-actions-group">
                    <select class="user-role-select" data-id="${user.id}" data-current-role="${user.role}">
                      <option value="user" ${user.role === "user" ? "selected" : ""}>Korisnik</option>
                      <option value="moderator" ${user.role === "moderator" ? "selected" : ""}>Moderator</option>
                      <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
                    </select>
                    <button class="btn btn-sm ${
                      user.is_active ? "btn-warning" : "btn-success"
                    } user-toggle-btn" 
                            data-id="${user.id}" data-active="${user.is_active}">
                      <i class="fas fa-${user.is_active ? "ban" : "check"}"></i>
                      ${user.is_active ? "Deaktiviraj" : "Aktiviraj"}
                    </button>
                  </div>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    // Add event listeners for user toggle buttons
    container.querySelectorAll(".user-toggle-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const userId = parseInt(e.currentTarget.dataset.id);
        const isActive = e.currentTarget.dataset.active === "true";
        this.toggleUserStatus(userId, !isActive);
      });
    });

    // Add event listeners for role select dropdowns
    container.querySelectorAll(".user-role-select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const userId = parseInt(e.currentTarget.dataset.id);
        const currentRole = e.currentTarget.dataset.currentRole;
        const newRole = e.currentTarget.value;

        if (newRole !== currentRole) {
          this.changeUserRole(userId, newRole, currentRole, e.currentTarget);
        }
      });
    });
  }

  async toggleUserStatus(userId, activate) {
    try {
      await this.api.request(`/admin/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ is_active: activate }),
      });

      this.showNotification(
        `Korisnik je ${activate ? "aktiviran" : "deaktiviran"}`,
        "success",
      );
      this.loadUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      this.showNotification("Greška pri ažuriranju korisnika", "error");
    }
  }

  async changeUserRole(userId, newRole, currentRole, selectElement) {
    const roleLabels = {
      user: "Korisnik",
      moderator: "Moderator",
      admin: "Administrator",
    };

    if (
      !confirm(
        `Da li ste sigurni da želite promeniti ulogu u ${roleLabels[newRole]}?`,
      )
    ) {
      // Reset select to current role if user cancels
      selectElement.value = currentRole;
      return;
    }

    try {
      await this.api.request(`/admin/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });

      this.showNotification(
        `Uloga korisnika je promenjena u ${roleLabels[newRole]}`,
        "success",
      );
      this.loadUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
      this.showNotification(
        error.error || "Greška pri promeni uloge korisnika",
        "error",
      );
      // Reset select to current role on error
      selectElement.value = currentRole;
    }
  }

  async loadDetailedStats() {
    try {
      console.log("🔄 Loading detailed stats...");
      const stats = await this.api.request("/admin/stats/detailed");
      console.log("📥 Detailed stats response:", stats);
      this.renderDetailedStats(stats);
    } catch (error) {
      console.error("❌ Error loading detailed stats:", error);
      document.getElementById("detailed-stats").innerHTML =
        '<div class="alert alert-danger">Greška pri učitavanju statistika</div>';
    }
  }

  renderDetailedStats(stats) {
    const container = document.getElementById("detailed-stats");

    container.innerHTML = `
      <div class="stats-cards">
        <div class="stat-card-large">
          <h4><i class="fas fa-users"></i> Korisnici</h4>
          <div class="stat-details">
            <div class="stat-item">
              <span class="stat-value">${stats.users?.total || 0}</span>
              <span class="stat-desc">Ukupno registrovanih</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${stats.users?.active || 0}</span>
              <span class="stat-desc">Aktivni korisnici</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${stats.users?.thisMonth || 0}</span>
              <span class="stat-desc">Novi ovaj mjesec</span>
            </div>
          </div>
        </div>

        <div class="stat-card-large">
          <h4><i class="fas fa-newspaper"></i> Objave</h4>
          <div class="stat-details">
            <div class="stat-item">
              <span class="stat-value">${stats.posts?.total || 0}</span>
              <span class="stat-desc">Ukupno objava</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${stats.posts?.approved || 0}</span>
              <span class="stat-desc">Odobrene objave</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${stats.posts?.pending || 0}</span>
              <span class="stat-desc">Na čekanju</span>
            </div>
          </div>
        </div>

        <div class="stat-card-large">
          <h4><i class="fas fa-comments"></i> Komentari</h4>
          <div class="stat-details">
            <div class="stat-item">
              <span class="stat-value">${stats.comments?.total || 0}</span>
              <span class="stat-desc">Ukupno komentara</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${stats.comments?.approved || 0}</span>
              <span class="stat-desc">Odobreni komentari</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${stats.comments?.pending || 0}</span>
              <span class="stat-desc">Na čekanju</span>
            </div>
          </div>
        </div>

        <div class="stat-card-large">
          <h4><i class="fas fa-heart"></i> Donacije</h4>
          <div class="stat-details">
            <div class="stat-item">
              <span class="stat-value">0 KM</span>
              <span class="stat-desc">Ukupno donacija</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">0</span>
              <span class="stat-desc">Broj donatora</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">Uskoro</span>
              <span class="stat-desc">Funkcionalnost</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadSubscriptions() {
    try {
      console.log("🔄 Loading subscriptions...");
      const response = await this.api.request("/admin/subscriptions");
      console.log("📥 Subscriptions response:", response);
      this.allSubscriptions = response;
      this.filterSubscriptions();
    } catch (error) {
      console.error("❌ Error loading subscriptions:", error);
      document.getElementById("subscriptions-list").innerHTML =
        '<div class="alert alert-danger">Greška pri učitavanju pretplata</div>';
    }
  }

  filterSubscriptions() {
    if (!this.allSubscriptions || !this.allSubscriptions.length) {
      this.renderSubscriptions([]);
      return;
    }

    const statusFilter =
      document.getElementById("subscription-status-filter")?.value || "";
    const paymentFilter =
      document.getElementById("subscription-payment-filter")?.value || "";
    const searchTerm =
      document.getElementById("subscription-search")?.value.toLowerCase() || "";

    let filtered = this.allSubscriptions;

    if (statusFilter) {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }

    if (paymentFilter) {
      filtered = filtered.filter((sub) => sub.payment_method === paymentFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (sub) =>
          (sub.username || "").toLowerCase().includes(searchTerm) ||
          (sub.email || "").toLowerCase().includes(searchTerm) ||
          (sub.full_name || "").toLowerCase().includes(searchTerm),
      );
    }

    console.log("🔍 Filtering subscriptions:", {
      statusFilter,
      paymentFilter,
      searchTerm,
      total: this.allSubscriptions.length,
      filtered: filtered.length,
    });

    this.renderSubscriptions(filtered);
  }

  renderSubscriptions(subscriptions) {
    const container = document.getElementById("subscriptions-list");

    if (!subscriptions || subscriptions.length === 0) {
      container.innerHTML =
        '<div class="alert alert-info">Nema pretplata</div>';
      return;
    }

    container.innerHTML = subscriptions
      .map(
        (sub) => `
      <div class="subscription-card" data-subscription-id="${sub.id}">
        <div class="subscription-header">
          <div class="subscription-user">
            <strong>${sub.full_name || sub.username}</strong>
            <span class="subscription-email">(${sub.email})</span>
          </div>
          <div class="subscription-status status-${sub.status}">
            ${this.getStatusLabel(sub.status)}
          </div>
        </div>
        
        <div class="subscription-details">
          <div class="subscription-info">
            <span><i class="fas fa-calendar-alt"></i> Kreirana: ${new Date(
              sub.created_at,
            ).toLocaleDateString("sr-RS")}</span>
            ${
              sub.start_date
                ? `<span><i class="fas fa-play"></i> Početak: ${new Date(
                    sub.start_date,
                  ).toLocaleDateString("sr-RS")}</span>`
                : ""
            }
            ${
              sub.end_date
                ? `<span><i class="fas fa-stop"></i> Kraj: ${new Date(
                    sub.end_date,
                  ).toLocaleDateString("sr-RS")}</span>`
                : ""
            }
          </div>
          <div class="subscription-info">
            <span><i class="fas fa-credit-card"></i> Metoda: ${this.getPaymentMethodLabel(
              sub.payment_method,
            )}</span>
            ${
              sub.payment_reference
                ? `<span><i class="fas fa-hashtag"></i> Referenca: ${sub.payment_reference}</span>`
                : ""
            }
            <span><i class="fas fa-euro-sign"></i> Cijena: ${
              sub.price
            } EUR</span>
          </div>
          ${
            sub.notification_cities
              ? `
            <div class="subscription-cities">
              <i class="fas fa-map-marker-alt"></i> Gradovi: ${JSON.parse(
                sub.notification_cities,
              ).join(", ")}
            </div>
          `
              : ""
          }
          ${
            sub.admin_notes
              ? `
            <div class="subscription-notes">
              <i class="fas fa-sticky-note"></i> Napomena: ${sub.admin_notes}
            </div>
          `
              : ""
          }
        </div>

        <div class="subscription-actions">
          ${
            sub.status === "pending"
              ? `
            <button class="btn btn-success btn-sm" data-action="activate" data-subscription-id="${sub.id}">
              <i class="fas fa-check"></i> Aktiviraj
            </button>
          `
              : ""
          }
          ${
            sub.status === "active"
              ? `
            <button class="btn btn-danger btn-sm" data-action="cancel" data-subscription-id="${sub.id}">
              <i class="fas fa-times"></i> Otkaži
            </button>
          `
              : ""
          }
        </div>
      </div>
    `,
      )
      .join("");

    // Attach event listeners
    this.attachSubscriptionEventListeners();
  }

  getStatusLabel(status) {
    const labels = {
      pending: "Na čekanju",
      active: "Aktivna",
      expired: "Istekla",
      cancelled: "Otkazana",
    };
    return labels[status] || status;
  }

  getPaymentMethodLabel(method) {
    const labels = {
      bank_transfer: "Bankovna transakcija",
      card: "Kartica",
    };
    return labels[method] || method;
  }

  attachSubscriptionEventListeners() {
    const buttons = document.querySelectorAll(".subscription-card button");
    buttons.forEach((button) => {
      button.addEventListener("click", async (e) => {
        const subscriptionId = parseInt(
          e.target.closest("button").dataset.subscriptionId,
        );
        const action = e.target.closest("button").dataset.action;

        if (action === "activate") {
          await this.activateSubscription(subscriptionId);
        } else if (action === "cancel") {
          await this.cancelSubscription(subscriptionId);
        }
      });
    });
  }

  async activateSubscription(subscriptionId) {
    const notes = prompt("Unesite napomenu (opciono):");

    try {
      await this.api.request(
        `/admin/subscriptions/${subscriptionId}/activate`,
        {
          method: "POST",
          body: JSON.stringify({ admin_notes: notes }),
        },
      );

      this.showNotification("Pretplata je aktivirana", "success");
      await this.loadSubscriptions();
    } catch (error) {
      console.error("Error activating subscription:", error);
      this.showNotification("Greška pri aktivaciji pretplate", "error");
    }
  }

  async cancelSubscription(subscriptionId) {
    if (!confirm("Da li ste sigurni da želite otkazati ovu pretplatu?")) {
      return;
    }

    const reason = prompt("Unesite razlog (opciono):");

    try {
      await this.api.request(`/admin/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });

      this.showNotification("Pretplata je otkazana", "success");
      await this.loadSubscriptions();
    } catch (error) {
      console.error("Error canceling subscription:", error);
      this.showNotification("Greška pri otkazivanju pretplate", "error");
    }
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Cemeteries Management
  async loadNewCemeteriesCount() {
    try {
      const response = await this.api.get("/cemeteries/needs-review/count");
      const count = response.count || 0;

      // Update badge
      const badge = document.getElementById("new-cemeteries-badge");
      const statCount = document.getElementById("new-cemeteries-count");

      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? "inline-block" : "none";
      }

      if (statCount) {
        statCount.textContent = count;
        if (count > 0) {
          statCount.parentElement.style.background = "#fff3cd";
          statCount.style.color = "#856404";
        }
      }
    } catch (error) {
      console.error("Failed to load new cemeteries count:", error);
    }
  }

  async loadCemeteries() {
    try {
      console.log("Loading cemeteries...");
      const response = await this.api.get("/cemeteries");
      console.log("Cemeteries response:", response);
      this.allCemeteries = response.cemeteries || [];
      console.log("All cemeteries:", this.allCemeteries);
      this.renderCemeteries(this.allCemeteries);

      // Setup add cemetery button
      const addBtn = document.getElementById("add-cemetery-btn");
      console.log("Add button:", addBtn);
      if (addBtn) {
        addBtn.addEventListener("click", () => this.showCemeteryModal());
      }
    } catch (error) {
      console.error("Failed to load cemeteries:", error);
      this.showNotification("Greška pri učitavanju mezaristana", "error");
    }
  }

  renderCemeteries(cemeteries) {
    const container = document.getElementById("cemeteries-list");

    if (!cemeteries || cemeteries.length === 0) {
      container.innerHTML =
        '<div class="alert alert-info">Nema unesenih mezaristana</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Naziv</th>
              <th>Grad</th>
              <th>Adresa</th>
              <th>Koordinate</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            ${cemeteries
              .map(
                (cemetery) => `
              <tr class="${cemetery.needs_review ? "needs-review-row" : ""}">
                <td>
                  <strong>${cemetery.name}</strong>
                  ${cemetery.needs_review ? '<span class="badge badge-warning">Novo</span>' : ""}
                </td>
                <td>${cemetery.city || "-"}</td>
                <td>${cemetery.address || '<span class="text-muted">Nedostaje</span>'}</td>
                <td>${
                  cemetery.latitude && cemetery.longitude
                    ? `${cemetery.latitude}, ${cemetery.longitude}`
                    : '<span class="text-muted">Nedostaje</span>'
                }</td>
                <td class="actions">
                  <button class="btn btn-sm btn-secondary cemetery-edit-btn" data-id="${
                    cemetery.id
                  }">
                    <i class="fas fa-edit"></i> Izmeni
                  </button>
                  <button class="btn btn-sm btn-danger cemetery-delete-btn" data-id="${
                    cemetery.id
                  }">
                    <i class="fas fa-trash"></i> Obriši
                  </button>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    // Add event listeners for edit and delete buttons
    container.querySelectorAll(".cemetery-edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        this.editCemetery(id);
      });
    });

    container.querySelectorAll(".cemetery-delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        this.deleteCemetery(id);
      });
    });
  }

  showCemeteryModal(cemetery = null) {
    const isEdit = cemetery !== null;
    const modalHTML = `
      <div class="modal" id="cemeteryModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>${isEdit ? "Izmeni" : "Dodaj"} mezaristan</h3>
            <button class="modal-close cemetery-modal-close">&times;</button>
          </div>
          <form id="cemeteryForm">
            <div class="form-group">
              <label>Naziv *</label>
              <input type="text" name="name" value="${
                cemetery?.name || ""
              }" required>
            </div>
            <div class="form-group">
              <label>Grad *</label>
              <input type="text" name="city" value="${
                cemetery?.city || ""
              }" required>
            </div>
            <div class="form-group">
              <label>Adresa</label>
              <input type="text" name="address" value="${
                cemetery?.address || ""
              }">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Latitude</label>
                <input type="number" step="any" name="latitude" value="${
                  cemetery?.latitude || ""
                }" placeholder="42.0942">
              </div>
              <div class="form-group">
                <label>Longitude</label>
                <input type="number" step="any" name="longitude" value="${
                  cemetery?.longitude || ""
                }" placeholder="19.0894">
              </div>
            </div>
            <div class="form-group">
              <label>Opis</label>
              <textarea name="description" rows="3">${
                cemetery?.description || ""
              }</textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary cemetery-modal-cancel">Otkaži</button>
              <button type="submit" class="btn btn-primary">${
                isEdit ? "Sačuvaj" : "Dodaj"
              }</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const modal = document.getElementById("cemeteryModal");

    // Close button handlers
    modal
      .querySelector(".cemetery-modal-close")
      .addEventListener("click", () => {
        modal.remove();
      });

    modal
      .querySelector(".cemetery-modal-cancel")
      .addEventListener("click", () => {
        modal.remove();
      });

    const form = document.getElementById("cemeteryForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      if (isEdit) {
        await this.updateCemetery(cemetery.id, data);
      } else {
        await this.createCemetery(data);
      }
    });
  }

  async createCemetery(data) {
    try {
      await this.api.post("/admin/cemeteries", data);
      this.showNotification("Mezaristan uspešno dodat", "success");
      document.getElementById("cemeteryModal").remove();
      await this.loadCemeteries();
    } catch (error) {
      console.error("Failed to create cemetery:", error);
      this.showNotification("Greška pri dodavanju mezaristana", "error");
    }
  }

  async editCemetery(id) {
    try {
      const cemetery = this.allCemeteries.find((c) => c.id === id);
      if (cemetery) {
        this.showCemeteryModal(cemetery);
      }
    } catch (error) {
      console.error("Failed to edit cemetery:", error);
    }
  }

  async updateCemetery(id, data) {
    try {
      await this.api.put(`/admin/cemeteries/${id}`, data);
      this.showNotification("Mezaristan uspešno izmenjen", "success");
      document.getElementById("cemeteryModal").remove();
      await this.loadCemeteries();
    } catch (error) {
      console.error("Failed to update cemetery:", error);
      this.showNotification("Greška pri izmeni mezaristana", "error");
    }
  }

  async deleteCemetery(id) {
    if (!confirm("Da li ste sigurni da želite obrisati ovaj mezaristan?")) {
      return;
    }

    try {
      await this.api.delete(`/admin/cemeteries/${id}`);
      this.showNotification("Mezaristan uspešno obrisan", "success");
      await this.loadCemeteries();
    } catch (error) {
      console.error("Failed to delete cemetery:", error);
      this.showNotification("Greška pri brisanju mezaristana", "error");
    }
  }
}

// Export for ES6 modules
export { AdminDashboard };

// Export za korišćenje
window.AdminDashboard = AdminDashboard;
