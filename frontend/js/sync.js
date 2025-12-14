/**
 * Sync Manager - Handles synchronization between local and remote storage
 * Implements offline-first strategy with automatic background sync
 */

class SyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.syncInterval = null;
        this.setupEventListeners();
    }

    /**
     * Setup online/offline event listeners
     */
    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateSyncStatus();
            this.sync();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateSyncStatus();
        });

        // Start periodic sync when online
        this.startPeriodicSync();
    }

    /**
     * Update UI sync status indicator
     */
    updateSyncStatus() {
        const indicator = document.querySelector('.sync-indicator');
        const text = document.querySelector('.sync-text');
        
        if (!indicator || !text) return;

        if (this.isOnline) {
            if (this.isSyncing) {
                indicator.className = 'sync-indicator syncing';
                text.textContent = 'Syncing...';
            } else {
                indicator.className = 'sync-indicator online';
                text.textContent = 'Online';
            }
        } else {
            indicator.className = 'sync-indicator offline';
            text.textContent = 'Offline';
        }
    }

    /**
     * Start periodic background sync
     */
    startPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(() => {
            if (this.isOnline && !this.isSyncing) {
                this.sync();
            }
        }, CONFIG.SYNC_INTERVAL);
    }

    /**
     * Main sync function - syncs all unsynced notes
     */
    async sync() {
        if (!this.isOnline || this.isSyncing) {
            return;
        }

        try {
            this.isSyncing = true;
            this.updateSyncStatus();

            const session = await notesRepository.getSession();
            if (!session.token) {
                this.isSyncing = false;
                this.updateSyncStatus();
                return;
            }

            // Get all unsynced notes
            const unsyncedNotes = await notesRepository.getUnsyncedNotes();

            // Sync each note
            for (const note of unsyncedNotes) {
                try {
                    if (note.deleted) {
                        await this.syncDelete(note.id, session.token);
                    } else if (!note.synced) {
                        // Check if note exists on server
                        const serverNote = await this.getNoteFromServer(note.id, session.token);
                        
                        if (serverNote) {
                            // Note exists - update it (with conflict resolution)
                            await this.syncUpdate(note, serverNote, session.token);
                        } else {
                            // New note - create on server
                            await this.syncCreate(note, session.token);
                        }
                    }
                } catch (error) {
                    console.error(`Error syncing note ${note.id}:`, error);
                    // Continue with other notes even if one fails
                }
            }

            // Fetch latest notes from server
            await this.fetchLatestNotes(session.token);

        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            this.isSyncing = false;
            this.updateSyncStatus();
        }
    }

    /**
     * Sync create operation
     */
    async syncCreate(note, token) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: note.title,
                    content: note.content,
                    tags: note.tags,
                    localId: note.id // For mapping local to server ID
                })
            });

            if (response.ok) {
                const serverNote = await response.json();
                // If server returned different ID, we need to replace the note
                if (serverNote.id !== note.id) {
                    // Delete old note and create new one with server ID
                    const transaction = notesRepository.db.transaction(['notes'], 'readwrite');
                    const store = transaction.objectStore('notes');
                    await store.delete(note.id);
                    
                    const newNote = {
                        ...note,
                        id: serverNote.id,
                        synced: true
                    };
                    await store.put(newNote);
                } else {
                    // Same ID, just mark as synced
                    await notesRepository.markSynced(note.id);
                }
            }
        } catch (error) {
            console.error('Error creating note on server:', error);
            throw error;
        }
    }

    /**
     * Sync update operation with conflict resolution
     */
    async syncUpdate(localNote, serverNote, token) {
        // Conflict resolution: Use most recent update
        const localTime = new Date(localNote.updatedAt);
        const serverTime = new Date(serverNote.updatedAt);

        if (localTime > serverTime) {
            // Local is newer - push to server
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/notes/${serverNote.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: localNote.title,
                        content: localNote.content,
                        tags: localNote.tags
                    })
                });

                if (response.ok) {
                    await notesRepository.markSynced(localNote.id);
                }
            } catch (error) {
                console.error('Error updating note on server:', error);
                throw error;
            }
        } else {
            // Server is newer - pull from server
            await notesRepository.updateNote(localNote.id, {
                title: serverNote.title,
                content: serverNote.content,
                tags: serverNote.tags,
                synced: true
            });
            
            // Trigger UI update
            if (window.notesUI) {
                window.notesUI.refreshNotesList();
            }
        }
    }

    /**
     * Sync delete operation
     */
    async syncDelete(noteId, token) {
        try {
            // First, try to get the note
            const localNote = await notesRepository.getNoteById(noteId);
            if (!localNote) {
                return; // Already deleted
            }
            
            if (localNote.synced === false) {
                // Note was never synced, just remove locally
                const transaction = notesRepository.db.transaction(['notes'], 'readwrite');
                const store = transaction.objectStore('notes');
                await store.delete(noteId);
                return;
            }

            // Try to delete on server
            const response = await fetch(`${CONFIG.API_BASE_URL}/notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Remove from local DB regardless (soft delete was already done)
            const transaction = notesRepository.db.transaction(['notes'], 'readwrite');
            const store = transaction.objectStore('notes');
            await store.delete(noteId);
        } catch (error) {
            console.error('Error deleting note on server:', error);
            // Still remove locally if it was never synced
            const localNote = await notesRepository.getNoteById(noteId);
            if (localNote && !localNote.synced) {
                const transaction = notesRepository.db.transaction(['notes'], 'readwrite');
                const store = transaction.objectStore('notes');
                await store.delete(noteId);
            }
        }
    }

    /**
     * Get note from server
     */
    async getNoteFromServer(noteId, token) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/notes/${noteId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Fetch latest notes from server
     */
    async fetchLatestNotes(token) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/notes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const serverNotes = await response.json();
                
                // Merge with local notes
                for (const serverNote of serverNotes) {
                    const localNote = await notesRepository.getNoteById(serverNote.id);
                    
                    if (!localNote) {
                        // New note from server - add locally
                        await notesRepository.createNote({
                            ...serverNote,
                            synced: true
                        });
                    } else {
                        // Check if server version is newer
                        const localTime = new Date(localNote.updatedAt);
                        const serverTime = new Date(serverNote.updatedAt);
                        
                        if (serverTime > localTime && localNote.synced) {
                            // Server is newer and local was already synced - update
                            await notesRepository.updateNote(serverNote.id, {
                                title: serverNote.title,
                                content: serverNote.content,
                                tags: serverNote.tags,
                                synced: true
                            });
                        }
                    }
                }

                // Refresh UI
                if (window.notesUI) {
                    window.notesUI.refreshNotesList();
                }
            }
        } catch (error) {
            console.error('Error fetching notes from server:', error);
        }
    }

    /**
     * Manual sync trigger
     */
    async forceSync() {
        await this.sync();
    }
}

// Export singleton instance
const syncManager = new SyncManager();

