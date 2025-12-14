/**
 * IndexedDB Repository for Offline-First Data Storage
 * Handles all local database operations
 */

class NotesRepository {
    constructor() {
        this.db = null;
        this.dbName = CONFIG.DB_NAME;
        this.dbVersion = CONFIG.DB_VERSION;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Notes store
                if (!db.objectStoreNames.contains('notes')) {
                    const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
                    notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    notesStore.createIndex('title', 'title', { unique: false });
                }

                // Sync queue store (for pending sync operations)
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('type', 'type', { unique: false });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // User session store
                if (!db.objectStoreNames.contains('session')) {
                    db.createObjectStore('session', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Save user session locally
     */
    async saveSession(token, user) {
        const transaction = this.db.transaction(['session'], 'readwrite');
        const store = transaction.objectStore('session');
        await store.put({ key: 'token', value: token });
        await store.put({ key: 'user', value: user });
    }

    /**
     * Get user session
     */
    async getSession() {
        const transaction = this.db.transaction(['session'], 'readonly');
        const store = transaction.objectStore('session');
        
        const token = await store.get('token');
        const user = await store.get('user');
        
        return {
            token: token?.value || null,
            user: user?.value || null
        };
    }

    /**
     * Clear user session
     */
    async clearSession() {
        const transaction = this.db.transaction(['session'], 'readwrite');
        const store = transaction.objectStore('session');
        await store.clear();
    }

    /**
     * Create a new note locally
     */
    async createNote(note) {
        const transaction = this.db.transaction(['notes'], 'readwrite');
        const store = transaction.objectStore('notes');
        
        const noteData = {
            id: note.id || this.generateId(),
            title: note.title || 'Untitled',
            content: note.content || '',
            tags: note.tags || [],
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: note.updatedAt || new Date().toISOString(),
            synced: false,
            deleted: false
        };

        await store.put(noteData);
        return noteData;
    }

    /**
     * Get all notes (excluding deleted)
     */
    async getAllNotes() {
        const transaction = this.db.transaction(['notes'], 'readonly');
        const store = transaction.objectStore('notes');
        const index = store.index('updatedAt');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev');
            const notes = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const note = cursor.value;
                    if (!note.deleted) {
                        notes.push(note);
                    }
                    cursor.continue();
                } else {
                    resolve(notes);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a note by ID
     */
    async getNoteById(id) {
        const transaction = this.db.transaction(['notes'], 'readonly');
        const store = transaction.objectStore('notes');
        return store.get(id);
    }

    /**
     * Update a note locally
     */
    async updateNote(id, updates) {
        const transaction = this.db.transaction(['notes'], 'readwrite');
        const store = transaction.objectStore('notes');
        
        const note = await store.get(id);
        if (!note) throw new Error('Note not found');

        const updatedNote = {
            ...note,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Only set synced to false if not explicitly set in updates
        if (!('synced' in updates)) {
            updatedNote.synced = false;
        }

        await store.put(updatedNote);
        return updatedNote;
    }

    /**
     * Delete a note (soft delete)
     */
    async deleteNote(id) {
        return this.updateNote(id, { deleted: true, synced: false });
    }

    /**
     * Get notes that need syncing
     */
    async getUnsyncedNotes() {
        const notes = await this.getAllNotes();
        return notes.filter(note => !note.synced || note.deleted);
    }

    /**
     * Mark note as synced
     */
    async markSynced(id) {
        const transaction = this.db.transaction(['notes'], 'readwrite');
        const store = transaction.objectStore('notes');
        const note = await store.get(id);
        
        if (note) {
            note.synced = true;
            await store.put(note);
        }
    }

    /**
     * Add operation to sync queue
     */
    async addToSyncQueue(operation) {
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        
        const queueItem = {
            type: operation.type, // 'create', 'update', 'delete'
            noteId: operation.noteId,
            data: operation.data,
            timestamp: new Date().toISOString()
        };

        await store.add(queueItem);
    }

    /**
     * Get sync queue items
     */
    async getSyncQueue() {
        const transaction = this.db.transaction(['syncQueue'], 'readonly');
        const store = transaction.objectStore('syncQueue');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Remove item from sync queue
     */
    async removeFromSyncQueue(id) {
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        await store.delete(id);
    }

    /**
     * Search notes by query
     */
    async searchNotes(query) {
        const notes = await this.getAllNotes();
        const lowerQuery = query.toLowerCase();
        
        return notes.filter(note => {
            const titleMatch = note.title.toLowerCase().includes(lowerQuery);
            const contentMatch = note.content.toLowerCase().includes(lowerQuery);
            const tagMatch = note.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
            
            return titleMatch || contentMatch || tagMatch;
        });
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
const notesRepository = new NotesRepository();

