import { api } from "../utils/api.js";
import { EditProfile } from "./EditProfile.js";
import { ChangePassword } from "./ChangePassword.js";

export class UserDashboard {
  constructor() {
    this.currentUser = null;
    this.posts = [];
    this.element = null;
    this.currentTab = "overview";
    this.editProfileModal = null;
    this.changePasswordModal = null;
  }

  async render() {
    try {
      // Get current user from localStorage or sessionStorage
      let userData =
        localStorage.getItem("user_data") ||
        sessionStorage.getItem("user_data");

      // If no user data in storage, try to get from API if we have token
      if (!userData) {
        const token =
          localStorage.getItem("auth_token") ||
          sessionStorage.getItem("auth_token");
        if (token) {
          try {
            const response = await api.getProfile();
            if (response.success) {
              userData = JSON.stringify(response.user);
              localStorage.setItem("user_data", userData);
            }
          } catch (error) {
            console.error("Failed to get user profile:", error);
          }
        }
      }

      if (!userData) {
        // Return a simple element instead of redirecting to avoid infinite loops
        const errorElement = document.createElement("div");
        errorElement.className = "user-dashboard-error";
        errorElement.innerHTML = `
          <div class="alert alert-warning">
            <p>Molimo prijavite se da biste pristupili profilu.</p>
            <a href="#/" class="btn btn-primary">Početna stranica</a>
          </div>
        `;
        return errorElement;
      }

      this.currentUser = JSON.parse(userData);

      this.element = document.createElement("div");
      this.element.className = "user-dashboard";
      this.element.innerHTML = this.getHTML();

      this.attachEventListeners();
      await this.loadUserPosts();

      return this.element;
    } catch (error) {
      console.error("Error rendering UserDashboard:", error);
      const errorElement = document.createElement("div");
      errorElement.className = "user-dashboard-error";
      errorElement.innerHTML = `
        <div class="alert alert-danger">
          <p>Greška pri učitavanju profila. Molimo pokušajte ponovo.</p>
          <a href="#/" class="btn btn-primary">Početna stranica</a>
        </div>
      `;
      return errorElement;
    }
  }

  getHTML() {
    try {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h1>Moj profil</h1>
            <p>Dobrodošli, ${this.currentUser?.full_name || "Korisnik"}</p>
          </div>
        </div>

        <div class="dashboard-tabs">
          <button class="tab-button active" data-tab="overview">Pregled</button>
          <button class="tab-button" data-tab="posts">Moje objave</button>
          <button class="tab-button" data-tab="settings">Podešavanja</button>
        </div>

        <div class="dashboard-content">
          <div class="tab-content active" data-content="overview">
            ${this.getOverviewHTML()}
          </div>
          
          <div class="tab-content" data-content="posts">
            ${this.getPostsHTML()}
          </div>
          
          <div class="tab-content" data-content="settings">
            ${this.getSettingsHTML()}
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Error generating HTML:", error);
      return `
        <div class="alert alert-danger">
          <p>Greška pri renderovanju stranice.</p>
        </div>
      `;
    }
  }

  getOverviewHTML() {
    return `
      <div class="overview-grid">
        <div class="overview-card">
          <div class="card-icon">📝</div>
          <div class="card-content">
            <h3>Moje objave</h3>
            <p class="card-number" id="posts-count">-</p>
            <p class="card-description">ukupno objava</p>
          </div>
        </div>
        
        <div class="overview-card">
          <div class="card-icon">👤</div>
          <div class="card-content">
            <h3>Profil</h3>
            <p class="card-text">${this.currentUser.full_name}</p>
            <p class="card-description">@${this.currentUser.username}</p>
          </div>
        </div>
        
        <div class="overview-card">
          <div class="card-icon">📧</div>
          <div class="card-content">
            <h3>Email</h3>
            <p class="card-text">${this.currentUser.email}</p>
            <p class="card-description">kontakt email</p>
          </div>
        </div>
        
        <div class="overview-card">
          <div class="card-icon">📅</div>
          <div class="card-content">
            <h3>Član od</h3>
            <p class="card-text">${new Date().toLocaleDateString("sr-RS")}</p>
            <p class="card-description">datum registracije</p>
          </div>
        </div>
      </div>

      <div class="recent-activity">
        <h3>Poslednja aktivnost</h3>
        <div class="activity-list" id="recent-posts">
          <div class="loading">Učitavanje...</div>
        </div>
      </div>
    `;
  }

  getPostsHTML() {
    return `
      <div class="posts-header">
        <h3>Moje objave</h3>
        <div class="posts-filters">
          <select class="status-filter" id="status-filter">
            <option value="">Sve objave</option>
            <option value="pending">Na čekanju</option>
            <option value="approved">Odobreno</option>
            <option value="rejected">Odbačeno</option>
          </select>
        </div>
      </div>
      
      <div class="posts-list" id="posts-list">
        <div class="loading">Učitavanje objava...</div>
      </div>
      
      <div class="pagination" id="posts-pagination"></div>
    `;
  }

