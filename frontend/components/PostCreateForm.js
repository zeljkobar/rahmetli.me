import { api } from "../utils/api.js";
import {
  validateRequired,
  validateLength,
  validateDate,
  validateFullName,
} from "../utils/validation.js";

export class PostCreateForm {
  constructor(onSuccess, onCancel, existingPost = null) {
    this.onSuccess = onSuccess;
    this.onCancel = onCancel;
    this.existingPost = existingPost; // For editing existing posts
    this.isEditMode = !!existingPost;
    this.element = null;
    this.isLoading = false;
    this.uploadedImages = [];
    this.categories = [];
    this.cemeteries = [];

    this.state = this.initializeState(existingPost);

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

  initializeState(existingPost) {
    // Default state for new post
    const defaultState = {
      // Osnovni podaci
      deceased_name: "",
      date_of_birth: "",
      date_of_death: "",
      gender: "male",
      biography: "",

      // Lokacija i pogreb
      cemetery_id: "",
      is_new_cemetery: false,
      new_cemetery_name: "",
      new_cemetery_city: "",
      burial_date: "",
      burial_time: "",

      // Kategorija i status
      category_slug: "dzenaza",
      is_featured: false,

      // Custom HTML za dodatne informacije
      custom_html: "",

      // Family members text (ožalošćeni)
      family_members_text: "",

      // Hatar sessions (čitanje hatma)
      hatar_sessions: [
        {
          session_date: "",
          session_time_start: "",
          session_time_end: "",
          session_location: "",
          session_note: "",
        },
      ],

      errors: {},
    };

    // If editing existing post, populate with existing data
    if (existingPost) {
      // Helper function to convert ISO date to yyyy-MM-dd
      const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "";
        return date.toISOString().split('T')[0];
      };

      return {
        ...defaultState,
        deceased_name: existingPost.deceased_name || "",
        date_of_birth: formatDateForInput(existingPost.deceased_birth_date),
        date_of_death: formatDateForInput(existingPost.deceased_death_date),
        gender: existingPost.deceased_gender || "male",
        biography: existingPost.biography || "",
        cemetery_id: existingPost.cemetery_id || "",
        burial_date: formatDateForInput(existingPost.dzenaza_date || existingPost.deceased_death_date),
        burial_time: existingPost.dzenaza_time || "13:00",
        category_slug: existingPost.category_slug || "dzenaza",
        custom_html: "", // Keep empty when editing - user can add new custom HTML if needed
        // Use family_members_text if available, otherwise fallback to old family_members array for backward compatibility
        family_members_text: existingPost.family_members_text || 
          (existingPost.family_members && existingPost.family_members.length > 0
            ? existingPost.family_members.map(m => `${m.relationship}: ${m.name}`).join(', ')
            : ""),
        hatar_sessions: existingPost.hatar_sessions && existingPost.hatar_sessions.length > 0
          ? existingPost.hatar_sessions.map(session => ({
              session_date: formatDateForInput(session.session_date),
              session_time_start: session.session_time_start || "",
              session_time_end: session.session_time_end || "",
              session_location: session.session_location || "",
              session_note: session.session_note || ""
            }))
          : defaultState.hatar_sessions,
      };
    }

    return defaultState;
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
            <h2>${this.isEditMode ? 'Izmena objave - Korak 1' : 'Nova objava - Korak 1'}</h2>
            <p>${this.isEditMode ? 'Ažurirajte informacije o preminuloj osobi' : 'Dodajte informacije o preminuloj osobi'}</p>
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
                  <div class="form-group" style="flex: 1;">
                    <label for="deceasedName">Ime i prezime *</label>
                    <input 
                      type="text" 
                      id="deceasedName" 
                      name="deceased_name" 
                      value="${this.state.deceased_name || ""}"
                      required
                    >
                    ${this.renderFieldError("deceased_name")}
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
              
              <!-- Hatar sesije -->
              <div class="form-section">
                <h3>Hatar sesije</h3>
                <p class="section-hint">Informacije o čitanju hatara (opciono)</p>
                ${this.renderHatarSessions()}
                <button type="button" class="btn btn-outline btn-sm" id="addHatarSession">
                  + Dodaj hatar sesiju
                </button>
              </div>
              
              <!-- Pogreb i lokacija -->
              <div class="form-section">
                <h3>Pogreb i lokacija</h3>
                <div class="form-group">
                  <label for="cemetery">Mezaristan</label>
                  <select id="cemetery" name="cemetery_id">
                    <option value="">Odaberite mezaristan</option>
                    ${this.renderCemeteryOptions()}
                    <option value="new">+ Dodaj novi mezaristan</option>
                  </select>
                  ${this.renderFieldError("cemetery_id")}
                  
                  <div id="new-cemetery-fields" style="display: none; margin-top: 10px;">
                    <div class="form-group">
                      <label for="new_cemetery_name">Naziv mezaristana *</label>
                      <input 
                        type="text" 
                        id="new_cemetery_name" 
                        name="new_cemetery_name"
                        placeholder="Npr: Mezaristan Alifakovac"
                      />
                    </div>
                    <div class="form-group">
                      <label for="new_cemetery_city">Grad *</label>
                      <input 
                        type="text" 
                        id="new_cemetery_city" 
                        name="new_cemetery_city"
                        placeholder="Npr: Sarajevo"
                      />
                    </div>
                    <button type="button" class="btn-secondary" id="cancel-new-cemetery">
                      Otkaži
                    </button>
                  </div>
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
                <div class="form-group">
                  <label for="familyMembersText">Ožalošćeni članovi porodice</label>
                  <textarea 
                    id="familyMembersText" 
                    name="family_members_text" 
                    rows="3"
                    placeholder="npr. supruga Fatima, sinovi Haris, Almir i Semir, kćerke Amina i Lamija"
                  >${this.state.family_members_text || ""}</textarea>
                  <small class="form-hint">Unesite imena i srodstvo članova porodice koji žale preminulu osobu</small>
                  ${this.renderFieldError("family_members_text")}
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
                    <button type="button" class="upload-btn image-upload-trigger">
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
              <div class="quill-editor-section">
                <h4>Uređivanje objave</h4>
                <div class="template-toolbar">
                  <button type="button" class="template-btn" data-template="funeral-info">📅 Informacije o sahrani</button>
                  <button type="button" class="template-btn" data-template="family-section">👨‍👩‍👧‍👦 Porodica</button>
                  <button type="button" class="template-btn" data-template="prayer-section">🤲 Dova</button>
                </div>
                <div id="quillEditor" style="height: 300px;"></div>
                <input type="hidden" id="hiddenContent" value="${this.editedHtml.replace(
                  /"/g,
                  "&quot;"
                )}" />
              </div>
              
              <div class="live-preview">
                <h4>Pregled kako će izgledati</h4>
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
    const addHatarBtn = this.element.querySelector("#addHatarSession");

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

      // Hatar session input listeners
      form.addEventListener("input", (e) => {
        if (e.target.name && e.target.name.startsWith("hatar_")) {
          this.handleHatarSessionChange(e);
        }
      });

      form.addEventListener("change", (e) => {
        if (e.target.name && e.target.name.startsWith("hatar_")) {
          this.handleHatarSessionChange(e);
        }
      });

      // Remove listeners
      form.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-hatar-session")) {
          const index = parseInt(e.target.dataset.index);
          this.removeHatarSession(index);
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.close());
    }

    if (previewBtn) {
      previewBtn.addEventListener("click", () => this.showPreview());
    }

    if (addHatarBtn) {
      addHatarBtn.addEventListener("click", () => this.addHatarSession());
    }

    // Image upload
    const imageUpload = this.element.querySelector("#imageUpload");
    const imageUploadTrigger = this.element.querySelector(
      ".image-upload-trigger"
    );

    if (imageUploadTrigger && imageUpload) {
      imageUploadTrigger.addEventListener("click", () => {
        imageUpload.click();
      });
    }

    if (imageUpload) {
      imageUpload.addEventListener("change", this.handleImageUpload);
    }
    
    // Cemetery dropdown change - show/hide new cemetery fields
    const cemeterySelect = form.querySelector("#cemetery");
    const newCemeteryFields = form.querySelector("#new-cemetery-fields");
    const cancelNewCemetery = form.querySelector("#cancel-new-cemetery");
    
    if (cemeterySelect && newCemeteryFields) {
      cemeterySelect.addEventListener("change", (e) => {
        console.log("Cemetery select changed:", e.target.value);
        if (e.target.value === "new") {
          newCemeteryFields.style.display = "block";
          this.state.cemetery_id = "";
          this.state.is_new_cemetery = true;
        } else {
          newCemeteryFields.style.display = "none";
          this.state.cemetery_id = e.target.value;
          this.state.is_new_cemetery = false;
        }
      });
    }
    
    // Listen to new cemetery input changes
    const newCemeteryName = form.querySelector("#new_cemetery_name");
    const newCemeteryCity = form.querySelector("#new_cemetery_city");
    
    if (newCemeteryName) {
      newCemeteryName.addEventListener("input", (e) => {
        this.state.new_cemetery_name = e.target.value;
      });
    }
    
    if (newCemeteryCity) {
      newCemeteryCity.addEventListener("input", (e) => {
        this.state.new_cemetery_city = e.target.value;
      });
    }
    
    if (cancelNewCemetery && cemeterySelect && newCemeteryFields) {
      cancelNewCemetery.addEventListener("click", () => {
        newCemeteryFields.style.display = "none";
        cemeterySelect.value = "";
        const nameInput = form.querySelector("#new_cemetery_name");
        const cityInput = form.querySelector("#new_cemetery_city");
        if (nameInput) nameInput.value = "";
        if (cityInput) cityInput.value = "";
      });
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
    const livePreview = this.element.querySelector("#livePreview");

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        // Get content from Quill before leaving
        if (this.quill) {
          this.editedHtml = this.quill.root.innerHTML;
        }
        this.currentStep = "preview";
        this.rerenderModal();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        // Get content from Quill before saving
        if (this.quill) {
          this.editedHtml = this.quill.root.innerHTML;
        }
        this.saveAndPublish();
      });
    }

    // Initialize Quill editor
    this.initializeQuillEditor();

    // Add template button listeners
    const templateBtns = this.element.querySelectorAll(".template-btn");
    templateBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const template = e.target.dataset.template;
        this.insertQuillTemplate(template);
      });
    });
  }

  initializeQuillEditor() {
    if (!window.Quill) {
      console.error("Quill.js nije učitan");
      return;
    }

    const livePreview = this.element.querySelector("#livePreview");
    const hiddenContent = this.element.querySelector("#hiddenContent");

    // Quill toolbar configuration
    const toolbarOptions = [
      ["bold", "italic", "underline", "strike"],
      ["blockquote", "code-block"],
      [{ header: 1 }, { header: 2 }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "sub" }, { script: "super" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ direction: "rtl" }],
      [{ size: ["small", false, "large", "huge"] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ color: [] }, { background: [] }],
      [{ font: [] }],
      [{ align: [] }],
      ["clean"],
      ["link"],
    ];

    // Initialize Quill
    this.quill = new Quill("#quillEditor", {
      theme: "snow",
      modules: {
        toolbar: toolbarOptions,
      },
      formats: [
        "bold",
        "italic",
        "underline",
        "strike",
        "blockquote",
        "code-block",
        "header",
        "list",
        "script",
        "indent",
        "direction",
        "size",
        "color",
        "background",
        "font",
        "align",
        "clean",
        "link",
      ],
    });

    // Set initial content
    if (hiddenContent && hiddenContent.value) {
      this.quill.root.innerHTML = hiddenContent.value;
    }

    // Update preview on content change
    this.quill.on("text-change", () => {
      const content = this.quill.root.innerHTML;
      this.editedHtml = content;
      if (livePreview) {
        livePreview.innerHTML = content;
      }
    });
  }

  insertQuillTemplate(templateType) {
    if (!this.quill) return;

    let templateHtml = "";

    switch (templateType) {
      case "funeral-info":
        templateHtml = `
          <div class="funeral-info">
            <strong>Dženaza se prima:</strong> [Datum], [Vreme] sati od [Mesto]<br>
            <strong>Ukop će se obaviti na groblju:</strong> [Ime groblja]
          </div>
        `;
        break;

      case "family-section":
        templateHtml = `
          <div class="family-section">
            <h4>Ožalošćeni:</h4>
            <p>supruga: [Ime]<br>
            deca: [Imena dece]<br>
            unučad: [Imena unučadi]</p>
          </div>
        `;
        break;

      case "prayer-section":
        templateHtml = `
          <div class="prayer-section">
            <p>اللهم اغفر له وارحمه وعافه واعف عنه</p>
            <p><em>Neka mu Allah oprosti, pomiluje ga, sačuva i prosti mu</em></p>
          </div>
        `;
        break;
    }

    // Insert template at current cursor position
    const range = this.quill.getSelection();
    if (range) {
      this.quill.clipboard.dangerouslyPasteHTML(range.index, templateHtml);
    } else {
      this.quill.clipboard.dangerouslyPasteHTML(templateHtml);
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
              <option value="djed" ${
                member.relationship === "djed" ? "selected" : ""
              }>Djed</option>
              <option value="baba" ${
                member.relationship === "baba" ? "selected" : ""
              }>Baba</option>
              <option value="ujak" ${
                member.relationship === "ujak" ? "selected" : ""
              }>Ujak</option>
              <option value="ujna" ${
                member.relationship === "ujna" ? "selected" : ""
              }>Ujna</option>
              <option value="stric" ${
                member.relationship === "stric" ? "selected" : ""
              }>Stric</option>
              <option value="strina" ${
                member.relationship === "strina" ? "selected" : ""
              }>Strina</option>
              <option value="snaha" ${
                member.relationship === "snaha" ? "selected" : ""
              }>Snaha</option>
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
    const requiredFields = ["deceased_name", "date_of_death", "category_slug"];

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
      // Check if user wants to add new cemetery
      const cemeterySelect = this.element.querySelector("#cemetery");
      let cemeteryId = this.state.cemetery_id;
      
      if (cemeterySelect && cemeterySelect.value === "new") {
        const newCemeteryName = this.element.querySelector("#new_cemetery_name")?.value?.trim();
        const newCemeteryCity = this.element.querySelector("#new_cemetery_city")?.value?.trim();
        
        if (!newCemeteryName || !newCemeteryCity) {
          this.state.errors.general = "Unesite naziv i grad za novi mezaristan";
          this.updateErrorDisplay("general");
          this.setLoading(false);
          return;
        }
        
        // Create new cemetery
        const cemeteryResponse = await api.createCemetery({
          name: newCemeteryName,
          city: newCemeteryCity
        });
        
        if (cemeteryResponse.cemetery && cemeteryResponse.cemetery.id) {
          cemeteryId = cemeteryResponse.cemetery.id;
          // Add to list for future use
          this.cemeteries.push(cemeteryResponse.cemetery);
        } else {
          this.state.errors.general = "Greška pri dodavanju mezaristana";
          this.updateErrorDisplay("general");
          this.setLoading(false);
          return;
        }
      }
      
      const postData = {
        deceased_name: this.state.deceased_name.trim(),
        date_of_birth: this.state.date_of_birth || null,
        date_of_death: this.state.date_of_death,
        gender: this.state.gender,
        biography: this.state.biography.trim() || null,
        cemetery_id: cemeteryId || null,
        burial_date: this.state.burial_date || null,
        burial_time: this.state.burial_time || null,
        category_slug: this.state.category_slug,
        custom_html: this.state.custom_html.trim() || null,
        images: this.serializeImages(),
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
      console.warn("PostCreateForm: Element not found in setLoading");
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
    const fullName = this.state.deceased_name.trim();
    const deathDate = this.formatDateForDisplay(this.state.date_of_death);
    const burialDate = this.formatDateForDisplay(
      this.state.burial_date || this.state.date_of_death
    );
    const burialTime = this.state.burial_time || "13:00";
    const age = this.calculateAge(
      this.state.date_of_birth,
      this.state.date_of_death
    );

    const primaryImage = this.uploadedImages?.[0]?.url || null;

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
              ${
                primaryImage
                  ? `<div class="obituary-photo">
                      <img class="obituary-photo-img" src="${primaryImage}" alt="Fotografija ${fullName}">
                    </div>`
                  : ""
              }
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

              ${this.renderHatarSessionsPreview()}

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

  renderHatarSessionsPreview() {
    const validSessions = this.state.hatar_sessions.filter(
      (s) => s.session_date && s.session_time_start
    );
    if (validSessions.length === 0) return "";

    return `
      <div class="hatar-section">
        <div class="obituary-separator"></div>
        <p><strong>Hatar se prima:</strong></p>
        ${validSessions
          .map((session) => {
            const date = this.formatDateForDisplay(session.session_date);
            const timeStart = session.session_time_start;
            const timeEnd = session.session_time_end;
            const location = session.location || "od IKC Bar";

            let timeText = timeStart;
            if (timeEnd) {
              timeText = `${timeStart} do ${timeEnd}`;
            }

            return `
              <div class="funeral-detail">
                ${date} od ${timeText} sati ${location}
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  renderFamilyMembersPreview() {
    const familyText = this.state.family_members_text?.trim();
    if (!familyText) return "";

    return `
      <div class="family-members">
        <p><strong>Ožalošćeni:</strong></p>
        <p class="family-text">${familyText}</p>
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

  serializeImages() {
    return this.uploadedImages.map((img, index) => ({
      url: img.url,
      name: img.name || `image-${index + 1}.jpg`,
    }));
  }

  collectFormData() {
    // Filter valid hatar sessions (must have date and location)
    const validHatarSessions = this.state.hatar_sessions.filter(
      (s) => s.session_date && s.session_location && s.session_location.trim()
    );
    const deceasedName = this.state.deceased_name.trim();

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
      category_id: this.getCategoryId(this.state.category_slug) || 1,
      cemetery_id: this.state.cemetery_id ? parseInt(this.state.cemetery_id) : null,
      family_members_text: this.state.family_members_text?.trim() || null,
      hatar_sessions: validHatarSessions, // Send as array
      is_featured: this.state.is_featured || false,
      status: "pending", // Will be reviewed by admin

      // Images
      images: this.serializeImages(),

      // HTML content - will be added in saveAndPublish
      generated_html: null,
      custom_html: null,
      is_custom_edited: false,
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

      // Check if user wants to add new cemetery
      let cemeteryId = this.state.cemetery_id;
      
      if (this.state.is_new_cemetery) {
        const newCemeteryName = this.state.new_cemetery_name?.trim();
        const newCemeteryCity = this.state.new_cemetery_city?.trim();
        
        if (!newCemeteryName || !newCemeteryCity) {
          this.state.errors.general = "Unesite naziv i grad za novi mezaristan";
          this.rerenderModal();
          this.setLoading(false);
          return;
        }
        
        // Create new cemetery
        console.log("Creating new cemetery:", { name: newCemeteryName, city: newCemeteryCity });
        const cemeteryResponse = await api.createCemetery({
          name: newCemeteryName,
          city: newCemeteryCity
        });
        
        console.log("Cemetery creation response:", cemeteryResponse);
        
        if (cemeteryResponse.cemetery && cemeteryResponse.cemetery.id) {
          cemeteryId = cemeteryResponse.cemetery.id;
          this.state.cemetery_id = cemeteryId;
          // Add to list for future use
          this.cemeteries.push(cemeteryResponse.cemetery);
          console.log("New cemetery created with ID:", cemeteryId);
        } else {
          this.state.errors.general = "Greška pri dodavanju mezaristana";
          this.rerenderModal();
          this.setLoading(false);
          return;
        }
      }

      // Use edited HTML if available, otherwise use generated preview
      const finalHtml = this.editedHtml || this.generatedPreview;

      const postData = this.collectFormData();
      postData.custom_html = finalHtml;
      postData.is_custom_edited = this.editedHtml !== this.generatedPreview;

      console.log("Sending post data:", postData);

      // Use update API for edit mode, create API for new posts
      let response;
      if (this.isEditMode && this.existingPost) {
        response = await api.updatePost(this.existingPost.id, postData);
      } else {
        response = await api.createPost(postData);
      }

      console.log("API response:", response);

      if (response.success || response.post || response.message) {
        this.setLoading(false);

        // Show success message
        this.showSuccessMessage(this.isEditMode);

        // Close modal after delay
        setTimeout(() => {
          this.close();
          this.onSuccess?.(response);
        }, 3000);

        return; // Exit early to avoid setLoading(false) in finally
      } else {
        throw new Error(response.error || `Greška pri ${this.isEditMode ? 'izmeni' : 'kreiranju'} objave`);
      }
    } catch (error) {
      console.error("Save and publish error:", error);
      this.state.errors.general = error.message;
      this.rerenderModal();
      this.setLoading(false);
    }
  }

  showSuccessMessage(isEdit = false) {
    const modalContent = this.element.querySelector(".modal-container");
    if (modalContent) {
      modalContent.innerHTML = `
        <div class="modal-header">
          <h2>${isEdit ? 'Objava izmenjena' : 'Objava poslata'}</h2>
        </div>
        <div class="success-message" style="padding: 3rem; text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 1.5rem;">✅</div>
          <h3 style="color: #006233; font-size: 1.5rem; margin-bottom: 1rem;">
            ${isEdit ? 'Objava je uspješno izmenjena!' : 'Objava je uspješno poslata!'}
          </h3>
          <p style="color: #6b7280; font-size: 1.1rem; line-height: 1.6;">
            ${isEdit 
              ? 'Vaša objava je ažurirana i ponovo čeka odobrenje administratora.<br>Bićete obaviješteni kada izmene budu odobrene.' 
              : 'Vaša objava je predata i čeka se odobrenje administratora.<br>Bićete obaviješteni kada objava bude objavljena.'}
          </p>
          <div style="margin-top: 2rem;">
            <div class="loading-spinner" style="width: 40px; height: 40px; margin: 0 auto;"></div>
          </div>
        </div>
      `;
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

  // Hatar sessions methods
  renderHatarSessions() {
    return this.state.hatar_sessions
      .map(
        (session, index) => `
      <div class="hatar-session-row" data-index="${index}">
        <div class="form-row">
          <div class="form-group">
            <label for="hatar_date_${index}">Datum</label>
            <input 
              type="date" 
              id="hatar_date_${index}"
              name="hatar_date_${index}" 
              value="${session.session_date}"
              placeholder="Izaberite datum"
            >
          </div>
          
          <div class="form-group">
            <label for="hatar_time_start_${index}">Vreme početka</label>
            <input 
              type="time" 
              id="hatar_time_start_${index}"
              name="hatar_time_start_${index}" 
              value="${session.session_time_start}"
              placeholder="09:00"
            >
          </div>
          
          <div class="form-group">
            <label for="hatar_time_end_${index}">Vreme kraja (opciono)</label>
            <input 
              type="time" 
              id="hatar_time_end_${index}"
              name="hatar_time_end_${index}" 
              value="${session.session_time_end}"
              placeholder="15:00"
            >
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="hatar_location_${index}">Lokacija</label>
            <input 
              type="text" 
              id="hatar_location_${index}"
              name="hatar_location_${index}" 
              value="${session.session_location}"
              placeholder="Lokacija čitanja hatma"
            >
          </div>
          
          <div class="form-group">
            <label for="hatar_note_${index}">Napomena (opciono)</label>
            <input 
              type="text" 
              id="hatar_note_${index}"
              name="hatar_note_${index}" 
              value="${session.session_note || ""}"
              placeholder="Dodatne informacije"
            >
          </div>
          
          <div class="form-group">
            <button type="button" class="btn btn-danger btn-sm remove-hatar-session" data-index="${index}">
              Ukloni
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  addHatarSession() {
    this.state.hatar_sessions.push({
      session_date: "",
      session_time_start: "",
      session_time_end: "",
      session_location: "",
      session_note: "",
    });
    this.rerenderHatarSessions();
  }

  removeHatarSession(index) {
    this.state.hatar_sessions.splice(index, 1);
    this.rerenderHatarSessions();
  }

  rerenderHatarSessions() {
    const container = this.element.querySelector(
      ".form-section:has(#addHatarSession)"
    );
    if (container) {
      const content = container.querySelector(".section-hint").parentNode;
      content.innerHTML = `
        <h3>Hatma sesije</h3>
        <p class="section-hint">Informacije o čitanju hatma (opciono)</p>
        ${this.renderHatarSessions()}
        <button type="button" class="btn btn-outline btn-sm" id="addHatarSession">
          + Dodaj hatma sesiju
        </button>
      `;

      // Re-attach event listeners
      const addBtn = container.querySelector("#addHatarSession");
      if (addBtn) {
        addBtn.addEventListener("click", () => this.addHatarSession());
      }

      container
        .querySelectorAll(".remove-hatar-session")
        .forEach((btn, index) => {
          btn.addEventListener("click", () => {
            this.removeHatarSession(index);
          });
        });

      // Re-attach input listeners for hatar sessions
      container.querySelectorAll("input").forEach((input) => {
        if (input.name && input.name.startsWith("hatar_")) {
          input.addEventListener(
            "input",
            this.handleHatarSessionChange.bind(this)
          );
          input.addEventListener(
            "change",
            this.handleHatarSessionChange.bind(this)
          );
        }
      });
    }
  }

  handleHatarSessionChange(e) {
    const name = e.target.name;
    const value = e.target.value;

    // Parse field name like "hatar_date_0" -> field: "session_date", index: 0
    const match = name.match(/^hatar_(\w+)_(\d+)$/);
    if (match) {
      const field = match[1];
      const index = parseInt(match[2]);

      // Map field names to database columns
      const fieldMap = {
        date: "session_date",
        time_start: "session_time_start",
        time_end: "session_time_end",
        location: "session_location",
        note: "session_note",
      };

      const dbField = fieldMap[field];
      if (dbField && this.state.hatar_sessions[index]) {
        this.state.hatar_sessions[index][dbField] = value;
      }
    }
  }

  destroy() {
    this.close();
  }
}
