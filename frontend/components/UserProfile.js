import { api } from "../utils/api.js";

export class UserProfile {
  constructor(userId) {
    this.userId = userId;
    this.user = null;
    this.element = null;
  }

  async render() {
    try {
      const response = await api.get(`/users/${this.userId}`);
      this.user = response.user;

      this.element = document.createElement("div");
      this.element.className = "user-profile";
      this.element.innerHTML = this.getHTML();

      return this.element;
    } catch (error) {
      console.error("Error loading user profile:", error);
      this.element = document.createElement("div");
      this.element.className = "user-profile error";
      this.element.innerHTML = `
        <div class="error-message">
          <h3>Greška pri učitavanju profila</h3>
          <p>Korisnik nije pronađen ili se dogodila greška.</p>
        </div>
      `;
      return this.element;
    }
  }

  getHTML() {
    if (!this.user) return "";

    const joinedDate = new Date(this.user.created_at).toLocaleDateString(
      "sr-RS",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    return `
      <div class="profile-header">
        <div class="profile-avatar">
          <div class="avatar-circle">
            ${this.user.full_name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div class="profile-info">
          <h1 class="profile-name">${this.user.full_name}</h1>
          <p class="profile-username">@${this.user.username}</p>
          <div class="profile-stats">
            <div class="stat">
              <span class="stat-number">${this.user.posts_count}</span>
              <span class="stat-label">objava</span>
            </div>
            <div class="stat">
              <span class="stat-number">${joinedDate}</span>
              <span class="stat-label">član od</span>
            </div>
          </div>
        </div>
      </div>

      ${
        this.user.recentPosts && this.user.recentPosts.length > 0
          ? `
        <div class="profile-recent-posts">
          <h3>Najnovije objave</h3>
          <div class="recent-posts-list">
            ${this.user.recentPosts
              .map(
                (post) => `
              <div class="recent-post-item">
                <h4>${post.deceased_name}</h4>
                <p class="post-type">${this.getPostTypeLabel(post.type)}</p>
                <p class="post-date">${new Date(
                  post.created_at
                ).toLocaleDateString("sr-RS")}</p>
              </div>
            `
              )
              .join("")}
          </div>
          <a href="#/posts/user/${this.userId}" class="view-all-posts">
            Pogledajte sve objave →
          </a>
        </div>
      `
          : `
        <div class="profile-no-posts">
          <p>Korisnik još uvek nema objavljenih objava.</p>
        </div>
      `
      }
    `;
  }

  getPostTypeLabel(type) {
    const labels = {
      obituary: "Smrtovnica",
      memorial: "Komemorativan",
      anniversary: "Godišnjica",
    };
    return labels[type] || type;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
