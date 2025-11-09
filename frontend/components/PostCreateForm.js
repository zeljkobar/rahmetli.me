import { api } from "../utils/api.js";
import {
  validateRequired,
  validateLength,
  validateDate,
  validateFullName,
} from "../utils/validation.js";

export class PostCreateForm {
  constructor(onSuccess, onCancel) {
    this.onSuccess = onSuccess;
    this.onCancel = onCancel;
    this.element = null;
    this.isLoading = false;
    this.uploadedImages = [];
    this.categories = [];
    this.cemeteries = [];

    this.state = {
      // Osnovni podaci
      first_name: "",
      last_name: "",
      date_of_birth: "",
      date_of_death: "",
      gender: "male",
      biography: "",

      // Lokacija i pogreb
      cemetery_id: "",
      burial_date: "",
      burial_time: "",

      // Kategorija i status
      category_slug: "dzenaza",
      is_featured: false,

      // Custom HTML za dodatne informacije
      custom_html: "",

      errors: {},
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleImageUpload = this.handleImageUpload.bind(this);
    this.removeImage = this.removeImage.bind(this);
  }

  async render() {
    // Load categories and cemeteries first
    await this.loadFormData();

    this.element = document.createElement("div");
    this.element.className = "post-create-modal";
    this.element.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h2>Nova objava</h2>
            <p>Dodajte informacije o preminuloj osobi</p>
            <button class="modal-close-btn" type="button" aria-label="Zatvori">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <form class="post-create-form" id="postCreateForm">
            <div class="form-sections">
              
              <!-- Osnovni podaci -->
              <div class="form-section">
                <h3>Osnovni podaci</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label for="firstName">Ime *</label>
                    <input 
                      type="text" 
                      id="firstName" 
                      name="first_name" 
                      value="${this.state.first_name}"
                      placeholder="Unesite ime"
                      required
                    >
                    ${this.renderFieldError("first_name")}
                  </div>
                  
                  <div class="form-group">
                    <label for="lastName">Prezime *</label>
                    <input 
                      type="text" 
                      id="lastName" 
                      name="last_name" 
                      value="${this.state.last_name}"
                      placeholder="Unesite prezime"
                      required
                    >
                    ${this.renderFieldError("last_name")}
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="dateOfBirth">Datum rođenja</label>
                    <input 
                      type="date" 
                      id="dateOfBirth" 
                      name="date_of_birth" 
                      value="${this.state.date_of_birth}"
                    >
                    ${this.renderFieldError("date_of_birth")}
                  </div>
                  
                  <div class="form-group">
                    <label for="dateOfDeath">Datum smrti *</label>
                    <input 
                      type="date" 
                      id="dateOfDeath" 
                      name="date_of_death" 
                      value="${this.state.date_of_death}"
                      required
                    >
                    ${this.renderFieldError("date_of_death")}
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="gender">Pol *</label>
                  <select id="gender" name="gender" required>
                    <option value="male" ${
                      this.state.gender === "male" ? "selected" : ""
                    }>Muški</option>
                    <option value="female" ${
                      this.state.gender === "female" ? "selected" : ""
                    }>Ženski</option>
                  </select>
                  ${this.renderFieldError("gender")}
                </div>
              </div>
              
              <!-- Biografija -->
              <div class="form-section">
                <h3>Biografija</h3>
                <div class="form-group">
                  <label for="biography">Kratka biografija</label>
                  <textarea 
                    id="biography" 
                    name="biography" 
                    rows="5"
                    placeholder="Opišite život i dela preminule osobe..."
                  >${this.state.biography}</textarea>
                  <small class="form-hint">Opcionalno - kratki opis života, porodice, karijere</small>
                  ${this.renderFieldError("biography")}
                </div>
              </div>
              
              <!-- Pogreb i lokacija -->
              <div class="form-section">
                <h3>Pogreb i lokacija</h3>
                <div class="form-group">
                  <label for="cemetery">Mezaristan</label>
                  <select id="cemetery" name="cemetery_id">
                    <option value="">Odaberite mezaristan</option>
                    ${this.renderCemeteryOptions()}
                  </select>
                  ${this.renderFieldError("cemetery_id")}
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="burialDate">Datum pogreba</label>
                    <input 
                      type="date" 
                      id="burialDate" 
                      name="burial_date" 
                      value="${this.state.burial_date}"
                    >
                    ${this.renderFieldError("burial_date")}
                  </div>
                  
                  <div class="form-group">
                    <label for="burialTime">Vreme pogreba</label>
                    <input 
                      type="time" 
                      id="burialTime" 
                      name="burial_time" 
                      value="${this.state.burial_time}"
                    >
                    ${this.renderFieldError("burial_time")}
                  </div>
                </div>
              </div>
              
              <!-- Kategorija -->
              <div class="form-section">
                <h3>Tip objave</h3>
                <div class="form-group">
                  <label for="category">Kategorija *</label>
                  <select id="category" name="category_slug" required>
                    ${this.renderCategoryOptions()}
                  </select>
                  ${this.renderFieldError("category_slug")}
                </div>
              </div>
              
              <!-- Slike -->
              <div class="form-section">
                <h3>Slike</h3>
                <div class="form-group">
                  <label>Dodaj slike</label>
                  <div class="image-upload-area">
                    <input type="file" id="imageUpload" multiple accept="image/*" style="display: none;">
                    <button type="button" class="upload-btn" onclick="document.getElementById('imageUpload').click()">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                      Odaberite slike
                    </button>
                    <p class="upload-hint">PNG, JPG do 5MB po slici</p>
                  </div>
                  
                  <div class="uploaded-images" id="uploadedImages">
                    ${this.renderUploadedImages()}
                  </div>
                  ${this.renderFieldError("images")}
                </div>
              </div>
              
              <!-- Dodatne informacije -->
              <div class="form-section">
                <h3>Dodatne informacije</h3>
                <div class="form-group">
                  <label for="customHtml">Dodatni sadržaj</label>
                  <textarea 
                    id="customHtml" 
                    name="custom_html" 
                    rows="4"
                    placeholder="Dodatne informacije, citate iz Kurana, dovu..."
                  >${this.state.custom_html}</textarea>
                  <small class="form-hint">Opcionalno - možete dodati ayete, dove, ili druge informacije</small>
                  ${this.renderFieldError("custom_html")}
                </div>
              </div>
            </div>
            
            ${
              this.state.errors.general
                ? `<div class="error-message general-error">${this.state.errors.general}</div>`
                : ""
            }
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" id="cancelBtn">
                Otkaži
              </button>
              <button type="submit" class="btn btn-primary" ${
                this.isLoading ? "disabled" : ""
              }>
                ${
                  this.isLoading
                    ? `
                  <span class="loading-spinner"></span>
                  Objavljujem...
                `
                    : "Objavi"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachEventListeners();
    return this.element;
  }

  async loadFormData() {
    try {
      // Load categories and cemeteries in parallel
      const [categoriesResponse, cemeteriesResponse] = await Promise.all([
        api.getCategories(),
        api.getCemeteries(),
      ]);

      // Backend returns {categories: [...]} format
      if (categoriesResponse.categories) {
        this.categories = categoriesResponse.categories;
      }

      // Backend returns {cemeteries: [...]} format  
      if (cemeteriesResponse.cemeteries) {
        this.cemeteries = cemeteriesResponse.cemeteries;
      }
    } catch (error) {
      console.error("Failed to load form data:", error);
      this.state.errors.general = "Greška pri učitavanju podataka";
    }
  }

  renderCategoryOptions() {
    return this.categories
      .map(
        (category) => `
      <option value="${category.slug}" ${
          this.state.category_slug === category.slug ? "selected" : ""
        }>
        ${category.name}
      </option>
    `
      )
      .join("");
  }

  renderCemeteryOptions() {
    return this.cemeteries
      .map(
        (cemetery) => `
      <option value="${cemetery.id}" ${
          this.state.cemetery_id == cemetery.id ? "selected" : ""
        }>
        ${cemetery.name} - ${cemetery.city}
      </option>
    `
      )
      .join("");
  }

  renderFieldError(fieldName) {
    return this.state.errors[fieldName]
      ? `<div class="error-message">${this.state.errors[fieldName]}</div>`
      : "";
  }

  renderUploadedImages() {
    if (this.uploadedImages.length === 0) {
      return '<p class="no-images">Nema dodanih slika</p>';
    }

    return this.uploadedImages
      .map(
        (image, index) => `
      <div class="uploaded-image" data-index="${index}">
        <img src="${image.url}" alt="Uploaded image ${index + 1}">
        <button type="button" class="remove-image" data-index="${index}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `
      )
      .join("");
  }

  attachEventListeners() {
    const form = this.element.querySelector("#postCreateForm");
    const closeBtn = this.element.querySelector(".modal-close-btn");
    const cancelBtn = this.element.querySelector("#cancelBtn");
    const imageUpload = this.element.querySelector("#imageUpload");
    const overlay = this.element.querySelector(".modal-overlay");

    // Form submission
    form.addEventListener("submit", this.handleSubmit);

    // Input changes
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      input.addEventListener("input", this.handleInputChange);
      input.addEventListener("blur", this.handleInputChange);
    });

    // Image upload
    if (imageUpload) {
      imageUpload.addEventListener("change", this.handleImageUpload);
    }

    // Close modal
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.close());
    }

    // Close on overlay click
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          this.close();
        }
      });
    }

    // Close on Escape
    this.handleKeyDown = (e) => {
      if (e.key === "Escape") {
        this.close();
      }
    };
    document.addEventListener("keydown", this.handleKeyDown);

    // Prevent body scroll
    document.body.style.overflow = "hidden";
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

    // Real-time validation on blur
    if (e.type === "blur") {
      this.validateField(name, value);
    }
  }

  validateField(fieldName, value) {
    let result = { isValid: true };

    switch (fieldName) {
      case "first_name":
      case "last_name":
        result = validateRequired(
          value,
          fieldName === "first_name" ? "Ime" : "Prezime"
        );
        if (result.isValid) {
          result = validateFullName(value);
        }
        break;

      case "date_of_death":
        result = validateRequired(value, "Datum smrti");
        if (result.isValid) {
          result = validateDate(value, { maxDate: "today", required: true });
        }
        break;

      case "date_of_birth":
        if (value) {
          result = validateDate(value, {
            maxDate: "today",
            minAge: true,
            fieldName: "birth",
          });
        }
        break;

      case "biography":
        if (value) {
          result = validateLength(value, 10, 2000, "Biografija");
        }
        break;

      case "category_slug":
        result = validateRequired(value, "Kategorija");
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

    // Required fields validation
    const requiredFields = [
      "first_name",
      "last_name",
      "date_of_death",
      "category_slug",
    ];

    for (const field of requiredFields) {
      if (!this.validateField(field, this.state[field])) {
        isValid = false;
      }
    }

    // Optional fields validation
    if (
      this.state.date_of_birth &&
      !this.validateField("date_of_birth", this.state.date_of_birth)
    ) {
      isValid = false;
    }

    if (
      this.state.biography &&
      !this.validateField("biography", this.state.biography)
    ) {
      isValid = false;
    }

    return isValid;
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (this.isLoading) return;

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    this.setLoading(true);

    try {
      const postData = {
        first_name: this.state.first_name.trim(),
        last_name: this.state.last_name.trim(),
        date_of_birth: this.state.date_of_birth || null,
        date_of_death: this.state.date_of_death,
        gender: this.state.gender,
        biography: this.state.biography.trim() || null,
        cemetery_id: this.state.cemetery_id || null,
        burial_date: this.state.burial_date || null,
        burial_time: this.state.burial_time || null,
        category_slug: this.state.category_slug,
        custom_html: this.state.custom_html.trim() || null,
        images: this.uploadedImages,
      };

      const response = await api.createPost(postData);

      if (response.success) {
        this.close();
        if (this.onSuccess) {
          this.onSuccess(response.data);
        }
      } else {
        this.state.errors.general =
          response.message || "Greška pri kreiranju objave";
        this.updateErrorDisplay("general");
      }
    } catch (error) {
      console.error("Post creation error:", error);
      this.state.errors.general = "Došlo je do greške. Pokušajte ponovo.";
      this.updateErrorDisplay("general");
    } finally {
      this.setLoading(false);
    }
  }

  handleImageUpload(e) {
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      // Validate file
      if (!file.type.startsWith("image/")) {
        this.state.errors.images = "Možete dodati samo slike";
        this.updateErrorDisplay("images");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        this.state.errors.images = "Slika ne može biti veća od 5MB";
        this.updateErrorDisplay("images");
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImages.push({
          file: file,
          url: e.target.result,
          name: file.name,
        });

        // Update UI
        this.updateUploadedImages();

        // Clear errors
        if (this.state.errors.images) {
          this.state.errors.images = "";
          this.updateErrorDisplay("images");
        }
      };
      reader.readAsDataURL(file);
    });

    // Clear input
    e.target.value = "";
  }

  removeImage(e) {
    const index = parseInt(e.target.closest(".remove-image").dataset.index);
    this.uploadedImages.splice(index, 1);
    this.updateUploadedImages();
  }

  updateUploadedImages() {
    const container = this.element.querySelector("#uploadedImages");
    if (container) {
      container.innerHTML = this.renderUploadedImages();

      // Reattach remove listeners
      const removeButtons = container.querySelectorAll(".remove-image");
      removeButtons.forEach((btn) => {
        btn.addEventListener("click", this.removeImage);
      });
    }
  }

  updateErrorDisplay(fieldName) {
    if (fieldName === "general") {
      const errorElement = this.element.querySelector(".general-error");
      if (this.state.errors.general) {
        if (!errorElement) {
          const formActions = this.element.querySelector(".form-actions");
          const errorDiv = document.createElement("div");
          errorDiv.className = "error-message general-error";
          errorDiv.textContent = this.state.errors.general;
          formActions.parentNode.insertBefore(errorDiv, formActions);
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

  setLoading(loading) {
    this.isLoading = loading;

    const submitButton = this.element.querySelector('button[type="submit"]');
    const inputs = this.element.querySelectorAll(
      "input, select, textarea, button"
    );

    if (loading) {
      submitButton.disabled = true;
      inputs.forEach((input) => (input.disabled = true));
      submitButton.innerHTML = `
        <span class="loading-spinner"></span>
        Objavljujem...
      `;
    } else {
      submitButton.disabled = false;
      inputs.forEach((input) => (input.disabled = false));
      submitButton.innerHTML = "Objavi";
    }
  }

  close() {
    // Remove event listeners
    if (this.handleKeyDown) {
      document.removeEventListener("keydown", this.handleKeyDown);
    }

    // Restore body scroll
    document.body.style.overflow = "";

    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;

    // Call cancel callback
    if (this.onCancel) {
      this.onCancel();
    }
  }

  destroy() {
    this.close();
  }
}
