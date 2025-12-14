# 📝 Notes App - Offline-First Web Application

A production-ready, offline-first notes application with beautiful UI, smooth animations, and automatic synchronization.

## ✨ Features

### Core Features
- ✅ **Offline-First Architecture** - Works 100% offline, syncs when online
- ✅ **Rich Text Editing** - Format text with bold, italic, headings, lists
- ✅ **Tags System** - Organize notes with tags
- ✅ **Search** - Instant local search across all notes
- ✅ **Dark Mode** - Beautiful dark theme with smooth toggle
- ✅ **Auto-Save** - Notes save automatically as you type
- ✅ **Conflict Resolution** - Handles edits from multiple devices intelligently

### UI/UX Features
- 🎨 **Modern Design** - Glassmorphism effects, smooth animations
- 🎭 **Smooth Animations** - Every interaction is animated
- 📱 **Responsive** - Works on desktop and mobile
- ⚡ **Fast** - Instant local operations, background sync

## 🏗️ Architecture

### Frontend
- **HTML/CSS/JavaScript** - Vanilla JS, no frameworks
- **IndexedDB** - Offline storage
- **Service Worker** - Offline caching
- **Modular Architecture** - Clean separation of concerns

### Backend
- **Python Flask** - RESTful API
- **SQLite** - Database (easily switchable to PostgreSQL)
- **JWT Authentication** - Secure token-based auth

### Architecture Layers
1. **UI Layer** (`ui.js`) - Handles all user interactions and animations
2. **Business Logic** (`notes.js`) - Manages notes operations
3. **Data Layer** (`db.js`) - IndexedDB repository
4. **Sync Layer** (`sync.js`) - Handles synchronization
5. **Auth Layer** (`auth.js`) - Authentication management

## 🚀 Setup Instructions

### Prerequisites
- Python 3.8+
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment** (recommended)
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables** (optional)
   ```bash
   cp .env.example .env
   # Edit .env with your secrets
   ```

5. **Run the server**
   ```bash
   python app.py
   ```

   The backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Serve the files** (choose one method)

   **Option A: Python HTTP Server**
   ```bash
   # Python 3
   python -m http.server 8000
   ```

   **Option B: Node.js http-server**
   ```bash
   npx http-server -p 8000
   ```

   **Option C: VS Code Live Server**
   - Install "Live Server" extension
   - Right-click `index.html` → "Open with Live Server"

3. **Open in browser**
   ```
   http://localhost:8000
   ```

## 📖 Usage

### First Time Setup

1. **Register/Login**
   - The app will prompt you to login
   - If you don't have an account, register first (you may need to add a register endpoint or use the login with a new account)

2. **Create Notes**
   - Click "New Note" button
   - Start typing - notes auto-save

3. **Edit Notes**
   - Click any note from the sidebar
   - Use toolbar for formatting
   - Add tags by typing in the tag input and pressing Enter

4. **Search**
   - Click search icon in header
   - Type to search instantly

5. **Offline Mode**
   - Disconnect internet
   - App continues to work
   - When reconnected, syncs automatically

## 🔧 Configuration

### Frontend Config (`frontend/js/config.js`)
```javascript
const CONFIG = {
    API_BASE_URL: 'http://localhost:5000/api',
    DB_NAME: 'NotesApp',
    DB_VERSION: 1,
    SYNC_INTERVAL: 30000, // 30 seconds
    AUTO_SAVE_DELAY: 1000, // 1 second
};
```

### Backend Config
Edit `backend/app.py` or use environment variables:
- `SECRET_KEY` - Flask secret key
- `JWT_SECRET_KEY` - JWT signing key
- `DATABASE_URL` - Database connection string

## 🗄️ Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email
- `password_hash` - Bcrypt hashed password
- `name` - User name
- `created_at` - Timestamp

### Notes Table
- `id` - Primary key (string)
- `user_id` - Foreign key to users
- `title` - Note title
- `content` - Note content (HTML)
- `tags` - JSON array of tags
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `deleted` - Soft delete flag

## 🔄 Sync Strategy

### Offline-First Approach
1. All operations happen locally first
2. Changes are queued for sync
3. When online, sync happens automatically
4. Conflict resolution uses timestamp comparison

### Conflict Resolution
- If local note is newer → Push to server
- If server note is newer → Pull from server
- If same timestamp → Local takes precedence

## 🎨 UI/UX Details

### Animations
- **Note Creation** - Scale and fade in
- **Note Deletion** - Slide out animation
- **Note Selection** - Smooth highlight transition
- **Save Status** - Pulse animation when saving
- **Theme Toggle** - Smooth color transition
- **Button Interactions** - Ripple effects

### Design Elements
- **Glassmorphism** - Frosted glass effects on cards
- **Smooth Shadows** - Layered shadow system
- **Color System** - CSS variables for theming
- **Typography** - System fonts for performance

## 🧪 Testing Offline Functionality

1. **Open DevTools** (F12)
2. **Go to Network tab**
3. **Select "Offline" from throttling dropdown**
4. **Try creating/editing notes** - Should work perfectly
5. **Go back online** - Notes sync automatically

## 📱 Progressive Web App

The app is a PWA and can be installed:
- **Chrome/Edge**: Click install prompt or menu → "Install Notes App"
- **Mobile**: Add to home screen from browser menu

## 🔐 Security Notes

⚠️ **For Production:**
1. Change all secret keys in `.env`
2. Use HTTPS
3. Enable CORS restrictions
4. Use PostgreSQL instead of SQLite
5. Add rate limiting
6. Implement password strength requirements

## 🐛 Troubleshooting

### Backend won't start
- Check Python version (3.8+)
- Ensure all dependencies installed
- Check if port 5000 is available

### Frontend can't connect to backend
- Ensure backend is running
- Check CORS settings
- Verify API_BASE_URL in config.js

### Notes not syncing
- Check browser console for errors
- Verify authentication token
- Check network tab for API calls

### Service Worker not working
- Ensure HTTPS or localhost
- Clear browser cache
- Check browser console for SW errors

## 📝 Development Notes

### Code Structure
```
frontend/
├── index.html          # Main HTML
├── styles/
│   └── main.css        # All styles
├── js/
│   ├── config.js       # Configuration
│   ├── db.js           # IndexedDB repository
│   ├── sync.js         # Sync manager
│   ├── auth.js         # Authentication
│   ├── notes.js        # Notes business logic
│   ├── ui.js           # UI interactions
│   └── app.js          # App initialization
├── sw.js               # Service worker
└── manifest.json       # PWA manifest

backend/
├── app.py              # Flask application
├── requirements.txt    # Python dependencies
└── .env.example        # Environment template
```

### Key Design Decisions

1. **IndexedDB over LocalStorage** - Better for large data, async operations
2. **Repository Pattern** - Clean data layer abstraction
3. **Singleton Managers** - Single source of truth for each concern
4. **Offline-First** - Local operations never fail
5. **Background Sync** - Non-blocking user experience

## 🚀 Future Enhancements

- [ ] Markdown support
- [ ] Note sharing
- [ ] Rich media attachments
- [ ] Note templates
- [ ] Export/Import functionality
- [ ] Collaborative editing
- [ ] Voice notes
- [ ] Note encryption

## 📄 License

This project is open source and available for personal and commercial use.

## 👨‍💻 Development

Built with ❤️ focusing on:
- Clean architecture
- Offline-first design
- Beautiful UI/UX
- Production-ready code

---

**Enjoy your offline-first notes app!** 📝✨

