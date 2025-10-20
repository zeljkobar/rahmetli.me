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

    return `
            <div class="posts-grid">
                ${postsHtml}
            </div>
        `;
  }
}