  getSettingsHTML() {
    return `
      <div class="settings-section">
        <h3>Podešavanja naloga</h3>
        
        <div class="setting-group">
          <h4>Lični podaci</h4>
          <p>Ažurirajte svoje osnovne informacije</p>
          <button class="btn btn-outline" id="edit-profile-btn">
            Uredi profil
          </button>
        </div>
        
        <div class="setting-group">
          <h4>Bezbednost</h4>
          <p>Promenite svoju lozinku</p>
          <button class="btn btn-outline" id="change-password-btn">
            Promeni lozinku
          </button>
        </div>
        
        <div class="setting-group">
          <h4>Notifikacije</h4>
          <p>Upravljajte email notifikacijama</p>
          <label class="checkbox-label">
            <input type="checkbox" id="email-notifications" checked>
            <span class="checkmark"></span>
            Email notifikacije o komentarima
          </label>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    try {
      // Tab switching
      this.element.querySelectorAll(".tab-button").forEach((button) => {
        button.addEventListener("click", (e) => {
          const tab = e.target.dataset.tab;
          this.switchTab(tab);
        });
      });

      // Settings buttons
      const editProfileBtn = this.element.querySelector("#edit-profile-btn");
      if (editProfileBtn) {
        editProfileBtn.addEventListener("click", () => this.openEditProfile());
      }

      const changePasswordBtn = this.element.querySelector(
        "#change-password-btn"
      );
      if (changePasswordBtn) {
        changePasswordBtn.addEventListener("click", () =>
          this.openChangePassword()
        );
      }

      // Status filter
      const statusFilter = this.element.querySelector("#status-filter");
      if (statusFilter) {
        statusFilter.addEventListener("change", () => this.loadUserPosts());
      }
    } catch (error) {
      console.error("Error attaching event listeners:", error);
    }
  }

  switchTab(tabName) {
    // Update active tab button
    this.element.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.remove("active");
    });
    this.element
      .querySelector(`[data-tab="${tabName}"]`)
      .classList.add("active");

    // Update active content
    this.element.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });
    this.element
      .querySelector(`[data-content="${tabName}"]`)
      .classList.add("active");

    this.currentTab = tabName;

    // Load content if needed
    if (tabName === "posts") {
      this.loadUserPosts();
    }
  }

  async loadUserPosts() {
    try {
      const statusFilter = this.element.querySelector("#status-filter");
      const status = statusFilter ? statusFilter.value : "";

      // Build query parameters, only include status if it's not empty
      const params = {};
      if (status && status !== "") {
        params.status = status;
      }

      const response = await api.get("/users/me/posts", params);
      this.posts = response.posts || [];

      this.updatePostsDisplay();
      this.updateOverviewStats();
    } catch (error) {
      console.error("Error loading user posts:", error);
      // Show user-friendly error message
      this.showPostsError(
        "Greška pri učitavanju objava. Molimo pokušajte ponovo."
      );
    }
  }

  updatePostsDisplay() {
    const postsList = this.element.querySelector("#posts-list");
    if (!postsList) return;

    if (this.posts.length === 0) {
      postsList.innerHTML = `
        <div class="no-posts">
          <p>Nemate objava sa odabranim filterom.</p>
          <a href="#/create" class="btn btn-primary">Kreiraj novu objavu</a>
        </div>
      `;
      return;
    }

    postsList.innerHTML = this.posts
      .map(
        (post) => `
      <div class="post-item">
        <div class="post-info">
          <h4>${post.deceased_name}</h4>
          <p class="post-meta">
            ${post.category_name || "Obavještenje"} • 
            ${post.cemetery_name || "Nepoznato groblje"} • 
            ${post.comments_count} komentara
          </p>
          <p class="post-date">${new Date(post.created_at).toLocaleDateString(
            "sr-RS"
          )}</p>
        </div>
        <div class="post-status">
          <span class="status status-${post.status}">${this.getStatusLabel(
          post.status
        )}</span>
        </div>
        <div class="post-actions">
          <a href="#/post/${
            post.id
          }" class="btn btn-sm btn-outline">Pogledaj</a>
        </div>
      </div>
    `
      )
      .join("");
  }

  updateOverviewStats() {
    const postsCount = this.element.querySelector("#posts-count");
    if (postsCount) {
      postsCount.textContent = this.posts.length;
    }

    const recentPosts = this.element.querySelector("#recent-posts");
    if (recentPosts) {
      const recent = this.posts.slice(0, 3);
      if (recent.length === 0) {
        recentPosts.innerHTML = `<p>Nemate nedavnih objava.</p>`;
      } else {
        recentPosts.innerHTML = recent
          .map(
            (post) => `
          <div class="activity-item">
            <span class="activity-text">Objavili ste: ${
              post.deceased_name
            }</span>
            <span class="activity-date">${new Date(
              post.created_at
            ).toLocaleDateString("sr-RS")}</span>
          </div>
        `
          )
          .join("");
      }
    }
  }

  getStatusLabel(status) {
    const labels = {
      pending: "Na čekanju",
      approved: "Odobreno",
      rejected: "Odbačeno",
    };
    return labels[status] || status;
  }

  showPostsError(message) {
    const postsList = this.element.querySelector("#posts-list");
    if (postsList) {
      postsList.innerHTML = `
        <div class="error-message" style="padding: 2rem; text-align: center; color: #dc2626;">
          <p>${message}</p>
          <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
            Pokušaj ponovo
          </button>
        </div>
      `;
    }
  }

  async openEditProfile() {
    this.editProfileModal = new EditProfile(this.currentUser, (updatedUser) => {
      this.currentUser = updatedUser;
      localStorage.setItem("user_data", JSON.stringify(updatedUser));
      this.refreshDisplay();
      this.editProfileModal.close();
    });

    document.body.appendChild(await this.editProfileModal.render());
  }

  async openChangePassword() {
    this.changePasswordModal = new ChangePassword(() => {
      this.changePasswordModal.close();
    });

    document.body.appendChild(await this.changePasswordModal.render());
  }

  refreshDisplay() {
    const oldElement = this.element;
    this.element.innerHTML = this.getHTML();
    this.attachEventListeners();
    this.loadUserPosts();
  }

  destroy() {
    if (this.editProfileModal) {
      this.editProfileModal.destroy();
    }
    if (this.changePasswordModal) {
      this.changePasswordModal.destroy();
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
