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

      // Family members (ožalošćeni)
      family_members: [
        { relationship: "supruga", name: "" },
        { relationship: "sin", name: "" },
        { relationship: "kćerka", name: "" },
      ],

      errors: {},
    };

    // Workflow states
    this.currentStep = "form"; // "form" | "preview" | "edit"
    this.generatedPreview = "";
    this.editedHtml = "";

    // Bind additional methods
    this.showPreview = this.showPreview.bind(this);
    this.showEditMode = this.showEditMode.bind(this);
    this.backToForm = this.backToForm.bind(this);
    this.saveAndPublish = this.saveAndPublish.bind(this);

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
          ${this.renderModalContent()}
        </div>
      </div>
    `;

    this.attachModalEventListeners();
    return this.element;
  }

  renderModalContent() {
    switch (this.currentStep) {
      case "preview":
        return this.renderPreviewStep();
      case "edit":
        return this.renderEditStep();
      default:
        return this.renderFormStep();
    }
  }

  renderFormStep() {
    return `
          <div class="modal-header">
            <h2>Nova objava - Korak 1</h2>
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
              
              <!-- Ožalošćeni -->
              <div class="form-section">
                <h3>Ožalošćeni</h3>
                <p class="section-hint">Unesite imena članova porodice koji žale preminulu osobu</p>
                ${this.renderFamilyMembers()}
                <button type="button" class="btn btn-outline btn-sm" id="addFamilyMember">
                  + Dodaj člana porodice
                </button>
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
              <button type="button" class="btn btn-primary" id="previewBtn" ${
                this.isLoading ? "disabled" : ""
              }>
                ${
                  this.isLoading
                    ? `<span class="loading-spinner"></span> Generišem...`
                    : "Generiši preview"
                }
              </button>
            </div>
          </form>
    `;
  }

  renderPreviewStep() {
    return `
          <div class="modal-header">
            <h2>Nova objava - Korak 2: Preview</h2>
            <p>Pregledajte kako će umrlica izgledati</p>
            <button class="modal-close-btn" type="button" aria-label="Zatvori">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="preview-content">
            <div class="preview-container">
              ${this.generatedPreview}
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" id="backToFormBtn">
                Nazad na formu
              </button>
              <button type="button" class="btn btn-outline" id="editHtmlBtn">
                Edituj HTML
              </button>
              <button type="button" class="btn btn-primary" id="publishBtn">
                Objavi ovako
              </button>
            </div>
          </div>
    `;
  }

  renderEditStep() {
    return `
          <div class="modal-header">
            <h2>Nova objava - Korak 3: Edituj HTML</h2>
            <p>Prilagodite izgled umrlice</p>
            <button class="modal-close-btn" type="button" aria-label="Zatvori">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="edit-content">
            <div class="edit-layout">
              <div class="html-editor">
                <h4>HTML Editor</h4>
                <textarea id="htmlEditor" rows="20" cols="50">${this.editedHtml}</textarea>
              </div>
              
              <div class="live-preview">
                <h4>Live Preview</h4>
                <div class="preview-container" id="livePreview">
                  ${this.editedHtml}
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" id="backToPreviewBtn">
                Nazad na preview
              </button>
              <button type="button" class="btn btn-primary" id="savePublishBtn">
                Sačuvaj i objavi
              </button>
            </div>
          </div>
    `;
  }

  attachModalEventListeners() {
    // Common close button
    const closeBtn = this.element.querySelector(".modal-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    // Step-specific event listeners
    switch (this.currentStep) {
      case "form":
        this.attachFormEventListeners();
        break;
      case "preview":
        this.attachPreviewEventListeners();
        break;
      case "edit":
        this.attachEditEventListeners();
        break;
    }
  }

  attachFormEventListeners() {
    const form = this.element.querySelector("#postCreateForm");
    const cancelBtn = this.element.querySelector("#cancelBtn");
    const previewBtn = this.element.querySelector("#previewBtn");
    const addFamilyBtn = this.element.querySelector("#addFamilyMember");

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.showPreview();
      });

      // Input change listeners
      const inputs = form.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        input.addEventListener("input", this.handleInputChange);
        input.addEventListener("change", this.handleInputChange);
      });

      // Family member input listeners
      form.addEventListener("input", (e) => {
        if (e.target.name && e.target.name.startsWith("family_")) {
          this.handleFamilyMemberChange(e);
        }
      });

      form.addEventListener("change", (e) => {
        if (e.target.name && e.target.name.startsWith("family_")) {
          this.handleFamilyMemberChange(e);
        }
      });

      // Remove family member listeners
      form.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-family-member")) {
          const index = parseInt(e.target.dataset.index);
          this.removeFamilyMember(index);
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.close());
    }

    if (previewBtn) {
      previewBtn.addEventListener("click", () => this.showPreview());
    }

    if (addFamilyBtn) {
      addFamilyBtn.addEventListener("click", () => this.addFamilyMember());
    }
  }

  attachPreviewEventListeners() {
    const backBtn = this.element.querySelector("#backToFormBtn");
    const editBtn = this.element.querySelector("#editHtmlBtn");
    const publishBtn = this.element.querySelector("#publishBtn");

    if (backBtn) {
      backBtn.addEventListener("click", this.backToForm);
    }

    if (editBtn) {
      editBtn.addEventListener("click", this.showEditMode);
    }

    if (publishBtn) {
      publishBtn.addEventListener("click", this.saveAndPublish);
    }
  }

  attachEditEventListeners() {
    const backBtn = this.element.querySelector("#backToPreviewBtn");
    const saveBtn = this.element.querySelector("#savePublishBtn");
    const htmlEditor = this.element.querySelector("#htmlEditor");
    const livePreview = this.element.querySelector("#livePreview");

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.currentStep = "preview";
        this.rerenderModal();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", this.saveAndPublish);
    }

    if (htmlEditor && livePreview) {
      htmlEditor.addEventListener("input", (e) => {
        this.editedHtml = e.target.value;
        livePreview.innerHTML = this.editedHtml;
      });
    }
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

  renderFamilyMembers() {
    return this.state.family_members
      .map(
        (member, index) => `
      <div class="family-member-row" data-index="${index}">
        <div class="form-row">
          <div class="form-group">
            <select name="family_relationship_${index}" class="family-relationship">
              <option value="supruga" ${
                member.relationship === "supruga" ? "selected" : ""
              }>Supruga</option>
              <option value="suprug" ${
                member.relationship === "suprug" ? "selected" : ""
              }>Suprug</option>
              <option value="sin" ${
                member.relationship === "sin" ? "selected" : ""
              }>Sin</option>
              <option value="kćerka" ${
                member.relationship === "kćerka" ? "selected" : ""
              }>Kćerka</option>
              <option value="otac" ${
                member.relationship === "otac" ? "selected" : ""
              }>Otac</option>
              <option value="majka" ${
                member.relationship === "majka" ? "selected" : ""
              }>Majka</option>
              <option value="brat" ${
                member.relationship === "brat" ? "selected" : ""
              }>Brat</option>
              <option value="sestra" ${
                member.relationship === "sestra" ? "selected" : ""
              }>Sestra</option>
              <option value="unuk" ${
                member.relationship === "unuk" ? "selected" : ""
              }>Unuk</option>
              <option value="unuka" ${
                member.relationship === "unuka" ? "selected" : ""
              }>Unuka</option>
              <option value="ostalo" ${
                member.relationship === "ostalo" ? "selected" : ""
              }>Ostalo</option>
            </select>
          </div>
          <div class="form-group">
            <input 
              type="text" 
              name="family_name_${index}"
              value="${member.name}"
              placeholder="Ime člana porodice"
            >
          </div>
          <div class="form-group">
            <button type="button" class="btn btn-secondary btn-sm remove-family-member" data-index="${index}">
              Ukloni
            </button>
          </div>
        </div>
      </div>
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

  handleFamilyMemberChange(e) {
    const { name, value } = e.target;
    const [type, field, indexStr] = name.split("_");
    const index = parseInt(indexStr);

    if (field === "relationship") {
      this.state.family_members[index].relationship = value;
    } else if (field === "name") {
      this.state.family_members[index].name = value;
    }
  }

  addFamilyMember() {
    this.state.family_members.push({
      relationship: "ostalo",
      name: "",
    });
    this.rerenderFamilyMembers();
  }

  removeFamilyMember(index) {
    this.state.family_members.splice(index, 1);
    this.rerenderFamilyMembers();
  }

  rerenderFamilyMembers() {
    const container = this.element.querySelector(
      ".form-section:has(#addFamilyMember)"
    );
    if (container) {
      const newContent = `
        <h3>Ožalošćeni</h3>
        <p class="section-hint">Unesite imena članova porodice koji žale preminulu osobu</p>
        ${this.renderFamilyMembers()}
        <button type="button" class="btn btn-outline btn-sm" id="addFamilyMember">
          + Dodaj člana porodice
        </button>
      `;
      container.innerHTML = newContent;

      // Reattach listeners for new button
      const addBtn = container.querySelector("#addFamilyMember");
      if (addBtn) {
        addBtn.addEventListener("click", () => this.addFamilyMember());
      }

      // Reattach listeners for remove buttons
      container.querySelectorAll(".remove-family-member").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const index = parseInt(e.target.dataset.index);
          this.removeFamilyMember(index);
        });
      });
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

    // Check if element exists before proceeding
    if (!this.element) {
      console.warn('PostCreateForm: Element not found in setLoading');
      return;
    }

    // Find the appropriate action button based on current step
    let actionButton;
    const inputs = this.element.querySelectorAll(
      "input, select, textarea, button"
    );

    switch (this.currentStep) {
      case "form":
        actionButton = this.element.querySelector("#previewBtn");
        break;
      case "preview":
        actionButton = this.element.querySelector("#publishBtn");
        break;
      case "edit":
        actionButton = this.element.querySelector("#savePublishBtn");
        break;
    }

    if (loading) {
      if (actionButton) {
        actionButton.disabled = true;
        actionButton.innerHTML = `
          <span class="loading-spinner"></span>
          ${this.currentStep === "form" ? "Generišem..." : "Objavljujem..."}
        `;
      }
      inputs.forEach((input) => (input.disabled = true));
    } else {
      if (actionButton) {
        actionButton.disabled = false;
        switch (this.currentStep) {
          case "form":
            actionButton.innerHTML = "Generiši preview";
            break;
          case "preview":
            actionButton.innerHTML = "Objavi ovako";
            break;
          case "edit":
            actionButton.innerHTML = "Sačuvaj i objavi";
            break;
        }
      }
      inputs.forEach((input) => (input.disabled = false));
    }
  }

  // Generate preview HTML based on form data
  generatePreviewHTML() {
    const fullName = `${this.state.first_name} ${this.state.last_name}`.trim();
    const deathDate = this.formatDateForDisplay(this.state.date_of_death);
    const burialDate = this.formatDateForDisplay(
      this.state.burial_date || this.state.date_of_death
    );
    const burialTime = this.state.burial_time || "13:00";
    const age = this.calculateAge(
      this.state.date_of_birth,
      this.state.date_of_death
    );

    const selectedCemetery = this.cemeteries.find(
      (c) => c.id == this.state.cemetery_id
    );
    const cemeteryName = selectedCemetery
      ? selectedCemetery.name
      : "Mezaristan Belveder";

    return `
      <article class="obituary-card preview-card" data-post-id="preview">
        <div class="obituary-frame">
          <div class="obituary-content">
            <div class="obituary-header">
              <div class="crescent-moon">☪</div>
              <img src="images/arabic-calligraphy.png" alt="الرَّحْمَنُ الرَّحِيمُ" class="arabic-calligraphy-image">
            </div>
            
            <div class="obituary-body">
              <div class="death-announcement">
                Dana <strong>${deathDate}</strong> god.${
      age ? ` u <strong>${age}</strong> godini života` : ""
    } preseli${this.state.gender === "female" ? "la" : "o"} je na ahiret
              </div>
              
              <div class="deceased-name">
                ${fullName.toUpperCase()}
              </div>
              
              <div class="funeral-info">
                <div class="funeral-detail">
                  <strong>Dženaza se prima:</strong> ${burialDate} god. u ${burialTime} sati od IKC Bar
                </div>
                <div class="burial-detail">
                  <strong>Ukop će se obaviti na groblju:</strong> ${cemeteryName}
                </div>
              </div>

              ${
                this.state.biography
                  ? `
                <div class="biography-section">
                  <div class="obituary-separator"></div>
                  <p>${this.state.biography}</p>
                </div>
              `
                  : ""
              }

              <div class="family-section">
                <div class="obituary-separator"></div>
                ${this.renderFamilyMembersPreview()}
                <div class="condolences-text">
                  RAHMETULLAHI ALEJHI RAHMETEN VASIAH
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  formatDateForDisplay(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  renderFamilyMembersPreview() {
    const validMembers = this.state.family_members.filter((m) => m.name.trim());
    if (validMembers.length === 0) return "";

    return `
      <div class="family-members">
        <p><strong>Ožalošćeni:</strong></p>
        <div class="family-list">
          ${validMembers
            .map(
              (member) => `
            <span class="family-member">${member.relationship}: ${member.name}</span>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  async showPreview() {
    // Validate required fields first
    if (!this.validateForm()) {
      return;
    }

    this.currentStep = "preview";
    this.generatedPreview = this.generatePreviewHTML();
    this.rerenderModal();
  }

  showEditMode() {
    this.currentStep = "edit";
    this.editedHtml = this.generatedPreview;
    this.rerenderModal();
  }

  backToForm() {
    this.currentStep = "form";
    this.rerenderModal();
  }

  collectFormData() {
    // Filter valid family members
    const validFamilyMembers = this.state.family_members.filter((m) =>
      m.name.trim()
    );
    const deceasedName =
      `${this.state.first_name} ${this.state.last_name}`.trim();

    // Generate content with minimum 20 characters
    const defaultContent = `Umrlica za ${deceasedName}. Dženaza se prima dana ${
      this.state.burial_date || this.state.date_of_death
    } u ${
      this.state.burial_time || "13:00"
    } časova u IKC Bar. Sahrana će se obaviti na ${this.getCemeteryName(
      this.state.cemetery_id
    )}.`;

    const content =
      this.state.biography && this.state.biography.trim().length >= 20
        ? this.state.biography.trim()
        : defaultContent;

    return {
      // Deceased info
      deceased_name: deceasedName,
      deceased_birth_date: this.state.date_of_birth || null,
      deceased_death_date: this.state.date_of_death,
      deceased_age: this.calculateAge(
        this.state.date_of_birth,
        this.state.date_of_death
      ),
      deceased_gender: this.state.gender,

      // Funeral info - match database schema
      dzenaza_date: this.state.burial_date || this.state.date_of_death,
      dzenaza_time: this.state.burial_time || "13:00",
      dzenaza_location: "IKC Bar",
      burial_cemetery: this.getCemeteryName(this.state.cemetery_id),
      burial_location: null,

      // Categories and metadata
      category_id: this.getCategoryId(this.state.category_slug),
      cemetery_id: this.state.cemetery_id,
      family_members: validFamilyMembers, // Send as array
      is_featured: this.state.is_featured || false,
      status: "pending", // Will be reviewed by admin
      
      // HTML content - will be added in saveAndPublish
      generated_html: null,
      custom_html: null,
      is_custom_edited: false
    };
  }

  getCemeteryName(cemeteryId) {
    const cemetery = this.cemeteries.find((c) => c.id == cemeteryId);
    return cemetery ? cemetery.name : "Nepoznato groblje";
  }

  getCategoryId(categorySlug) {
    const category = this.categories.find((c) => c.slug === categorySlug);
    return category ? category.id : 1; // Default to "Dženaza"
  }

  calculateAge(birthDate, deathDate) {
    if (!birthDate || !deathDate) return null;

    const birth = new Date(birthDate);
    const death = new Date(deathDate);

    if (death < birth) return null;

    let age = death.getFullYear() - birth.getFullYear();
    const monthDiff = death.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && death.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }

  formatDateTimeForBackend(date, time) {
    if (!date) return null;

    // If time is provided, combine with date, otherwise use default time
    const timeStr = time || "13:00";
    return `${date}T${timeStr}:00.000Z`;
  }

  async saveAndPublish() {
    try {
      this.setLoading(true);

      // Use edited HTML if available, otherwise use generated preview
      const finalHtml = this.editedHtml || this.generatedPreview;

      const postData = this.collectFormData();
      postData.custom_html = finalHtml;
      postData.is_custom_edited = this.editedHtml !== this.generatedPreview;

      console.log('Sending post data:', postData);
      
      const response = await api.createPost(postData);
      
      console.log('API response:', response);

      if (response.success || response.post) {
        this.setLoading(false);
        this.onSuccess?.(response);
        this.close();
        return; // Exit early to avoid setLoading(false) in finally
      } else {
        throw new Error(response.error || "Greška pri kreiranju objave");
      }
    } catch (error) {
      console.error("Save and publish error:", error);
      this.state.errors.general = error.message;
      this.rerenderModal();
      this.setLoading(false);
    }
  }

  rerenderModal() {
    if (!this.element) return;

    const modalContent = this.element.querySelector(".modal-container");
    if (modalContent) {
      modalContent.innerHTML = this.renderModalContent();
      this.attachModalEventListeners();
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
