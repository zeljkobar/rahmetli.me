import { RegisterForm } from "./RegisterForm.js";
import { LoginForm } from "./LoginForm.js";

export class AuthManager {
  constructor(onAuthSuccess) {
    this.onAuthSuccess = onAuthSuccess;
    this.element = null;
    this.currentForm = null;
    this.currentMode = "login";

    this.handleAuthSuccess = this.handleAuthSuccess.bind(this);
    this.switchToRegister = this.switchToRegister.bind(this);
    this.switchToLogin = this.switchToLogin.bind(this);
  }

  render() {
    this.element = document.createElement("div");
    this.element.className = "auth-manager";
    this.element.innerHTML = `
      <div class="auth-overlay">
        <div class="auth-modal">
          <button class="auth-close-btn" aria-label="Zatvori">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          
          <div class="auth-content">
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.renderCurrentForm();
    return this.element;
  }

  attachEventListeners() {
    const closeBtn = this.element.querySelector(".auth-close-btn");
    const overlay = this.element.querySelector(".auth-overlay");

    closeBtn.addEventListener("click", () => this.close());

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    this.handleKeyDown = (e) => {
      if (e.key === "Escape") {
        this.close();
      }
    };
    document.addEventListener("keydown", this.handleKeyDown);

    document.body.style.overflow = "hidden";
  }

  renderCurrentForm() {
    const content = this.element.querySelector(".auth-content");

    if (this.currentForm) {
      this.currentForm.destroy();
    }

    if (this.currentMode === "register") {
      this.currentForm = new RegisterForm(
        this.handleAuthSuccess,
        this.switchToLogin
      );
    } else {
      this.currentForm = new LoginForm(
        this.handleAuthSuccess,
        this.switchToRegister
      );
    }

    content.innerHTML = "";
    const formElement = this.currentForm.render();
    content.appendChild(formElement);

    // Re-attach event listeners after element is in DOM
    if (this.currentForm.attachEventListeners) {
      setTimeout(() => this.currentForm.attachEventListeners(), 0);
    }
  }

  switchToRegister() {
    if (this.currentMode !== "register") {
      this.currentMode = "register";
      this.renderCurrentForm();
    }
  }

  switchToLogin() {
    if (this.currentMode !== "login") {
      this.currentMode = "login";
      this.renderCurrentForm();
    }
  }

  setMode(mode) {
    if (mode === "register") {
      this.switchToRegister();
    } else {
      this.switchToLogin();
    }
  }

  handleAuthSuccess(authData) {
    this.close();

    if (this.onAuthSuccess) {
      this.onAuthSuccess(authData);
    }
  }

  close() {
    if (this.handleKeyDown) {
      document.removeEventListener("keydown", this.handleKeyDown);
    }

    document.body.style.overflow = "";

    if (this.currentForm) {
      this.currentForm.destroy();
      this.currentForm = null;
    }

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
  }

  destroy() {
    this.close();
  }

  static isAuthenticated() {
    const token =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token");
    return !!token;
  }

  static getCurrentUser() {
    const userData =
      localStorage.getItem("user_data") || sessionStorage.getItem("user_data");
    return userData ? JSON.parse(userData) : null;
  }

  static logout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("user_data");

    window.location.reload();
  }

  static showAuthModal(mode = "login", onSuccess = null) {
    const existing = document.querySelector(".auth-manager");
    if (existing) {
      existing.remove();
    }

    const authManager = new AuthManager(onSuccess);
    const modalElement = authManager.render();

    authManager.setMode(mode);

    document.body.appendChild(modalElement);

    return authManager;
  }
}
