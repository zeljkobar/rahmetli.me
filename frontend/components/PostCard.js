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
    this.mediaBase = this.getMediaBase();
  }

  getMediaBase() {
    if (typeof window === "undefined") return "";
    return window.location.hostname === "localhost"
      ? "http://localhost:3002"
      : ""; // production služi istu domenu
  }

  buildImageUrl(url) {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `${this.mediaBase}${url.startsWith("/") ? url : `/${url}`}`;
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
      deceased_photo_url,
      primary_image_url,
      dzenaza_date,
      dzenaza_time,
      dzenaza_location,
      burial_cemetery,
      burial_location,
      family_members,
      hatar_sessions,
      author_name,
      username,
      views_count,
      comments_count,
      images,
      isDetailView = false,
    } = this.post;

    // Calculate age if not provided
    const age =
      deceased_age ||
      this.calculateAge(deceased_birth_date, deceased_death_date);

    // Format dates
    const deathDate = this.formatDateForObituary(deceased_death_date);
    const funeralDate = this.formatDateForObituary(dzenaza_date);
    const funeralTime = dzenaza_time ? dzenaza_time.slice(0, 5) : ""; // HH:MM format

    const primaryImage = this.buildImageUrl(
      deceased_photo_url ||
        primary_image_url ||
        (Array.isArray(images) && images.length > 0
          ? images[0].url || images[0].thumbnail_url
          : null)
    );

    // Parse family members (if stored as JSON string)
    let familyList = "";
    if (family_members) {
      try {
        const members =
          typeof family_members === "string"
            ? JSON.parse(family_members)
            : family_members;

        if (Array.isArray(members)) {
          familyList = members
            .map((m) => {
              // Format: relationship name (e.g., "supruga Amra")
              const relationship = (m.relationship || "").toLowerCase();
              const name = m.name || "";

              // If relationship is "ostalo", show only the name without relationship prefix
              if (relationship === "ostalo") {
                return name.trim();
              }

              const capitalizedName =
                name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
              return `${relationship} ${capitalizedName}`.trim();
            })
            .join(", ");
        } else {
          familyList = "";
        }
      } catch (e) {
        // If it's a plain string, split by comma and capitalize only names (not relationships)
        familyList = family_members
          .split(",")
          .map((member) => {
            const trimmed = member.trim();
            const words = trimmed.split(" ");
            // First word is relationship (lowercase), rest are names (capitalize)
            return words
              .map((word, index) => {
                if (index === 0) {
                  // Keep relationship lowercase
                  return word.toLowerCase();
                } else {
                  // Capitalize names
                  return (
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  );
                }
              })
              .join(" ");
          })
          .join(", ");
      }
    }

    // Format hatar sessions
    let hatarSectionsHtml = "";
    if (
      hatar_sessions &&
      Array.isArray(hatar_sessions) &&
      hatar_sessions.length > 0
    ) {
      // Remove duplicates by session id
      const uniqueSessions = hatar_sessions.filter(
        (session, index, self) =>
          self.findIndex((s) => s.id === session.id) === index
      );

      const hatarItems = uniqueSessions
        .map((session) => {
          const sessionDate = new Date(session.date).toLocaleDateString(
            "sr-RS",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }
          );
          const displayTimeStart = session.time_start
            ? session.time_start.slice(0, 5)
            : "";
          const displayTimeEnd = session.time_end
            ? ` do ${session.time_end.slice(0, 5)}`
            : "";

          return `<strong>Hatar se prima ${sessionDate} od ${displayTimeStart}${displayTimeEnd} u ${session.location}</strong>`;
        })
        .join("<br>");

      hatarSectionsHtml = `
        <div class="hatar-info">
          <div class="hatar-detail">
            ${hatarItems}
          </div>
        </div>
      `;
    }

    return `
      <article class="obituary-card ${
        !isDetailView ? "clickable-card" : ""
      }" data-post-id="${id}">
        <div class="obituary-frame">
          <div class="obituary-content">
            <div class="obituary-header ${primaryImage ? "has-photo" : ""}">
              ${
                primaryImage
                  ? `<div class="obituary-photo obituary-photo-inline">
                      <img class="obituary-photo-img" src="${primaryImage}" alt="Fotografija ${deceased_name}">
                    </div>`
                  : ""
              }
              <div class="obituary-header-main">
                <div class="crescent-moon">☪</div>
                <img src="/images/arabic-calligraphy.png" alt="الرَّحْمَنُ الرَّحِيمُ" class="arabic-calligraphy-image">
              </div>
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
              
              ${hatarSectionsHtml}
              
              <div class="funeral-info">
                <div class="funeral-detail">
                  <strong>Dženaza se klanja:</strong> ${funeralDate} god. u ${funeralTime} sati u ${dzenaza_location}
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
                !isDetailView && familyList
                  ? `
                <div class="family-members">
                  <strong>Ožalošćeni:</strong> »
                </div>
              `
                  : isDetailView && familyList
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
