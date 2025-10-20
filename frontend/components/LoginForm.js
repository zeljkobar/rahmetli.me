import { validateEmail, validateRequired } from "../utils/validation.js";
import { api } from "../utils/api.js";

export class LoginForm {
  constructor(onSuccess, onSwitchToRegister) {
    this.onSuccess = onSuccess;
    this.onSwitchToRegister = onSwitchToRegister;
    this.element = null;
    this.isLoading = false;

    this.state = {
      email: "",
      password: "",
      rememberMe: false,
      errors: {},
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.togglePasswordVisibility = this.togglePasswordVisibility.bind(this);
  }

  render() {
    this.element = document.createElement("div");
    this.element.className = "auth-form login-form";

    this.element.innerHTML = `
      <div class="auth-form-container">
        <div class="auth-header">
          <h2>Prijava</h2>
          <p>Dobrodošli nazad</p>
        </div>
        
        <form class="auth-form-fields" id="loginForm">
          <div class="form-group">
            <label for="loginEmail">Email adresa *</label>
            <div class="input-wrapper">
              <input 
                type="email" 
                id="loginEmail" 
                name="email" 
                value="${this.state.email}"
                placeholder="vaš@email.com"
                autocomplete="email"
                ${this.isLoading ? "disabled" : ""}
              >
              <div class="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
            </div>
            ${
              this.state.errors.email
                ? `<div class="error-message">${this.state.errors.email}</div>`
                : ""
            }
          </div>
          
          <div class="form-group">
            <label for="loginPassword">Lozinka *</label>
            <div class="input-wrapper password-input">
              <input 
                type="password" 
                id="loginPassword" 
                name="password" 
                value="${this.state.password}"
                placeholder="••••••••"
                autocomplete="current-password"
                ${this.isLoading ? "disabled" : ""}
              >
              <button type="button" class="password-toggle" tabindex="-1">
                <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg class="eye-off-icon hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            ${
              this.state.errors.password
                ? `<div class="error-message">${this.state.errors.password}</div>`
                : ""
            }
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="rememberMe" 
                name="rememberMe" 
                ${this.state.rememberMe ? "checked" : ""}
                ${this.isLoading ? "disabled" : ""}
              >
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">Zapamti me</span>
            </label>
          </div>
          
          ${
            this.state.errors.general
              ? `<div class="error-message general-error">${this.state.errors.general}</div>`
              : ""
          }
          
          <button 
            type="submit" 
            class="btn btn-primary btn-full-width"
            ${this.isLoading ? "disabled" : ""}
          >
            ${
              this.isLoading
                ? `
              <span class="loading-spinner"></span>
              Prijavljivanje...
            `
                : "Prijavite se"
            }
          </button>
          
          <div class="form-divider">
            <span>ili</span>
          </div>
          
          <button 
            type="button" 
            class="btn btn-secondary btn-full-width switch-auth"
            ${this.isLoading ? "disabled" : ""}
          >
            Nemate nalog? Registrujte se
          </button>
          
          <div class="forgot-password">
            <a href="#" class="forgot-link">Zaboravili ste lozinku?</a>
          </div>
        </form>
      </div>
    `;

    // Note: Event listeners will be attached by AuthManager after element is in DOM
    return this.element;
  }

  attachEventListeners() {
    if (!this.element) {
      console.warn(
        "LoginForm: Element not found when attaching event listeners"
      );
      return;
    }

    // Prevent duplicate event listeners
    if (this.element.dataset.listenersAttached === "true") {
      console.log("LoginForm: Event listeners already attached, skipping");
      return;
    }

    const form = this.element.querySelector("#loginForm");
    const inputs = this.element.querySelectorAll(
      'input[type="email"], input[type="password"]'
    );
    const passwordToggle = this.element.querySelector(".password-toggle");
    const switchButton = this.element.querySelector(".switch-auth");
    const rememberMeCheckbox = this.element.querySelector("#rememberMe");

    if (!form) {
      console.warn("LoginForm: Form not found");
      return;
    }

    form.addEventListener("submit", this.handleSubmit);

    // Mark as attached
    this.element.dataset.listenersAttached = "true";

    inputs.forEach((input) => {
      input.addEventListener("input", this.handleInputChange);
      input.addEventListener("blur", this.handleInputChange);
      input.addEventListener("keypress", this.handleKeyPress);
    });

    if (passwordToggle) {
      passwordToggle.addEventListener("click", this.togglePasswordVisibility);
    }

    if (switchButton && this.onSwitchToRegister) {
      switchButton.addEventListener("click", this.onSwitchToRegister);
    }

    if (rememberMeCheckbox) {
      rememberMeCheckbox.addEventListener("change", (e) => {
        this.state.rememberMe = e.target.checked;
      });
    }

    // Focus first input
    setTimeout(() => {
      if (this.element && this.element.isConnected) {
        const firstInput = this.element.querySelector("#loginEmail");
        if (firstInput) firstInput.focus();
      }
    }, 100);
  }

  handleInputChange(e) {
    const { name, value } = e.target;
    this.state[name] = value;

    // Clear previous errors
    if (this.state.errors[name]) {
      this.state.errors[name] = "";
      this.updateErrorDisplay(name);
    }

    // Clear general error
    if (this.state.errors.general) {
      this.state.errors.general = "";
      this.updateErrorDisplay("general");
    }

    // Real-time validation on blur
    if (e.type === "blur") {
      this.validateField(name, value);
    }
  }

  handleKeyPress(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      this.handleSubmit(e);
    }
  }

