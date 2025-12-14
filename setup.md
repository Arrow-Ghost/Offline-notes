# Quick Setup Guide

## Backend Setup (5 minutes)

1. **Open terminal in `backend` folder**

2. **Create virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run server**
   ```bash
   python app.py
   ```
   
   Server runs on `http://localhost:5000`

## Frontend Setup (2 minutes)

1. **Open new terminal in `frontend` folder**

2. **Start HTTP server** (choose one):
   
   **Option A: Python**
   ```bash
   python -m http.server 8000
   ```
   
   **Option B: Node.js**
   ```bash
   npx http-server -p 8000
   ```

3. **Open browser**
   ```
   http://localhost:8000
   ```

## First Use

1. Click "Sign Up" on the login screen
2. Enter email, password, and optional name
3. Click "Sign Up"
4. Start creating notes!

## Testing Offline Mode

1. Open browser DevTools (F12)
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Create/edit notes - they work offline!
5. Go back online - notes sync automatically

## Troubleshooting

**Backend won't start?**
- Make sure Python 3.8+ is installed
- Check if port 5000 is free
- Try: `pip install --upgrade -r requirements.txt`

**Frontend can't connect?**
- Make sure backend is running on port 5000
- Check browser console for errors
- Verify `API_BASE_URL` in `frontend/js/config.js`

**Service Worker issues?**
- Must use localhost or HTTPS
- Clear browser cache
- Check browser console

---

That's it! You're ready to use your offline-first notes app! 🎉

