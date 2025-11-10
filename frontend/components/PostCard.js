// Post Card Component
import {
  formatDate,
  formatRelativeTime,
  getPostTypeLabel,
  getPostTypeIcon,
  truncateText,
} from "../utils/helpers.js";

export class PostCard {
  constructor(post) {
    this.post = post;
  }

  render() {
    // Check if this is an obituary (umrlica) type
    if (this.post.type === "dova" || this.post.type === "dzenaza") {
      return this.renderObituary();
    }

    // Original render for other types
    return this.renderOriginal();
  }

  renderObituary() {
    const {
      id,
      deceased_name,
      deceased_birth_date,
      deceased_death_date,
      deceased_age,
      deceased_gender,
      dzenaza_date,
      dzenaza_time,
      dzenaza_location,
      burial_cemetery,
      burial_location,
      family_members,
      author_name,
      username,
      views_count,
      comments_count,
    } = this.post;

    // Calculate age if not provided
    const age =
      deceased_age ||
      this.calculateAge(deceased_birth_date, deceased_death_date);

    // Format dates
    const deathDate = this.formatDateForObituary(deceased_death_date);
    const funeralDate = this.formatDateForObituary(dzenaza_date);
    const funeralTime = dzenaza_time ? dzenaza_time.slice(0, 5) : ""; // HH:MM format

    // Parse family members (if stored as JSON string)
    let familyList = "";
    if (family_members) {
      try {
        const members =
          typeof family_members === "string"
            ? JSON.parse(family_members)
            : family_members;
        familyList = Array.isArray(members)
          ? members.map((m) => m.name).join(", ")
          : "";
      } catch (e) {
        familyList = family_members;
      }
    }

    return `
      <article class="obituary-card" data-post-id="${id}">
        <div class="obituary-frame">
          <div class="obituary-content">
            <div class="obituary-header">
              <div class="crescent-moon">☪</div>
              <img src="images/arabic-calligraphy.png" alt="الرَّحْمَنُ الرَّحِيمُ" class="arabic-calligraphy-image">
            </div>
            
            <div class="obituary-body">
              <div class="death-announcement">
                Dana <strong>${deathDate}</strong> god. u <strong>${age}</strong> godini života preseli${
      deceased_gender === "female" ? "la" : "o"
    } je na ahiret
              </div>
              
              <div class="deceased-name">
                ${deceased_name.toUpperCase()}
              </div>
              
              <div class="funeral-info">
                <div class="funeral-detail">
                  <strong>Dženaza se prima:</strong> ${funeralDate} god. u ${funeralTime} sati od ${dzenaza_location}
                </div>
                ${
                  burial_cemetery
                    ? `
                  <div class="burial-detail">
                    <strong>Ukop će se obaviti na groblju:</strong> ${burial_cemetery}${
                        burial_location ? ` - ${burial_location}` : ""
                      }
                  </div>
                `
                    : ""
                }
              </div>
              
              <div class="rahmet-text">
                RAHMETULLAHI ALEJHI RAHMETEN VASIAH
              </div>
              
              ${
                familyList
                  ? `
                <div class="family-members">
                  <strong>Ožalošćeni:</strong> ${familyList}
                </div>
              `
                  : ""
              }
            </div>
            
            <footer class="obituary-footer">
              <div class="obituary-stats">
              ${views_count ? `<span>👁 ${views_count}</span>` : ""}
              ${comments_count > 0 ? `<span>💬 ${comments_count}</span>` : ""}
            </div>
            <div class="obituary-actions">
              <a href="/objava/${id}" class="btn btn-sm btn-outline">
                Pročitaj više
              </a>
            </div>
          </footer>
          </div>
        </div>
      </article>
    `;
  }

  renderOriginal() {
    const {
      id,
      type,
      title,
      content,
      deceased_name,
      deceased_death_date,
      location,
      dzamija,
      created_at,
      author_name,
      username,
      views_count,
      comments_count,
      cemetery_name,
      cemetery_city,
    } = this.post;

    const typeLabel = getPostTypeLabel(type);
    const typeIcon = getPostTypeIcon(type);
    const relativeTime = formatRelativeTime(created_at);
    const deathDate = formatDate(deceased_death_date);
    const truncatedContent = truncateText(content, 200);

    const locationInfo = [];
    if (location) locationInfo.push(location);
    if (cemetery_name && cemetery_city) {
      locationInfo.push(`${cemetery_name}, ${cemetery_city}`);
    } else if (cemetery_city) {
      locationInfo.push(cemetery_city);
    }

    const locationString = locationInfo.join(" • ");

    return `
            <article class="card post-card ${type}" data-post-id="${id}">
                <div class="card-body">
                    <header class="post-header">
                        <div class="post-title-section">
                            <h2 class="post-title">
                                <a href="/objava/${id}" class="post-link">${deceased_name}</a>
                            </h2>
                            <span class="post-type-badge ${type}">
                                ${typeIcon} ${typeLabel}
                            </span>
                        </div>
                    </header>
                    
                    <div class="post-meta">
                        <span class="death-date">📅 ${deathDate}</span>
                        <span class="author">👤 ${
                          author_name || username
                        }</span>
                        <span class="created-at">🕒 ${relativeTime}</span>
                    </div>
                    
                    ${
                      title !== deceased_name
                        ? `
                        <h3 class="post-subtitle">${title}</h3>
                    `
                        : ""
                    }
                    
                    <div class="post-content">
                        <p>${truncatedContent}</p>
                    </div>
                    
                    ${
                      dzamija
                        ? `
                        <div class="post-dzamija">
                            🕌 <strong>Džamija:</strong> ${dzamija}
                        </div>
                    `
                        : ""
                    }
                    
                    ${
                      locationString
                        ? `
                        <div class="post-location">
                            📍 <strong>Lokacija:</strong> ${locationString}
                        </div>
                    `
                        : ""
                    }
                </div>
                
                <footer class="card-footer post-footer">
                    <div class="post-stats">
                        ${views_count ? `<span>👁 ${views_count}</span>` : ""}
                        ${
                          comments_count > 0
                            ? `<span>💬 ${comments_count}</span>`
                            : ""
                        }
                    </div>
                    <div class="post-actions">
                        <a href="/objava/${id}" class="btn btn-sm btn-outline">
                            Pročitaj više
                        </a>
                    </div>
                </footer>
            </article>
        `;
  }

  // Helper methods for obituary
  calculateAge(birthDate, deathDate) {
    if (!birthDate || !deathDate) return "";

    const birth = new Date(birthDate);
    const death = new Date(deathDate);
    const age = death.getFullYear() - birth.getFullYear();

    return age;
  }

  formatDateForObituary(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
  }

  // Static method to render multiple posts
  static renderGrid(posts) {
    if (!posts || posts.length === 0) {
      return `
                <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <h3 class="empty-state-title">Nema objava</h3>
                    <p class="empty-state-description">
                        Trenutno nema objava za prikaz. Provjerite kasnije ili promijenite filter.
                    </p>
                </div>
            `;
    }

    const postsHtml = posts.map((post) => new PostCard(post).render()).join("");

    // Check if we have obituaries (umrlice) to use single-column layout
    const hasObituaries = posts.some(
      (post) => post.type === "dova" || post.type === "dzenaza"
    );
    const gridClass = hasObituaries
      ? "posts-grid obituaries-grid"
      : "posts-grid";

    return `
            <div class="${gridClass}">
                ${postsHtml}
            </div>
        `;
  }
}
