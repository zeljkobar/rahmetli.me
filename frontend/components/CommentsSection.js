import { api } from "../utils/api.js";

export class CommentsSection {
  constructor(postId, container) {
    this.postId = postId;
    this.container = container;
    this.comments = [];
    this.isLoggedIn = false;
    this.currentUser = null;
    this.init();
  }

  async init() {
    this.checkAuthStatus();
    await this.loadComments();
    this.render();
    this.attachEventListeners();
  }

  checkAuthStatus() {
    // Check both localStorage and sessionStorage for auth data
    const token =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token");
    const userData =
      localStorage.getItem("user_data") || sessionStorage.getItem("user_data");

    this.isLoggedIn = !!token;
    this.currentUser = userData ? JSON.parse(userData) : null;
  }

  async loadComments() {
    try {
      const response = await api.get(`/comments/post/${this.postId}`);
      this.comments = response.comments || [];
    } catch (error) {
      console.error("Error loading comments:", error);
      this.comments = [];
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="comments-section">
        <div class="comments-header">
          <h3 class="comments-title">
            <i class="fas fa-heart"></i>
            Poslednji pozdravi (${this.comments.length})
          </h3>
        </div>

        ${this.isLoggedIn ? this.renderCommentForm() : this.renderLoginPrompt()}

        <div class="comments-list">
          ${
            this.comments.length > 0
              ? this.comments
                  .map((comment) => this.renderComment(comment))
                  .join("")
              : '<div class="no-comments">Još nema pozdrava. Budite prvi koji će ostaviti poslednji pozdrav.</div>'
          }
        </div>
      </div>
    `;
  }

  renderCommentForm() {
    return `
      <div class="comment-form-container">
        <form class="comment-form" id="commentForm">
          <div class="form-group">
            <label for="commentContent">Vaš poslednji pozdrav:</label>
            <textarea 
              id="commentContent" 
              name="content" 
              placeholder="Podelite svoje sećanje, pozdrav ili saučešće..."
              rows="4"
              minlength="5"
              maxlength="1000"
              required
            ></textarea>
            <div class="char-counter">
              <span id="charCount">0</span> / 1000
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-paper-plane"></i>
              Pošalji pozdrav
            </button>
          </div>
        </form>
      </div>
    `;
  }

  renderLoginPrompt() {
    return `
      <div class="login-prompt">
        <div class="login-prompt-content">
          <i class="fas fa-sign-in-alt"></i>
          <p>Prijavite se da biste ostavili poslednji pozdrav</p>
          <button class="btn btn-primary" id="showLoginBtn">
            Prijavite se
          </button>
        </div>
      </div>
    `;
  }

  renderComment(comment) {
    const date = new Date(comment.created_at);
    const timeAgo = this.getTimeAgo(date);

    return `
      <div class="comment" data-comment-id="${comment.id}">
        <div class="comment-header">
          <div class="comment-author">
            <div class="author-avatar">
              <i class="fas fa-user"></i>
            </div>
            <div class="author-info">
              <span class="author-name">${this.escapeHtml(
                comment.author_name
              )}</span>
              <span class="comment-date">${timeAgo}</span>
            </div>
          </div>
          
          ${
            this.canEditComment(comment)
              ? this.renderCommentActions(comment)
              : ""
          }
        </div>
        
        <div class="comment-content">
          <p>${this.escapeHtml(comment.content)}</p>
        </div>

        ${
          comment.status === "pending"
            ? '<div class="comment-status pending">Komentar čeka odobrenje</div>'
            : ""
        }
      </div>
    `;
  }

  renderCommentActions(comment) {
    return `
      <div class="comment-actions">
        <button class="action-btn edit-btn" data-comment-id="${comment.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete-btn" data-comment-id="${comment.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  }

  canEditComment(comment) {
    if (!this.currentUser) return false;

    return (
      comment.user_id === this.currentUser.id ||
      this.currentUser.role === "admin" ||
      this.currentUser.role === "moderator"
    );
  }

  attachEventListeners() {
    // Comment form submission
    const commentForm = this.container.querySelector("#commentForm");
    if (commentForm) {
      commentForm.addEventListener("submit", (e) =>
        this.handleCommentSubmit(e)
      );

      // Character counter
      const textarea = this.container.querySelector("#commentContent");
      const charCount = this.container.querySelector("#charCount");
      if (textarea && charCount) {
        textarea.addEventListener("input", () => {
          charCount.textContent = textarea.value.length;

          if (textarea.value.length > 950) {
            charCount.style.color = "#e74c3c";
          } else {
            charCount.style.color = "#666";
          }
        });
      }
    }

    // Login button
    const loginBtn = this.container.querySelector("#showLoginBtn");
    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("showLogin"));
      });
    }

    // Comment actions
    this.container.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".edit-btn");
      const deleteBtn = e.target.closest(".delete-btn");

      if (editBtn) {
        const commentId = editBtn.dataset.commentId;
        this.editComment(commentId);
      }

      if (deleteBtn) {
        const commentId = deleteBtn.dataset.commentId;
        this.deleteComment(commentId);
      }
    });
  }

  async handleCommentSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const content = formData.get("content").trim();

    if (!content || content.length < 5) {
      this.showError("Komentar mora imati najmanje 5 karaktera");
      return;
    }

    try {
      this.showLoading();

      const response = await api.post("/comments", {
        post_id: this.postId,
        content: content,
      });

      this.showSuccess(
        "Pozdrav je poslat na moderaciju i biće prikazan nakon odobrenja"
      );

      // Reset form
      e.target.reset();
      this.container.querySelector("#charCount").textContent = "0";

      // Reload comments
      await this.loadComments();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error("Error submitting comment:", error);
      this.showError(error.message || "Greška pri slanju komentara");
    } finally {
      this.hideLoading();
    }
  }

  async editComment(commentId) {
    const comment = this.comments.find((c) => c.id == commentId);
    if (!comment) return;

    const newContent = prompt("Uredite komentar:", comment.content);
    if (!newContent || newContent.trim() === comment.content) return;

    if (newContent.trim().length < 5 || newContent.trim().length > 1000) {
      alert("Komentar mora imati 5-1000 karaktera");
      return;
    }

    try {
      await api.put(`/comments/${commentId}`, {
        content: newContent.trim(),
      });

      this.showSuccess("Komentar je uspešno ažuriran");
      await this.loadComments();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error("Error editing comment:", error);
      this.showError(error.message || "Greška pri ažuriranju komentara");
    }
  }

  async deleteComment(commentId) {
    if (!confirm("Da li ste sigurni da želite da obrišete ovaj komentar?")) {
      return;
    }

    try {
      await api.delete(`/comments/${commentId}`);

      this.showSuccess("Komentar je uspešno obrisan");
      await this.loadComments();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error("Error deleting comment:", error);
      this.showError(error.message || "Greška pri brisanju komentara");
    }
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Pre manje od minut";
    if (diffInSeconds < 3600)
      return `Pre ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400)
      return `Pre ${Math.floor(diffInSeconds / 3600)} sati`;
    if (diffInSeconds < 2592000)
      return `Pre ${Math.floor(diffInSeconds / 86400)} dana`;
    if (diffInSeconds < 31536000)
      return `Pre ${Math.floor(diffInSeconds / 2592000)} meseci`;
    return `Pre ${Math.floor(diffInSeconds / 31536000)} godina`;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showLoading() {
    const submitBtn = this.container.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Šalje se...';
    }
  }

  hideLoading() {
    const submitBtn = this.container.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<i class="fas fa-paper-plane"></i> Pošalji pozdrav';
    }
  }

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas ${
          type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
        }"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 5000);
  }

  // Public method to refresh comments (called when user logs in/out)
  async refresh() {
    this.checkAuthStatus();
    await this.loadComments();
    this.render();
    this.attachEventListeners();
  }
}
