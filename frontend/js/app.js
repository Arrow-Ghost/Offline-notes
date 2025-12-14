/**
 * Main Application Entry Point
 * Initializes all components and manages app lifecycle
 */

class App {
    constructor() {
        this.initialized = false;
    }

    /**
     * Test backend connection
     */
    async testBackendConnection() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/health`);
            return response.ok;
        } catch (error) {
            console.warn('Backend connection test failed:', error);
            return false;
        }
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            // Initialize IndexedDB
            await notesRepository.init();
            console.log('Database initialized');

            // Test backend connection
            const backendAvailable = await this.testBackendConnection();
            if (!backendAvailable) {
                console.warn('Backend not available. App will work offline only.');
                // Show warning but continue
                if (!await authManager.init()) {
                    // No cached session and backend unavailable
                    const errorDiv = document.getElementById('auth-error');
                    if (errorDiv) {
                        errorDiv.textContent = '⚠️ Backend server not running. Please start the backend server on http://localhost:5000';
                        errorDiv.style.display = 'block';
                        errorDiv.style.background = 'rgba(245, 158, 11, 0.1)';
                        errorDiv.style.borderColor = 'var(--warning)';
                        errorDiv.style.color = 'var(--warning)';
                    }
                }
            }

            // Initialize auth
            const hasSession = await authManager.init();
            
            if (hasSession) {
                // User is logged in - show app
                uiManager.showApp();
                // Start initial sync
                if (syncManager.isOnline && backendAvailable) {
                    await syncManager.sync();
                }
            } else {
                // Show auth screen
                uiManager.showAuth();
            }

            // Initialize UI
            uiManager.init();

            // Initialize sync status
            syncManager.updateSyncStatus();

            this.initialized = true;
            console.log('App initialized');

        } catch (error) {
            console.error('App initialization error:', error);
            alert('Failed to initialize app. Please refresh the page.');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.init();
});

// Register service worker for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

