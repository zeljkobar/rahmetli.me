// Pagination Component
export class Pagination {
    constructor(pagination, onPageChange) {
        this.pagination = pagination;
        this.onPageChange = onPageChange;
    }

    render() {
        const { page, totalPages, hasNext, hasPrev } = this.pagination;
        
        if (totalPages <= 1) return '';

        const pages = this.generatePageNumbers();
        
        return `
            <div class="pagination">
                <button 
                    class="pagination-btn" 
                    ${!hasPrev ? 'disabled' : ''} 
                    data-page="${page - 1}"
                >
                    ‹ Prethodna
                </button>
                
                ${pages.map(pageNum => `
                    <button 
                        class="pagination-btn ${pageNum === page ? 'active' : ''}" 
                        data-page="${pageNum}"
                        ${pageNum === '...' ? 'disabled' : ''}
                    >
                        ${pageNum}
                    </button>
                `).join('')}
                
                <button 
                    class="pagination-btn" 
                    ${!hasNext ? 'disabled' : ''} 
                    data-page="${page + 1}"
                >
                    Sljedeća ›
                </button>
            </div>
        `;
    }

    generatePageNumbers() {
        const { page, totalPages } = this.pagination;
        const pages = [];
        const delta = 2; // Number of pages to show around current page

        if (totalPages <= 7) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            // Add ellipsis if needed
            if (page > delta + 2) {
                pages.push('...');
            }

            // Add pages around current page
            const start = Math.max(2, page - delta);
            const end = Math.min(totalPages - 1, page + delta);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            // Add ellipsis if needed
            if (page < totalPages - delta - 1) {
                pages.push('...');
            }

            // Always show last page
            if (totalPages > 1) {
                pages.push(totalPages);
            }
        }

        return pages;
    }

    attachEventListeners(container) {
        const buttons = container.querySelectorAll('.pagination-btn[data-page]');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                if (page && !e.target.disabled) {
                    this.onPageChange(page);
                }
            });
        });
    }
}