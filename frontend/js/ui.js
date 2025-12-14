/**
 * UI Manager - Handles all UI interactions and animations
 * Separates presentation logic from business logic
 */

class UIManager {
    constructor() {
        this.searchQuery = '';
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.isRegisterMode = false;
    }

    /**
     * Initialize UI
     */
    init() {
        this.setupEventListeners();
        this.applyTheme(this.currentTheme);
        this.setupEditorToolbar();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Auth form
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('submit', this.handleAuthSubmit.bind(this));
        }

        // Auth toggle (login/register)
        const authToggleBtn = document.getElementById('auth-toggle-btn');
        if (authToggleBtn) {
            authToggleBtn.addEventListener('click', () => this.toggleAuthMode());
        }

        // New note button
        const newNoteBtn = document.getElementById('new-note-btn');
        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', this.handleNewNote.bind(this));
        }

        // Search
        const searchBtn = document.getElementById('search-btn');
        const closeSearchBtn = document.getElementById('close-search');
        const searchInput = document.getElementById('search-input');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.toggleSearch());
        }
        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', () => this.toggleSearch());
        }
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Editor
        const noteTitle = document.getElementById('note-title');
        const noteEditor = document.getElementById('note-editor');
        const saveBtn = document.getElementById('save-note');
        const deleteBtn = document.getElementById('delete-note');

        if (noteTitle) {
            noteTitle.addEventListener('input', () => this.handleTitleChange());
        }
        if (noteEditor) {
            noteEditor.addEventListener('input', () => this.handleContentChange());
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSave());
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDelete());
        }

        // Keyboard shortcut: Ctrl+S or Cmd+S to save
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const editorContainer = document.getElementById('editor-container');
                if (editorContainer && editorContainer.style.display !== 'none') {
                    this.handleSave();
                }
            }
        });

        // Tags
        const tagInput = document.getElementById('tag-input');
        if (tagInput) {
            tagInput.addEventListener('keydown', (e) => this.handleTagInput(e));
        }
    }

    /**
     * Handle authentication form submit
     */
    async handleAuthSubmit(e) {
        e.preventDefault();
        
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        const name = document.getElementById('name-input')?.value || '';
        const submitBtn = document.getElementById('auth-submit');
        const errorDiv = document.getElementById('auth-error');

        // Show loading
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loader').style.display = 'block';
        errorDiv.style.display = 'none';

        let result;
        if (this.isRegisterMode) {
            result = await authManager.register(email, password, name);
        } else {
            result = await authManager.login(email, password);
        }

        if (result.success) {
            this.showApp();
        } else {
            errorDiv.textContent = result.error || (this.isRegisterMode ? 'Registration failed' : 'Login failed');
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').style.display = 'block';
            submitBtn.querySelector('.btn-loader').style.display = 'none';
        }
    }

    /**
     * Toggle between login and register mode
     */
    toggleAuthMode() {
        this.isRegisterMode = !this.isRegisterMode;
        
        const nameGroup = document.getElementById('name-group');
        const submitBtn = document.getElementById('auth-submit');
        const toggleText = document.getElementById('auth-toggle-text');
        const toggleBtn = document.getElementById('auth-toggle-btn');
        const btnText = submitBtn.querySelector('.btn-text');

        if (this.isRegisterMode) {
            nameGroup.style.display = 'block';
            btnText.textContent = 'Sign Up';
            toggleText.textContent = 'Already have an account?';
            toggleBtn.textContent = 'Sign In';
        } else {
            nameGroup.style.display = 'none';
            btnText.textContent = 'Sign In';
            toggleText.textContent = "Don't have an account?";
            toggleBtn.textContent = 'Sign Up';
        }
    }

    /**
     * Show app screen
     */
    showApp() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        this.refreshNotesList();
    }

    /**
     * Show auth screen
     */
    showAuth() {
        document.getElementById('app-screen').classList.remove('active');
        document.getElementById('auth-screen').classList.add('active');
    }

    /**
     * Handle new note creation
     */
    async handleNewNote() {
        const note = await notesManager.createNote();
        await this.displayNote(note);
        this.refreshNotesList();
    }

    /**
     * Refresh notes list
     */
    async refreshNotesList() {
        const notes = await notesManager.getAllNotes();
        const notesList = document.getElementById('notes-list');
        
        if (!notesList) return;

        notesList.innerHTML = '';

        notes.forEach(note => {
            const noteItem = this.createNoteItem(note);
            notesList.appendChild(noteItem);
        });
    }

    /**
     * Create note item element
     */
    createNoteItem(note) {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.dataset.noteId = note.id;

        const preview = note.content.substring(0, 100).replace(/<[^>]*>/g, '');

        item.innerHTML = `
            <div class="note-item-title">${this.escapeHtml(note.title || 'Untitled')}</div>
            <div class="note-item-preview">${this.escapeHtml(preview || 'No content')}</div>
            <div class="note-item-meta">
                <div class="note-item-tags">
                    ${note.tags.slice(0, 3).map(tag => `<span class="note-tag">${this.escapeHtml(tag)}</span>`).join('')}
                </div>
                <span>${this.formatDate(note.updatedAt)}</span>
            </div>
        `;

        item.addEventListener('click', () => this.displayNote(note));

        return item;
    }

    /**
     * Display note in editor
     */
    async displayNote(note) {
        const emptyState = document.getElementById('empty-state');
        const editorContainer = document.getElementById('editor-container');
        const noteTitle = document.getElementById('note-title');
        const noteEditor = document.getElementById('note-editor');
        const noteDate = document.getElementById('note-date');
        const tagsContainer = document.getElementById('tags-container');

        // Hide empty state, show editor
        emptyState.style.display = 'none';
        editorContainer.style.display = 'flex';

        // Update active note in list
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.noteId === note.id) {
                item.classList.add('active');
            }
        });

        // Set note data
        notesManager.setCurrentNote(note.id);
        noteTitle.value = note.title || 'Untitled';
        noteEditor.innerHTML = note.content || '';
        noteDate.textContent = this.formatDate(note.updatedAt);

        // Render tags
        this.renderTags(note.tags || []);

        // Animate editor appearance
        editorContainer.style.animation = 'fadeIn 0.3s ease-out';
    }

    /**
     * Handle title change
     */
    async handleTitleChange() {
        const noteId = notesManager.getCurrentNoteId();
        if (!noteId) return;

        const title = document.getElementById('note-title').value;
        await notesManager.updateNote(noteId, { title });
        this.updateSaveStatus('saving');
        
        // Update in list
        const noteItem = document.querySelector(`[data-note-id="${noteId}"]`);
        if (noteItem) {
            noteItem.querySelector('.note-item-title').textContent = title || 'Untitled';
        }
    }

    /**
     * Handle content change
     */
    async handleContentChange() {
        const noteId = notesManager.getCurrentNoteId();
        if (!noteId) return;

        const content = document.getElementById('note-editor').innerHTML;
        await notesManager.updateNote(noteId, { content });
        this.updateSaveStatus('saving');
    }

    /**
     * Handle save button
     */
    async handleSave() {
        try {
            // Show saving state
            const saveBtn = document.getElementById('save-note');
            if (saveBtn) {
                saveBtn.classList.add('saving');
            }
            this.updateSaveStatus('saving');
            
            let noteId = notesManager.getCurrentNoteId();
            
            // If no note is selected, create a new one
            if (!noteId) {
                const title = document.getElementById('note-title').value || 'Untitled';
                const content = document.getElementById('note-editor').innerHTML || '';
                const tags = this.getTags();
                
                const newNote = await notesManager.createNote();
                noteId = newNote.id;
                notesManager.setCurrentNote(noteId);
                
                // Update the note with the current content
                await notesRepository.updateNote(noteId, { title, content, tags });
                this.refreshNotesList();
            } else {
                const title = document.getElementById('note-title').value;
                const content = document.getElementById('note-editor').innerHTML;
                const tags = this.getTags();

                await notesManager.updateNote(noteId, { title, content, tags });
            }
            
            this.updateSaveStatus('saved');
            
            // Update note in sidebar
            const noteItem = document.querySelector(`[data-note-id="${noteId}"]`);
            if (noteItem) {
                const title = document.getElementById('note-title').value || 'Untitled';
                const preview = document.getElementById('note-editor').innerText.substring(0, 100) || 'No content';
                noteItem.querySelector('.note-item-title').textContent = title;
                noteItem.querySelector('.note-item-preview').textContent = preview;
            }

            // Force sync
            if (syncManager.isOnline) {
                await syncManager.forceSync();
            }
            
            // Show success feedback
            const saveBtn = document.getElementById('save-note');
            if (saveBtn) {
                saveBtn.classList.remove('saving');
                saveBtn.classList.add('saved');
                setTimeout(() => {
                    saveBtn.classList.remove('saved');
                }, 1000);
            }
            
        } catch (error) {
            console.error('Save error:', error);
            this.updateSaveStatus('error');
            alert('Failed to save note: ' + error.message);
        }
    }

    /**
     * Handle delete
     */
    async handleDelete() {
        const noteId = notesManager.getCurrentNoteId();
        if (!noteId) return;

        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }

        // Animate deletion
        const noteItem = document.querySelector(`[data-note-id="${noteId}"]`);
        if (noteItem) {
            noteItem.classList.add('deleting');
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        await notesManager.deleteNote(noteId);
        
        // Hide editor
        document.getElementById('empty-state').style.display = 'flex';
        document.getElementById('editor-container').style.display = 'none';
        
        notesManager.setCurrentNote(null);
        this.refreshNotesList();
    }

    /**
     * Toggle search
     */
    toggleSearch() {
        const searchBar = document.getElementById('search-bar');
        const isVisible = searchBar.style.display !== 'none';
        
        searchBar.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            document.getElementById('search-input').focus();
        } else {
            this.searchQuery = '';
            document.getElementById('search-input').value = '';
            this.refreshNotesList();
        }
    }

    /**
     * Handle search input
     */
    async handleSearch(query) {
        this.searchQuery = query;
        const notes = await notesManager.searchNotes(query);
        
        const notesList = document.getElementById('notes-list');
        notesList.innerHTML = '';

        notes.forEach(note => {
            const noteItem = this.createNoteItem(note);
            notesList.appendChild(noteItem);
        });
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    /**
     * Apply theme
     */
    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        await authManager.logout();
        this.showAuth();
    }

    /**
     * Setup editor toolbar
     */
    setupEditorToolbar() {
        const toolbarBtns = document.querySelectorAll('.toolbar-btn');
        toolbarBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                this.applyFormat(format);
                btn.classList.toggle('active');
            });
        });
    }

    /**
     * Apply text format
     */
    applyFormat(format) {
        const editor = document.getElementById('note-editor');
        if (!editor) return;

        document.execCommand(format, false, null);
        editor.focus();
    }

    /**
     * Render tags
     */
    renderTags(tags) {
        const container = document.getElementById('tags-container');
        const tagInput = document.getElementById('tag-input');
        
        // Clear existing tags (except input)
        const existingTags = container.querySelectorAll('.tag');
        existingTags.forEach(tag => tag.remove());

        // Add tags
        tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.innerHTML = `
                ${this.escapeHtml(tag)}
                <span class="tag-remove" data-tag="${this.escapeHtml(tag)}">×</span>
            `;
            
            tagEl.querySelector('.tag-remove').addEventListener('click', () => {
                this.removeTag(tag);
            });
            
            container.insertBefore(tagEl, tagInput);
        });
    }

    /**
     * Handle tag input
     */
    handleTagInput(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const input = e.target;
            const tag = input.value.trim();
            
            if (tag) {
                this.addTag(tag);
                input.value = '';
            }
        }
    }

    /**
     * Add tag
     */
    async addTag(tag) {
        const noteId = notesManager.getCurrentNoteId();
        if (!noteId) return;

        const note = await notesManager.getNoteById(noteId);
        const tags = note.tags || [];
        
        if (!tags.includes(tag)) {
            tags.push(tag);
            await notesManager.updateNote(noteId, { tags });
            this.renderTags(tags);
        }
    }

    /**
     * Remove tag
     */
    async removeTag(tag) {
        const noteId = notesManager.getCurrentNoteId();
        if (!noteId) return;

        const note = await notesManager.getNoteById(noteId);
        const tags = (note.tags || []).filter(t => t !== tag);
        
        await notesManager.updateNote(noteId, { tags });
        this.renderTags(tags);
    }

    /**
     * Get current tags
     */
    getTags() {
        const container = document.getElementById('tags-container');
        const tags = [];
        container.querySelectorAll('.tag').forEach(tagEl => {
            const tagText = tagEl.textContent.replace('×', '').trim();
            if (tagText) tags.push(tagText);
        });
        return tags;
    }

    /**
     * Update save status
     */
    updateSaveStatus(status) {
        const saveStatus = document.getElementById('save-status');
        if (!saveStatus) return;

        saveStatus.className = `save-status ${status}`;
        
        if (status === 'saving') {
            saveStatus.textContent = 'Saving...';
        } else if (status === 'saved') {
            saveStatus.textContent = 'Saved';
            setTimeout(() => {
                if (saveStatus.textContent === 'Saved') {
                    saveStatus.textContent = '';
                }
            }, 2000);
        } else if (status === 'error') {
            saveStatus.textContent = 'Error';
            saveStatus.style.color = 'var(--danger)';
            setTimeout(() => {
                saveStatus.textContent = '';
                saveStatus.style.color = '';
            }, 3000);
        }
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return 'Today';
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export singleton instance
const uiManager = new UIManager();
window.notesUI = uiManager; // For sync manager access

