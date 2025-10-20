import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateFullName,
  validateRequired,
  debounce,
} from "../utils/validation.js";
import { api } from "../utils/api.js";

export class RegisterForm {
  constructor(onSuccess, onSwitchToLogin) {
    this.onSuccess = onSuccess;
    this.onSwitchToLogin = onSwitchToLogin;
    this.element = null;
    this.isLoading = false;

    this.state = {
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
      errors: {},
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.togglePasswordVisibility = this.togglePasswordVisibility.bind(this);
    this.debouncedValidation = debounce(this.validateField.bind(this), 300);
  }

  render() {
    this.element = document.createElement("div");
    this.element.className = "auth-form register-form";

    this.element.innerHTML = `
      <div class="auth-form-container">
        <div class="auth-header">
          <h2>Registracija</h2>
          <p>Kreirajte svoj nalog na Rahmetli.me</p>
        </div>
        
        <form class="auth-form-fields" id="registerForm">
          <div class="form-group">
            <label for="registerFullName">Puno ime *</label>
            <div class="input-wrapper">
              <input 
                type="text" 
                id="registerFullName" 
                name="fullName" 
                value="${this.state.fullName}"
                placeholder="Vaše puno ime"
                autocomplete="name"
                ${this.isLoading ? "disabled" : ""}
              >
              <div class="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </div>
            ${this.renderFieldError("fullName")}
          </div>
          
          <div class="form-group">
            <label for="registerUsername">Korisničko ime *</label>
            <div class="input-wrapper">
              <input 
                type="text" 
                id="registerUsername" 
                name="username" 
                value="${this.state.username}"
                placeholder="korisnicko_ime"
                autocomplete="username"
                ${this.isLoading ? "disabled" : ""}
              >
              <div class="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
            </div>
            ${this.renderFieldError("username")}
          </div>
          
          <div class="form-group">
            <label for="registerEmail">Email adresa *</label>
            <div class="input-wrapper">
              <input 
                type="email" 
                id="registerEmail" 
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
            ${this.renderFieldError("email")}
          </div>
          
          <div class="form-group">
            <label for="registerPassword">Lozinka *</label>
            <div class="input-wrapper password-input">
              <input 
                type="password" 
                id="registerPassword" 
                name="password" 
                value="${this.state.password}"
                placeholder="••••••••"
                autocomplete="new-password"
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
            ${this.renderFieldError("password")}
            ${this.renderPasswordStrength()}
          </div>
          
          <div class="form-group">
            <label for="registerConfirmPassword">Potvrdite lozinku *</label>
            <div class="input-wrapper password-input">
              <input 
                type="password" 
                id="registerConfirmPassword" 
                name="confirmPassword" 
                value="${this.state.confirmPassword}"
                placeholder="••••••••"
                autocomplete="new-password"
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
            ${this.renderFieldError("confirmPassword")}
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="termsAccepted" 
                name="termsAccepted" 
                ${this.state.termsAccepted ? "checked" : ""}
                ${this.isLoading ? "disabled" : ""}
              >
              <span class="checkbox-custom"></span>
              <span class="checkbox-text terms-text">
                Prihvatam <a href="/uslove-koristenja" target="_blank">uslove korišćenja</a> 
                i <a href="/privatnost" target="_blank">politiku privatnosti</a>
              </span>
            </label>
            ${this.renderFieldError("termsAccepted")}
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
              Registrujem...
            `
                : "Registruj se"
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
            Već imate nalog? Prijavite se
          </button>
        </form>
      </div>
    `;

    // Note: Event listeners will be attached by AuthManager after element is in DOM
    return this.element;
  }

  renderFieldError(fieldName) {
    return this.state.errors[fieldName]
      ? `<div class="error-message">${this.state.errors[fieldName]}</div>`
      : "";
  }

  renderPasswordStrength() {
    if (!this.state.password) return "";

    const validation = validatePassword(this.state.password);
    if (!validation.strength) return "";

    return `
      <div class="password-strength">
        <div class="password-strength-label">Jačina lozinke: ${this.getStrengthLabel(
          validation.strength
        )}</div>
        <div class="password-strength-bar">
          <div class="password-strength-fill ${validation.strength}"></div>
        </div>
      </div>
    `;
  }

  getStrengthLabel(strength) {
    switch (strength) {
      case "weak":
        return "Slaba";
      case "medium":
        return "Srednja";
      case "strong":
        return "Jaka";
      default:
        return "";
    }
  }

  attachEventListeners() {
    if (!this.element) {
      console.warn(
        "RegisterForm: Element not found when attaching event listeners"
      );
      return;
    }

    // Prevent duplicate event listeners
    if (this.element.dataset.listenersAttached === "true") {
      return;
    }

    const form = this.element.querySelector("#registerForm");
    const inputs = this.element.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="password"]'
    );
    const passwordToggles = this.element.querySelectorAll(".password-toggle");
    const switchButton = this.element.querySelector(".switch-auth");
    const termsCheckbox = this.element.querySelector("#termsAccepted");

    if (!form) {
      console.warn("RegisterForm: Form not found");
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

    passwordToggles.forEach((toggle) => {
      toggle.addEventListener("click", this.togglePasswordVisibility);
    });

    if (switchButton && this.onSwitchToLogin) {
      switchButton.addEventListener("click", this.onSwitchToLogin);
    }

    if (termsCheckbox) {
      termsCheckbox.addEventListener("change", (e) => {
        this.state.termsAccepted = e.target.checked;
        if (this.state.errors.termsAccepted) {
          this.state.errors.termsAccepted = "";
          this.updateErrorDisplay("termsAccepted");
        }
      });
    }

    // Focus first input
    setTimeout(() => {
      if (this.element && this.element.isConnected) {
        const firstInput = this.element.querySelector("#registerFullName");
        if (firstInput) firstInput.focus();
      }
    }, 100);
  }

  handleInputChange(e) {
    const { name, value } = e.target;
    this.state[name] = value;

    // Clear field error
    if (this.state.errors[name]) {
      this.state.errors[name] = "";
      this.updateErrorDisplay(name);
    }

    // Clear general error
    if (this.state.errors.general) {
      this.state.errors.general = "";
      this.updateErrorDisplay("general");
    }

    // Real-time validation on blur or for password field
    if (e.type === "blur" || name === "password") {
      this.debouncedValidation(name, value);
    }

    // Update password strength display
    if (name === "password") {
      this.updatePasswordStrength();
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
      case "fullName":
        result = validateRequired(value, "Puno ime");
        if (result.isValid) {
          result = validateFullName(value);
        }
        break;

      case "username":
        result = validateRequired(value, "Korisničko ime");
        if (result.isValid) {
          result = validateUsername(value);
        }
        break;

      case "email":
        result = validateRequired(value, "Email adresa");
        if (result.isValid) {
          result = validateEmail(value)
            ? { isValid: true }
            : { isValid: false, error: "Unesite valjan email" };
        }
        break;

      case "password":
        result = validatePassword(value);
        // validatePassword returns errors array, convert to single error string
        if (!result.isValid && result.errors && result.errors.length > 0) {
          result.error = result.errors[0]; // Take first error
        }
        break;

      case "confirmPassword":
        result = validateRequired(value, "Potvrda lozinke");
        if (result.isValid && value !== this.state.password) {
          result = { isValid: false, error: "Lozinke se ne slažu" };
        }
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

    // Clear previous errors
    this.state.errors = {};

    // Validate all fields
    const fields = [
      "fullName",
      "username",
      "email",
      "password",
      "confirmPassword",
    ];

    for (const field of fields) {
      if (!this.validateField(field, this.state[field])) {
        isValid = false;
      } else {
      }
    }

    // Check terms acceptance
    if (!this.state.termsAccepted) {
      this.state.errors.termsAccepted = "Morate prihvatiti uslove korišćenja";
      this.updateErrorDisplay("termsAccepted");
      isValid = false;
    } else {
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
      const registrationData = {
        full_name: this.state.fullName.trim(),
        username: this.state.username.trim(),
        email: this.state.email.trim().toLowerCase(),
        password: this.state.password,
      };

      const response = await api.register(registrationData);

      if (response.token && response.user) {
        // Store auth data
        localStorage.setItem("auth_token", response.token);
        localStorage.setItem("user_data", JSON.stringify(response.user));

        // Call success callback
        if (this.onSuccess) {
          this.onSuccess({
            token: response.token,
            user: response.user,
          });
        }
      } else {
        this.state.errors.general =
          response.message || response.error || "Greška pri registraciji";
        this.updateErrorDisplay("general");
      }
    } catch (error) {
      console.error("Registration error:", error);
      this.state.errors.general = "Došlo je do greške. Pokušajte ponovo.";
      this.updateErrorDisplay("general");
    } finally {
      this.setLoading(false);
    }
  }

  togglePasswordVisibility(e) {
    const toggle = e.currentTarget;
    const input = toggle.parentElement.querySelector("input");
    const eyeIcon = toggle.querySelector(".eye-icon");
    const eyeOffIcon = toggle.querySelector(".eye-off-icon");

    if (input.type === "password") {
      input.type = "text";
      eyeIcon.classList.add("hidden");
      eyeOffIcon.classList.remove("hidden");
    } else {
      input.type = "password";
      eyeIcon.classList.remove("hidden");
      eyeOffIcon.classList.add("hidden");
    }
  }

  updatePasswordStrength() {
    const passwordGroup = this.element
      .querySelector("#registerPassword")
      .closest(".form-group");
    const existingStrength = passwordGroup.querySelector(".password-strength");

    if (existingStrength) {
      existingStrength.remove();
    }

    if (this.state.password) {
      const strengthHtml = this.renderPasswordStrength();
      if (strengthHtml) {
        const strengthDiv = document.createElement("div");
        strengthDiv.innerHTML = strengthHtml;
        const errorMessage = passwordGroup.querySelector(".error-message");
        if (errorMessage) {
          passwordGroup.insertBefore(
            strengthDiv.firstElementChild,
            errorMessage
          );
        } else {
          passwordGroup.appendChild(strengthDiv.firstElementChild);
        }
      }
    }
  }

  setLoading(loading) {
    this.isLoading = loading;

    // Check if element still exists (modal might be closed)
    if (!this.element) {
      return;
    }

    const form = this.element.querySelector("#registerForm");
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
          Registrujem...
        `;
      }
    } else {
      if (submitButton) submitButton.disabled = false;
      if (switchButton) switchButton.disabled = false;
      inputs.forEach((input) => (input.disabled = false));
      if (submitButton) {
        submitButton.innerHTML = "Registruj se";
      }
    }
  }

  updateErrorDisplay(fieldName) {
    // Add null check for this.element
    if (!this.element) {
      return;
    }

    if (fieldName === "general") {
      const errorElement = this.element.querySelector(".general-error");
      if (this.state.errors.general) {
        if (!errorElement) {
          const submitButton = this.element.querySelector(
            'button[type="submit"]'
          );
          if (submitButton && submitButton.parentNode) {
            const errorDiv = document.createElement("div");
            errorDiv.className = "error-message general-error";
            errorDiv.textContent = this.state.errors.general;
            submitButton.parentNode.insertBefore(errorDiv, submitButton);
          }
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
    if (!formGroup) return;

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
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
      errors: {},
    };

    if (this.element) {
      const form = this.element.querySelector("#registerForm");
      if (form) {
        form.reset();
        // Clear all error displays
        const errorElements = this.element.querySelectorAll(".error-message");
        errorElements.forEach((el) => el.remove());

        const errorInputs = this.element.querySelectorAll(".error");
        errorInputs.forEach((input) => input.classList.remove("error"));

        // Clear password strength
        const strengthElements =
          this.element.querySelectorAll(".password-strength");
        strengthElements.forEach((el) => el.remove());
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
