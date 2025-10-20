import { api } from "../utils/api.js";
import { validateRequired, validateFullName } from "../utils/validation.js";

export class EditProfile {
  constructor(currentUser, onSuccess) {
    this.currentUser = currentUser;
    this.onSuccess = onSuccess;
    this.element = null;
    this.isLoading = false;
    this.state = {
      full_name: currentUser.full_name || "",
      phone: currentUser.phone || "",
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
      <div class="modal-content edit-profile-modal">
        <div class="modal-header">
          <h2>Uredi profil</h2>
          <button class="modal-close" type="button">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        
        <form class="edit-profile-form" id="editProfileForm">
          <div class="form-group">
            <label for="fullName">Ime i prezime</label>
            <input
              type="text"
              id="fullName"
              name="full_name"
              value="${this.state.full_name}"
              placeholder="Unesite vaše ime i prezime"
              required
            />
            <div class="error-message" id="fullNameError"></div>
          </div>

          <div class="form-group">
            <label for="phone">Telefon (opciono)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value="${this.state.phone}"
              placeholder="npr. +387 61 123 456"
            />
            <div class="error-message" id="phoneError"></div>
          </div>

          <div class="form-group readonly-group">
            <label>Email</label>
            <input
              type="email"
              value="${this.currentUser.email}"
              readonly
              class="readonly"
            />
            <small class="help-text">Email se ne može menjati. Kontaktirajte podršku ako je potrebno.</small>
          </div>

          <div class="form-group readonly-group">
            <label>Korisničko ime</label>
            <input
              type="text"
              value="${this.currentUser.username}"
              readonly
              class="readonly"
            />
            <small class="help-text">Korisničko ime se ne može menjati.</small>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-outline cancel-btn">
              Otkaži
            </button>
            <button type="submit" class="btn btn-primary" id="saveBtn">
              <span class="btn-text">Sačuvaj izmene</span>
              <span class="loading-spinner hidden"></span>
            </button>
          </div>
        </form>
      </div>
    `;
  }

  attachEventListeners() {
    const form = this.element.querySelector("#editProfileForm");
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
  }

  handleInputChange(e) {
    const { name, value } = e.target;
    this.state[name] = value;

    // Clear error when user starts typing
    if (this.state.errors[name]) {
      this.state.errors[name] = "";
      this.updateErrorDisplay(name);
    }
  }

  validateField(fieldName) {
    const value = this.state[fieldName];
    let result = { isValid: true };

    switch (fieldName) {
      case "full_name":
        result = validateRequired(value);
        if (result.isValid) {
          result = validateFullName(value);
        }
        break;
      case "phone":
        // Phone is optional, so only validate format if provided
        if (value && value.trim()) {
          const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
          if (!phoneRegex.test(value)) {
            result = { isValid: false, error: "Neispravna format telefona" };
          }
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
    const fields = ["full_name", "phone"];
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

  async handleSubmit(e) {
    e.preventDefault();

    if (this.isLoading) return;

    if (!this.validateForm()) {
      return;
    }

    this.setLoading(true);

    try {
      const response = await api.put("/users/me/profile", {
        full_name: this.state.full_name.trim(),
        phone: this.state.phone.trim() || null,
      });

      if (response.user) {
        // Success
        if (this.onSuccess) {
          this.onSuccess(response.user);
        }
      } else {
        throw new Error(response.message || "Greška pri ažuriranju profila");
      }
    } catch (error) {
      console.error("Update profile error:", error);

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
      btnText.textContent = "Čuvanje...";
      spinner.classList.remove("hidden");
      inputs.forEach((input) => (input.disabled = true));
    } else {
      saveBtn.disabled = false;
      btnText.textContent = "Sačuvaj izmene";
      spinner.classList.add("hidden");
      inputs.forEach((input) => {
        if (!input.classList.contains("readonly")) {
          input.disabled = false;
        }
      });
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
