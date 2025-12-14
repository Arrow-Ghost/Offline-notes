/**
 * Authentication Manager
 * Handles user authentication and session management
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
    }

    /**
     * Initialize auth - check for cached session
     */
    async init() {
        const session = await notesRepository.getSession();
        
        if (session.token && session.user) {
            this.token = session.token;
            this.currentUser = session.user;
            return true;
        }
        
        return false;
    }

    /**
     * Login with email and password
     */
    async login(email, password) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                let errorMessage = 'Login failed';
                try {
                    const error = await response.json();
                    errorMessage = error.message || errorMessage;
                } catch (e) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            this.token = data.token;
            this.currentUser = data.user;

            // Save session locally
            await notesRepository.saveSession(this.token, this.currentUser);

            return { success: true };
        } catch (error) {
            // Handle network errors
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                return { 
                    success: false, 
                    error: 'Cannot connect to server. Make sure the backend is running on http://localhost:5000' 
                };
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Register new user
     */
    async register(email, password, name) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, name })
            });

            if (!response.ok) {
                let errorMessage = 'Registration failed';
                try {
                    const error = await response.json();
                    errorMessage = error.message || errorMessage;
                } catch (e) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            this.token = data.token;
            this.currentUser = data.user;

            // Save session locally
            await notesRepository.saveSession(this.token, this.currentUser);

            return { success: true };
        } catch (error) {
            // Handle network errors
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                return { 
                    success: false, 
                    error: 'Cannot connect to server. Make sure the backend is running on http://localhost:5000' 
                };
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout
     */
    async logout() {
        this.token = null;
        this.currentUser = null;
        await notesRepository.clearSession();
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get auth token
     */
    getToken() {
        return this.token;
    }
}

// Export singleton instance
const authManager = new AuthManager();

