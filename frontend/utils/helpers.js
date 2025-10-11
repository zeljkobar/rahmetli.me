// Utility Functions

// Date formatting
export function formatDate(dateString, options = {}) {
    const date = new Date(dateString);
    
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };
    
    return date.toLocaleDateString('bs-BA', defaultOptions);
}

export function formatDateTime(dateString, options = {}) {
    const date = new Date(dateString);
    
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };
    
    return date.toLocaleDateString('bs-BA', defaultOptions);
}

export function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        godina: 31536000,
        mjesec: 2592000,
        sedmica: 604800,
        dan: 86400,
        sat: 3600,
        minuta: 60
    };
    
    for (const [unit, seconds] of Object.entries(intervals)) {
        const interval = Math.floor(diffInSeconds / seconds);
        
        if (interval >= 1) {
            return `Prije ${interval} ${unit}${interval > 1 ? (unit === 'sat' ? 'a' : unit === 'minuta' ? 'e' : 'a') : ''}`;
        }
    }
    
    return 'Upravo sada';
}

// String utilities
export function truncateText(text, length = 100, suffix = '...') {
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + suffix;
}

export function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim('-'); // Remove leading/trailing hyphens
}

export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function initials(name) {
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Validation utilities
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validatePhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

export function validatePassword(password) {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

// DOM utilities
export function createElement(tag, className = '', content = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
}

export function show(element) {
    element.classList.remove('hidden');
}

export function hide(element) {
    element.classList.add('hidden');
}

export function toggle(element) {
    element.classList.toggle('hidden');
}

export function toggleClass(element, className) {
    element.classList.toggle(className);
}

// Local storage utilities
export function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

export function getStorageItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
}

export function removeStorageItem(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from localStorage:', error);
    }
}

// URL utilities
export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

export function setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

export function removeQueryParam(param) {
    const url = new URL(window.location);
    url.searchParams.delete(param);
    window.history.pushState({}, '', url);
}

// Error handling
export function handleError(error, defaultMessage = 'Došlo je do greške') {
    console.error('Error:', error);
    
    let message = defaultMessage;
    
    if (typeof error === 'string') {
        message = error;
    } else if (error?.message) {
        message = error.message;
    } else if (error?.error) {
        message = error.error;
    }
    
    return message;
}

// Debounce function
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// Throttle function
export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Array utilities
export function unique(array, key = null) {
    if (key) {
        return array.filter((item, index, arr) => 
            arr.findIndex(t => t[key] === item[key]) === index
        );
    }
    return [...new Set(array)];
}

export function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
}

export function sortBy(array, key, direction = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = typeof key === 'function' ? key(a) : a[key];
        const bVal = typeof key === 'function' ? key(b) : b[key];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Loading state management
export function showLoading(element = null) {
    const target = element || document.getElementById('loadingIndicator');
    if (target) show(target);
}

export function hideLoading(element = null) {
    const target = element || document.getElementById('loadingIndicator');
    if (target) hide(target);
}

// Toast notifications (simple implementation)
export function showToast(message, type = 'info', duration = 5000) {
    const toast = createElement('div', `alert alert-${type}`, message);
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1070;
        max-width: 300px;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Post type utilities
export function getPostTypeLabel(type) {
    const labels = {
        'dzenaza': 'Dženaza',
        'dova': 'Saučešće',
        'pomen': 'Pomen',
        'hatma': 'Hatma',
        'godisnjica': 'Godišnjica'
    };
    return labels[type] || type;
}

export function getPostTypeIcon(type) {
    const icons = {
        'dzenaza': '🕌',
        'dova': '🤲',
        'pomen': '📅',
        'hatma': '📖',
        'godisnjica': '🌹'
    };
    return icons[type] || '📄';
}

// Age calculation
export function calculateAge(birthDate, deathDate = null) {
    const birth = new Date(birthDate);
    const reference = deathDate ? new Date(deathDate) : new Date();
    
    let age = reference.getFullYear() - birth.getFullYear();
    const monthDiff = reference.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}