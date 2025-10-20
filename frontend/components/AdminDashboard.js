class AdminDashboard {
  constructor(container) {
    this.container = container;
    this.currentUser = this.getCurrentUser();
    this.pendingComments = [];
    this.init();
  }

  getCurrentUser() {
    const userData = localStorage.getItem('user_data') || sessionStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  async init() {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.container.innerHTML = '<div class="alert alert-danger">Nemate dozvolu za pristup admin panelu</div>';
      return;
    }

    this.render();
    await this.loadPendingComments();
  }

  render() {
    this.container.innerHTML = `
      <div class="admin-dashboard">
        <div class="admin-header">
          <h2><i class="fas fa-shield-alt"></i> Admin Panel</h2>
          <p>Dobrodošli, ${this.currentUser.full_name || this.currentUser.username}</p>
        </div>

        <div class="admin-stats">
          <div class="stat-card">
            <div class="stat-number" id="pending-count">0</div>
            <div class="stat-label">Komentari na čekanju</div>
          </div>
        </div>

        <div class="admin-section">
          <h3><i class="fas fa-comments"></i> Komentari na čekanju</h3>
          <div id="pending-comments-list" class="comments-list">
            <div class="loading">Učitavanje...</div>
          </div>
        </div>
      </div>
    `;
  }

  async loadPendingComments() {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      const response = await fetch('http://localhost:3000/api/admin/comments/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        this.pendingComments = await response.json();
        this.renderPendingComments();
        this.updateStats();
      } else {
        throw new Error('Greška pri učitavanju komentara');
      }
    } catch (error) {
      console.error('Error loading pending comments:', error);
      document.getElementById('pending-comments-list').innerHTML = 
        '<div class="alert alert-danger">Greška pri učitavanju komentara na čekanju</div>';
    }
  }

  renderPendingComments() {
    const container = document.getElementById('pending-comments-list');
    
    if (this.pendingComments.length === 0) {
      container.innerHTML = '<div class="alert alert-info">Nema komentara na čekanju</div>';
      return;
    }

    container.innerHTML = this.pendingComments.map(comment => `
      <div class="comment-card" data-comment-id="${comment.id}">
        <div class="comment-header">
          <div class="comment-author">
            <strong>${comment.author_name || 'Anonimni korisnik'}</strong>
            <span class="comment-email">(${comment.author_email || 'Nema email-a'})</span>
          </div>
          <div class="comment-date">
            ${new Date(comment.created_at).toLocaleString('sr-RS')}
          </div>
        </div>
        
        <div class="comment-post">
          <small class="text-muted">Komentar na: "${comment.post_title || 'Nepoznata objava'}"</small>
        </div>
        
        <div class="comment-content">
          ${comment.content}
        </div>
        
        <div class="comment-actions">
          <button class="btn btn-success btn-sm" data-comment-id="${comment.id}" data-action="approve">
            <i class="fas fa-check"></i> Odobri
          </button>
          <button class="btn btn-danger btn-sm" data-comment-id="${comment.id}" data-action="reject">
            <i class="fas fa-times"></i> Odbaci
          </button>
        </div>
      </div>
    `).join('');

    // Add event listeners to buttons
    this.attachEventListeners();
  }

  attachEventListeners() {
    const buttons = document.querySelectorAll('[data-comment-id]');
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        const commentId = parseInt(e.target.closest('button').dataset.commentId);
        const action = e.target.closest('button').dataset.action;
        
        if (action === 'approve') {
          this.approveComment(commentId);
        } else if (action === 'reject') {
          this.rejectComment(commentId);
        }
      });
    });
  }

  async approveComment(commentId) {
    await this.updateCommentStatus(commentId, 'approved');
  }

  async rejectComment(commentId) {
    await this.updateCommentStatus(commentId, 'rejected');
  }

  async updateCommentStatus(commentId, status) {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      const response = await fetch(`/api/admin/comments/${commentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Ukloni komentar iz liste
        this.pendingComments = this.pendingComments.filter(c => c.id !== commentId);
        this.renderPendingComments();
        this.updateStats();
        
        // Prikaži notifikaciju
        this.showNotification(
          status === 'approved' ? 'Komentar je odobren' : 'Komentar je odbačen',
          'success'
        );
      } else {
        throw new Error('Greška pri ažuriranju komentara');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      this.showNotification('Greška pri ažuriranju komentara', 'error');
    }
  }

  updateStats() {
    document.getElementById('pending-count').textContent = this.pendingComments.length;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
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