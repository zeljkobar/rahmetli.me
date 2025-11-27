import { api } from "../utils/api.js";
import { showToast } from "../utils/helpers.js";

export class SubscriptionPayment {
  constructor() {
    this.cities = [];
    this.selectedCities = [];
  }

  async render() {
    try {
      // Učitaj listu gradova
      const response = await api.get("/subscription/cities");
      this.cities = response.cities || [];

      const container = document.getElementById("mainContent");
      container.innerHTML = `
        <div class="subscription-payment-page">
          <div class="container">
            <div class="subscription-card">
              <div class="subscription-header">
                <div class="icon">☪</div>
                <h1>Dobrodošli na Rahmetli.me!</h1>
                <p class="subtitle">Zahvaljujemo na registraciji. Aktivirajte sve funkcionalnosti pretplatom.</p>
              </div>

              <div class="subscription-benefits">
                <h2>Šta dobijate pretplatom:</h2>
                <div class="benefits-grid">
                  <div class="benefit-item">
                    <span class="benefit-icon">✅</span>
                    <div>
                      <h3>Izjavljivanje hatara</h3>
                      <p>Neograničeno ostavljanje komentara</p>
                    </div>
                  </div>
                  <div class="benefit-item">
                    <span class="benefit-icon">📧</span>
                    <div>
                      <h3>Email notifikacije</h3>
                      <p>Automatska obavještenja o dženazama za vaše gradove</p>
                    </div>
                  </div>
                  <div class="benefit-item">
                    <span class="benefit-icon">🤲</span>
                    <div>
                      <h3>Podrška zajednici</h3>
                      <p>Pomažete održavanju i razvoju platforme</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="notification-cities">
                <h2>Izaberite gradove za email notifikacije</h2>
                <p class="hint">Dobi ćete email kada se objavi dženaza u izabranim gradovima</p>
                
                <div class="cities-grid">
                  ${this.renderCitiesCheckboxes()}
                </div>
              </div>

              <div class="subscription-pricing">
                <div class="price-box">
                  <div class="price-label">Godišnja pretplata</div>
                  <div class="price-amount">15 <span class="currency">EUR</span></div>
                  <div class="price-period">/ godinu</div>
                </div>
              </div>

              <div class="payment-section">
                <h2>Način plaćanja</h2>
                
                <!-- Placeholder za kartično plaćanje -->
                <div class="payment-method card-payment disabled">
                  <div class="payment-icon">💳</div>
                  <div class="payment-info">
                    <h3>Plaćanje karticom</h3>
                    <p>Online plaćanje sa karticom</p>
                    <span class="coming-soon">Uskoro dostupno</span>
                  </div>
                  <button class="btn btn-primary btn-full" disabled>
                    Plati karticom (Uskoro)
                  </button>
                </div>

                <!-- Bankovna uplatnica -->
                <div class="payment-method bank-transfer">
                  <div class="payment-icon">🏦</div>
                  <div class="payment-info">
                    <h3>Bankovna uplatnica</h3>
                    <p>Uplatite iznos na naš račun i admin će manuelno aktivirati vašu pretplatu</p>
                  </div>
                  <button class="btn btn-secondary btn-full" id="showBankDetailsBtn">
                    Prikaži podatke za uplatu
                  </button>
                </div>
              </div>

              <div class="bank-details hidden" id="bankDetails">
                <h3>Podaci za uplatu:</h3>
                <div class="detail-row">
                  <span class="label">Primalac:</span>
                  <span class="value">Rahmetli.me d.o.o.</span>
                </div>
                <div class="detail-row">
                  <span class="label">Broj računa:</span>
                  <span class="value">510-XXXXX-XX</span>
                </div>
                <div class="detail-row">
                  <span class="label">Iznos:</span>
                  <span class="value">15,00 EUR</span>
                </div>
                <div class="detail-row">
                  <span class="label">Svrha:</span>
                  <span class="value">Godišnja pretplata Rahmetli.me</span>
                </div>
                <div class="detail-row">
                  <span class="label">Poziv na broj:</span>
                  <span class="value" id="paymentReference">-</span>
                </div>
                
                <button class="btn btn-primary btn-full" id="confirmBankTransferBtn">
                  Potvrdim da ću izvršiti uplatu
                </button>
              </div>

              <div class="subscription-actions">
                <button class="btn btn-link" id="skipForNowBtn">
                  Preskoči za sada
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      this.attachEventListeners();
    } catch (error) {
      console.error("Error rendering subscription page:", error);
      showToast("Greška pri učitavanju stranice", "error");
    }
  }

  renderCitiesCheckboxes() {
    return this.cities
      .map(
        (city) => `
        <label class="city-checkbox">
          <input type="checkbox" value="${city}" data-city="${city}">
          <span>${city}</span>
        </label>
      `
      )
      .join("");
  }

  attachEventListeners() {
    // Checkboxes za gradove
    const checkboxes = document.querySelectorAll(
      '.city-checkbox input[type="checkbox"]'
    );
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.selectedCities.push(e.target.value);
        } else {
          this.selectedCities = this.selectedCities.filter(
            (city) => city !== e.target.value
          );
        }
      });
    });

    // Prikaži bank details
    const showBankDetailsBtn = document.getElementById("showBankDetailsBtn");
    if (showBankDetailsBtn) {
      showBankDetailsBtn.addEventListener("click", () => {
        this.showBankDetails();
      });
    }

    // Potvrdi bankovnu uplatu
    const confirmBtn = document.getElementById("confirmBankTransferBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        this.createSubscription();
      });
    }

    // Preskoči za sada
    const skipBtn = document.getElementById("skipForNowBtn");
    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        window.location.href = "/";
      });
    }
  }

  async showBankDetails() {
    if (this.selectedCities.length === 0) {
      showToast(
        "Molimo izaberite najmanje jedan grad za notifikacije",
        "warning"
      );
      return;
    }

    const bankDetails = document.getElementById("bankDetails");
    bankDetails.classList.remove("hidden");

    // Scroll do bank details
    bankDetails.scrollIntoView({ behavior: "smooth" });
  }

  async createSubscription() {
    if (this.selectedCities.length === 0) {
      showToast(
        "Molimo izaberite najmanje jedan grad za notifikacije",
        "warning"
      );
      return;
    }

    try {
      const response = await api.post("/subscription/create", {
        notificationCities: this.selectedCities,
      });

      // Prikaži payment reference
      const paymentRefElement = document.getElementById("paymentReference");
      if (paymentRefElement) {
        paymentRefElement.textContent = response.paymentInfo.reference;
      }

      showToast(
        "Pretplata kreirana! Nakon izvršene uplate, admin će aktivirati vaš pristup.",
        "success"
      );

      // Redirect na home nakon 3 sekunde
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch (error) {
      console.error("Error creating subscription:", error);
      showToast(error.message || "Greška pri kreiranju pretplate", "error");
    }
  }
}
