// API Utility Class
class API {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('auth_token');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    // Get authentication token
    getToken() {
        return this.token || localStorage.getItem('auth_token');
    }

    // Get default headers
    getHeaders(contentType = 'application/json') {
        const headers = {
            'Content-Type': contentType
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${endpoint}?${query}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Auth methods
    async login(credentials) {
        const response = await this.post('/auth/login', credentials);
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    async register(userData) {
        const response = await this.post('/auth/register', userData);
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    async logout() {
        try {
            await this.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.setToken(null);
        }
    }

    async getProfile() {
        return this.get('/auth/profile');
    }

    // Posts methods
    async getPosts(params = {}) {
        return this.get('/posts', params);
    }

    async getPost(id) {
        return this.get(`/posts/${id}`);
    }

    async createPost(postData) {
        return this.post('/posts', postData);
    }

    async updatePost(id, postData) {
        return this.put(`/posts/${id}`, postData);
    }

    async deletePost(id) {
        return this.delete(`/posts/${id}`);
    }

    // Categories methods
    async getCategories() {
        return this.get('/categories');
    }

    async getCategory(slug) {
        return this.get(`/categories/${slug}`);
    }

    // Cemeteries methods
    async getCemeteries(params = {}) {
        return this.get('/cemeteries', params);
    }

    async getCemetery(id) {
        return this.get(`/cemeteries/${id}`);
    }

    async getCities() {
        return this.get('/cemeteries/cities/list');
    }

    // Users methods
    async getUser(id) {
        return this.get(`/users/${id}`);
    }

    // Health check
    async healthCheck() {
        return this.get('/health');
    }
}

// Export singleton instance
export default new API();