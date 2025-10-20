import { api } from "../utils/api.js";
import { validatePassword, validateRequired } from "../utils/validation.js";

export class ChangePassword {
  constructor(onSuccess) {
    this.onSuccess = onSuccess;
    this.element = null;
    this.isLoading = false;
    this.state = {
      current_password: "",
      new_password: "",
      confirm_password: "",
      errors: {},
    };
  }

  async render() {
    this.element = document.createElement("div");
    this.element.className = "modal modal-overlay";
    this.element.innerHTML = this.getHTML();

    this.attachEventListeners();

    // Focus first input
    setTimeout(() => {
      const firstInput = this.element.querySelector("input");
      if (firstInput) firstInput.focus();
    }, 100);

    return this.element;
  }

  getHTML() {
    return `
      <div class="modal-content change-password-modal">
        <div class="modal-header">
          <h2>Promeni lozinku</h2>
          <button class="modal-close" type="button">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        
        <form class="change-password-form" id="changePasswordForm">
          <div class="form-group">
            <label for="currentPassword">Trenutna lozinka</label>
            <div class="password-input-wrapper">
              <input
                type="password"
                id="currentPassword"
                name="current_password"
                placeholder="Unesite trenutnu lozinku"
                required
              />
              <button type="button" class="password-toggle" data-target="currentPassword">
                <svg class="eye-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg class="eye-off-icon hidden" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <div class="error-message" id="currentPasswordError"></div>
          </div>

          <div class="form-group">
            <label for="newPassword">Nova lozinka</label>
            <div class="password-input-wrapper">
              <input
                type="password"
                id="newPassword"
                name="new_password"
                placeholder="Unesite novu lozinku (minimum 8 karaktera)"
                required
              />
              <button type="button" class="password-toggle" data-target="newPassword">
                <svg class="eye-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg class="eye-off-icon hidden" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <div class="password-strength" id="passwordStrength"></div>
            <div class="error-message" id="newPasswordError"></div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Potvrdi novu lozinku</label>
            <div class="password-input-wrapper">
              <input
                type="password"
                id="confirmPassword"
                name="confirm_password"
                placeholder="Ponovite novu lozinku"
                required
              />
              <button type="button" class="password-toggle" data-target="confirmPassword">
                <svg class="eye-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg class="eye-off-icon hidden" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <div class="error-message" id="confirmPasswordError"></div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-outline cancel-btn">
              Otkaži
            </button>
            <button type="submit" class="btn btn-primary" id="saveBtn">
              <span class="btn-text">Promeni lozinku</span>
              <span class="loading-spinner hidden"></span>
            </button>
          </div>
        </form>
      </div>
    `;
  }