  validateField(fieldName, value) {
    let result = { isValid: true };

    switch (fieldName) {
      case "email":
        result = validateRequired(value, "Email adresa");
        if (result.isValid) {
          result = validateEmail(value)
            ? { isValid: true }
            : { isValid: false, error: "Unesite valjan email" };
        }
        break;

      case "password":
        result = validateRequired(value, "Lozinka");
        break;
    }

    if (!result.isValid) {
      this.state.errors[fieldName] = result.error;
      this.updateErrorDisplay(fieldName);
      return false;
    }

    return true;
  }

  validateForm() {
    let isValid = true;
    const errors = {};

    // Validate email
    if (!this.validateField("email", this.state.email)) {
      isValid = false;
    }

    // Validate password
    if (!this.validateField("password", this.state.password)) {
      isValid = false;
    }

    return isValid;
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (this.isLoading) {
      return;
    }

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    this.setLoading(true);

    try {
      const loginData = {
        email_or_username: this.state.email.trim(),
        password: this.state.password,
      };

      const response = await api.login(loginData);

      if (response.token && response.user) {
        // Store auth data
        const storage = this.state.rememberMe ? localStorage : sessionStorage;
        storage.setItem("auth_token", response.token);
        storage.setItem("user_data", JSON.stringify(response.user));

        // Call success callback
        if (this.onSuccess) {
          this.onSuccess({
            token: response.token,
            user: response.user,
          });
        }
      } else {
        this.state.errors.general =
          response.message || response.error || "Neispravni podaci za prijavu";
        this.updateErrorDisplay("general");
      }
    } catch (error) {
      console.error("Login error:", error);
      this.state.errors.general = "Došlo je do greške. Pokušajte ponovo.";
      this.updateErrorDisplay("general");
    } finally {
      this.setLoading(false);
    }
  }

  togglePasswordVisibility() {
    const passwordInput = this.element.querySelector("#loginPassword");
    const eyeIcon = this.element.querySelector(".eye-icon");
    const eyeOffIcon = this.element.querySelector(".eye-off-icon");

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      eyeIcon.classList.add("hidden");
      eyeOffIcon.classList.remove("hidden");
    } else {
      passwordInput.type = "password";
      eyeIcon.classList.remove("hidden");
      eyeOffIcon.classList.add("hidden");
    }
  }

  setLoading(loading) {
    this.isLoading = loading;

    // Check if element still exists (modal might be closed)
    if (!this.element) {
      return;
    }

    const form = this.element.querySelector("#loginForm");
    if (!form) {
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll("input");
    const switchButton = this.element.querySelector(".switch-auth");

    if (loading) {
      if (submitButton) submitButton.disabled = true;
      if (switchButton) switchButton.disabled = true;
      inputs.forEach((input) => (input.disabled = true));
      if (submitButton) {
        submitButton.innerHTML = `
          <span class="loading-spinner"></span>
          Prijavljivanje...
        `;
      }
    } else {
      if (submitButton) submitButton.disabled = false;
      if (switchButton) switchButton.disabled = false;
      inputs.forEach((input) => (input.disabled = false));
      if (submitButton) {
        submitButton.innerHTML = "Prijavite se";
      }
    }
  }

  updateErrorDisplay(fieldName) {
    if (fieldName === "general") {
      const errorElement = this.element.querySelector(".general-error");
      if (this.state.errors.general) {
        if (!errorElement) {
          const submitButton = this.element.querySelector(
            'button[type="submit"]'
          );
          const errorDiv = document.createElement("div");
          errorDiv.className = "error-message general-error";
          errorDiv.textContent = this.state.errors.general;
          submitButton.parentNode.insertBefore(errorDiv, submitButton);
        } else {
          errorElement.textContent = this.state.errors.general;
        }
      } else if (errorElement) {
        errorElement.remove();
      }
      return;
    }

    const field = this.element.querySelector(`[name="${fieldName}"]`);
    if (!field) return;

    const formGroup = field.closest(".form-group");
    let errorElement = formGroup.querySelector(".error-message");

    if (this.state.errors[fieldName]) {
      if (!errorElement) {
        errorElement = document.createElement("div");
        errorElement.className = "error-message";
        formGroup.appendChild(errorElement);
      }
      errorElement.textContent = this.state.errors[fieldName];
      field.classList.add("error");
    } else {
      if (errorElement) {
        errorElement.remove();
      }
      field.classList.remove("error");
    }
  }

  reset() {
    this.state = {
      email: "",
      password: "",
      rememberMe: false,
      errors: {},
    };

    if (this.element) {
      const form = this.element.querySelector("#loginForm");
      if (form) {
        form.reset();
        // Clear all error displays
        const errorElements = this.element.querySelectorAll(".error-message");
        errorElements.forEach((el) => el.remove());

        const errorInputs = this.element.querySelectorAll(".error");
        errorInputs.forEach((input) => input.classList.remove("error"));
      }
    }

    this.setLoading(false);
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
