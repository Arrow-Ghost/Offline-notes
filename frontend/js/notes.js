/**
 * Notes Manager - Business logic for notes operations
 * Separates data operations from UI logic
 */

class NotesManager {
    constructor() {
        this.currentNoteId = null;
        this.autoSaveTimer = null;
    }

    /**
     * Create a new note
     */
    async createNote() {
        const note = await notesRepository.createNote({
            title: 'Untitled',
            content: '',
            tags: []
        });

        // Queue for sync
        if (syncManager.isOnline) {
            await syncManager.sync();
        }

        return note;
    }

    /**
     * Get all notes
     */
    async getAllNotes() {
        return await notesRepository.getAllNotes();
    }

    /**
     * Get note by ID
     */
    async getNoteById(id) {
        return await notesRepository.getNoteById(id);
    }

    /**
     * Update note (with auto-save)
     */
    async updateNote(id, updates) {
        // Clear existing timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        // Update immediately in UI
        const updatedNote = await notesRepository.updateNote(id, updates);

        // Auto-save after delay
        this.autoSaveTimer = setTimeout(async () => {
            // Trigger sync if online
            if (syncManager.isOnline) {
                await syncManager.sync();
            }
        }, CONFIG.AUTO_SAVE_DELAY);

        return updatedNote;
    }

    /**
     * Delete note
     */
    async deleteNote(id) {
        await notesRepository.deleteNote(id);

        // Sync delete if online
        if (syncManager.isOnline) {
            await syncManager.sync();
        }

        return true;
    }

    /**
     * Search notes
     */
    async searchNotes(query) {
        if (!query || query.trim() === '') {
            return await this.getAllNotes();
        }
        return await notesRepository.searchNotes(query);
    }

    /**
     * Set current note
     */
    setCurrentNote(id) {
        this.currentNoteId = id;
    }

    /**
     * Get current note ID
     */
    getCurrentNoteId() {
        return this.currentNoteId;
    }
}

// Export singleton instance
const notesManager = new NotesManager();