  attachEventListeners() {
    const form = this.element.querySelector("#changePasswordForm");
    const closeBtn = this.element.querySelector(".modal-close");
    const cancelBtn = this.element.querySelector(".cancel-btn");

    // Form submission
    form.addEventListener("submit", (e) => this.handleSubmit(e));

    // Close modal
    closeBtn.addEventListener("click", () => this.close());
    cancelBtn.addEventListener("click", () => this.close());

    // Close on outside click
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });

    // Close on Escape key
    this.handleKeyDown = (e) => {
      if (e.key === "Escape") {
        this.close();
      }
    };
    document.addEventListener("keydown", this.handleKeyDown);

    // Input validation
    const inputs = form.querySelectorAll("input[name]");
    inputs.forEach((input) => {
      input.addEventListener("input", (e) => this.handleInputChange(e));
      input.addEventListener("blur", (e) => this.validateField(e.target.name));
    });

    // Password visibility toggles
    this.element.querySelectorAll(".password-toggle").forEach((toggle) => {
      toggle.addEventListener("click", (e) => this.togglePasswordVisibility(e));
    });
  }

  handleInputChange(e) {
    const { name, value } = e.target;
    this.state[name] = value;

    // Clear error when user starts typing
    if (this.state.errors[name]) {
      this.state.errors[name] = "";
      this.updateErrorDisplay(name);
    }

    // Update password strength for new password
    if (name === "new_password") {
      this.updatePasswordStrength(value);
    }
  }

  validateField(fieldName) {
    const value = this.state[fieldName];
    let result = { isValid: true };

    switch (fieldName) {
      case "current_password":
        result = validateRequired(value);
        break;
      case "new_password":
        result = validateRequired(value);
        if (result.isValid) {
          result = validatePassword(value);
        }
        break;
      case "confirm_password":
        result = validateRequired(value);
        if (result.isValid && value !== this.state.new_password) {
          result = { isValid: false, error: "Lozinke se ne poklapaju" };
        }
        break;
    }

    if (!result.isValid) {
      this.state.errors[fieldName] = result.error;
    } else {
      this.state.errors[fieldName] = "";
    }

    this.updateErrorDisplay(fieldName);
    return result.isValid;
  }

  validateForm() {
    const fields = ["current_password", "new_password", "confirm_password"];
    let isValid = true;

    fields.forEach((field) => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  }

  updateErrorDisplay(fieldName) {
    const errorElement = this.element.querySelector(`#${fieldName}Error`);
    const inputElement = this.element.querySelector(`[name="${fieldName}"]`);

    if (!errorElement || !inputElement) return;

    if (this.state.errors[fieldName]) {
      errorElement.textContent = this.state.errors[fieldName];
      errorElement.style.display = "block";
      inputElement.classList.add("error");
    } else {
      errorElement.textContent = "";
      errorElement.style.display = "none";
      inputElement.classList.remove("error");
    }
  }

  updatePasswordStrength(password) {
    const strengthElement = this.element.querySelector("#passwordStrength");
    if (!strengthElement) return;

    if (!password) {
      strengthElement.innerHTML = "";
      return;
    }

    const result = validatePassword(password);
    let strength = "weak";
    let color = "#ff4444";

    if (result.strength === "medium") {
      strength = "srednja";
      color = "#ffaa00";
    } else if (result.strength === "strong") {
      strength = "jaka";
      color = "#44aa44";
    } else {
      strength = "slaba";
    }

    strengthElement.innerHTML = `
      <div class="strength-indicator">
        <div class="strength-bar">
          <div class="strength-fill strength-${result.strength}" style="background-color: ${color}"></div>
        </div>
        <span class="strength-text">Snaga lozinke: ${strength}</span>
      </div>
    `;
  }

  togglePasswordVisibility(e) {
    const toggle = e.currentTarget;
    const targetId = toggle.dataset.target;
    const input = this.element.querySelector(`#${targetId}`);
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

  async handleSubmit(e) {
    e.preventDefault();

    if (this.isLoading) return;

    if (!this.validateForm()) {
      return;
    }

    this.setLoading(true);

    try {
      const response = await api.put("/users/me/password", {
        current_password: this.state.current_password,
        new_password: this.state.new_password,
      });

      // Success
      if (this.onSuccess) {
        this.onSuccess();
      }

      // Show success message
      const successDiv = document.createElement("div");
      successDiv.className = "success-message";
      successDiv.textContent = "Lozinka je uspešno promenjena!";

      const formActions = this.element.querySelector(".form-actions");
      formActions.parentNode.insertBefore(successDiv, formActions);

      // Close modal after 2 seconds
      setTimeout(() => {
        this.close();
      }, 2000);
    } catch (error) {
      console.error("Change password error:", error);

      // Display error
      const errorMessage =
        error.message || "Došlo je do greške. Pokušajte ponovo.";
      const generalError = this.element.querySelector(".general-error");

      if (generalError) {
        generalError.remove();
      }

      const errorDiv = document.createElement("div");
      errorDiv.className = "error-message general-error";
      errorDiv.textContent = errorMessage;

      const formActions = this.element.querySelector(".form-actions");
      formActions.parentNode.insertBefore(errorDiv, formActions);
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(loading) {
    this.isLoading = loading;

    const saveBtn = this.element.querySelector("#saveBtn");
    const btnText = saveBtn.querySelector(".btn-text");
    const spinner = saveBtn.querySelector(".loading-spinner");
    const inputs = this.element.querySelectorAll("input");

    if (loading) {
      saveBtn.disabled = true;
      btnText.textContent = "Menjanje...";
      spinner.classList.remove("hidden");
      inputs.forEach((input) => (input.disabled = true));
    } else {
      saveBtn.disabled = false;
      btnText.textContent = "Promeni lozinku";
      spinner.classList.add("hidden");
      inputs.forEach((input) => (input.disabled = false));
    }
  }

  close() {
    if (this.handleKeyDown) {
      document.removeEventListener("keydown", this.handleKeyDown);
    }

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  destroy() {
    this.close();
  }
}
