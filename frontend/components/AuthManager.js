// Authentication Manager
import API from '../utils/api.js';
import { handleError, showToast, show, hide, initials } from '../utils/helpers.js';

export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check if user is logged in
        const token = API.getToken();
        if (token) {
            try {
                const response = await API.getProfile();
                this.setCurrentUser(response.user);
            } catch (error) {
                console.error('Failed to load user profile:', error);
                API.setToken(null);
                this.updateUI();
            }
        } else {
            this.updateUI();
        }
    }

    setCurrentUser(user) {
        this.currentUser = user;
        this.updateUI();
    }

    updateUI() {
        const authSection = document.getElementById('authSection');
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        
        if (this.currentUser) {
            // User is logged in
            hide(authButtons);
            show(userMenu);
            
            // Update user avatar
            const userInitials = document.getElementById('userInitials');
            if (userInitials) {
                userInitials.textContent = initials(this.currentUser.full_name || this.currentUser.username);
            }
        } else {
            // User is not logged in
            show(authButtons);
            hide(userMenu);
        }
    }

    async login(credentials) {
        try {
            const response = await API.login(credentials);
            this.setCurrentUser(response.user);
            showToast('Uspješno ste se prijavili', 'success');
            return response;
        } catch (error) {
            const message = handleError(error, 'Greška pri prijavi');
            showToast(message, 'danger');
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await API.register(userData);
            this.setCurrentUser(response.user);
            showToast('Uspješno ste se registrirali', 'success');
            return response;
        } catch (error) {
            const message = handleError(error, 'Greška pri registraciji');
            showToast(message, 'danger');
            throw error;
        }
    }

    async logout() {
        try {
            await API.logout();
            this.currentUser = null;
            this.updateUI();
            showToast('Uspješno ste se odjavili', 'info');
            
            // Redirect to home if on protected page
            if (window.location.pathname.startsWith('/profil') || 
                window.location.pathname.startsWith('/moje-objave')) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Even if API call fails, clear local state
            this.currentUser = null;
            this.updateUI();
        }
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getUser() {
        return this.currentUser;
    }

    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    canModerate() {
        return this.currentUser && ['admin', 'moderator'].includes(this.currentUser.role);
    }
}