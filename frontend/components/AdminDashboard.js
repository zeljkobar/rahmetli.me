import { api } from "../utils/api.js";

class AdminDashboard {
  constructor(container) {
    this.container = container;
    this.currentUser = this.getCurrentUser();
    this.pendingComments = [];
    this.allUsers = []; // Store all users for filtering
    this.api = api; // Use imported API instance
    this.init();
  }

  getCurrentUser() {
    const userData =
      localStorage.getItem("user_data") || sessionStorage.getItem("user_data");
    return userData ? JSON.parse(userData) : null;
  }

  async init() {
    if (!this.currentUser || this.currentUser.role !== "admin") {
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
  }

  filterUsers() {
    if (!this.allUsers.length) return;

    const roleFilter = document.getElementById("user-role-filter")?.value || "";
    const searchTerm = document.getElementById("user-search")?.value.toLowerCase() || "";

    let filteredUsers = this.allUsers;

    // Filter by role
    if (roleFilter) {
      filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
    }

    // Filter by search term (username, email, full_name)
    if (searchTerm) {
      filteredUsers = filteredUsers.filter(user => 
        (user.username || "").toLowerCase().includes(searchTerm) ||
        (user.email || "").toLowerCase().includes(searchTerm) ||
        (user.full_name || "").toLowerCase().includes(searchTerm)
      );
    }

    console.log('🔍 Filtering users:', { roleFilter, searchTerm, total: this.allUsers.length, filtered: filteredUsers.length });
    this.renderUsers(filteredUsers);
  }

  switchTab(tab) {
    console.log('🔄 Switching to tab:', tab);
    
    // Update nav buttons
    document
      .querySelectorAll(".nav-btn")
      .forEach((btn) => btn.classList.remove("active"));
    document.querySelector(`[data-tab="${tab}"]`).classList.add("active");

    // Update tab content
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.style.display = 'none');
    
    const activeTabContent = document.getElementById(`${tab}-tab`);
    console.log('📍 Active tab content:', activeTabContent);
    activeTabContent.style.display = 'block';

    // Load tab data
    switch (tab) {
      case "comments":
        this.loadPendingComments();
        break;
      case "posts":
        this.loadPendingPosts();
        break;
      case "users":
        this.loadUsers();
        break;
      case "stats":
        this.loadDetailedStats();
        break;
    }
  }

  async loadInitialData() {
    await Promise.all([this.loadPendingComments(), this.loadStats()]);
  }

  render() {
    this.container.innerHTML = `
      <div class="admin-dashboard">
        <div class="admin-header">
          <h2><i class="fas fa-shield-alt"></i> Admin Panel</h2>
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
          <button class="nav-btn" data-tab="users">
            <i class="fas fa-users"></i> Korisnici
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
        </div>

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

        <!-- Stats Tab -->
        <div class="admin-section tab-content" id="stats-tab" style="display: none;">
          <h3><i class="fas fa-chart-bar"></i> Detaljne statistike</h3>
          <div id="detailed-stats" class="stats-grid">
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
    console.log('🎨 Rendering pending comments:', this.pendingComments);
    const container = document.getElementById("pending-comments-list");
    console.log('📍 Comments container:', container);

    if (this.pendingComments.length === 0) {
      console.log('💡 No pending comments, showing empty message');
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
    `
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
          e.target.closest("button").dataset.commentId
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
        (c) => c.id !== commentId
      );
      this.renderPendingComments();
      this.updateStats();

      // Prikaži notifikaciju
      this.showNotification(
        status === "approved" ? "Komentar je odobren" : "Komentar je odbačen",
        "success"
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
            "sr-RS"
          )}</span>
        </div>
        <div class="post-details">
          <p><strong>Korisnik:</strong> ${post.username}</p>
          <p><strong>Dženaza:</strong> ${new Date(
            post.dzenaza_date
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
          <button class="btn btn-info btn-sm" onclick="window.open('/objava/${
            post.id
          }', '_blank')">
            <i class="fas fa-eye"></i> Pregledaj
          </button>
        </div>
      </div>
    `
      )
      .join("");

    // Add event listeners for post actions
    container
      .querySelectorAll("[data-post-id][data-action]")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          const postId = parseInt(e.target.closest("button").dataset.postId);
          const action = e.target.closest("button").dataset.action;
          this.updatePostStatus(
            postId,
            action === "approve" ? "approved" : "rejected"
          );
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
        "success"
      );
      this.loadPendingPosts(); // Reload posts
      this.loadStats(); // Update stats
    } catch (error) {
      console.error("Error updating post:", error);
      this.showNotification("Greška pri ažuriranju objave", "error");
    }
  }

  async loadUsers() {
    try {
      console.log('🔄 Loading users...');
      const users = await this.api.request('/admin/users');
      console.log('📥 Users response:', users);
      this.allUsers = users; // Store all users
      this.filterUsers(); // Apply current filters
    } catch (error) {
      console.error("❌ Error loading users:", error);
      document.getElementById("users-list").innerHTML =
        '<div class="alert alert-danger">Greška pri učitavanju korisnika</div>';
    }
  }

  renderUsers(users) {
    console.log('🎨 Rendering users:', users);
    const container = document.getElementById("users-list");
    console.log('📍 Users container:', container);

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
                  "sr-RS"
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
                  <button class="btn btn-sm ${
                    user.is_active ? "btn-warning" : "btn-success"
                  }" 
                          onclick="adminDashboard.toggleUserStatus(${
                            user.id
                          }, ${!user.is_active})">
                    <i class="fas fa-${user.is_active ? "ban" : "check"}"></i>
                    ${user.is_active ? "Deaktiviraj" : "Aktiviraj"}
                  </button>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  async toggleUserStatus(userId, activate) {
    try {
      await this.api.request(`/admin/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ is_active: activate }),
      });

      this.showNotification(
        `Korisnik je ${activate ? "aktiviran" : "deaktiviran"}`,
        "success"
      );
      this.loadUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      this.showNotification("Greška pri ažuriranju korisnika", "error");
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

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

// Export for ES6 modules
export { AdminDashboard };

// Export za korišćenje
window.AdminDashboard = AdminDashboard;
