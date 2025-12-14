# 🔧 Troubleshooting Guide

## "Failed to Fetch" Error

This error typically means the frontend cannot connect to the backend. Follow these steps:

### Step 1: Check if Backend is Running

1. **Open a terminal/command prompt**
2. **Navigate to backend folder**
   ```bash
   cd backend
   ```
3. **Check if server is running**
   - You should see: `Running on http://0.0.0.0:5000`
   - If not, start it:
     ```bash
     python app.py
     ```

### Step 2: Verify Backend is Accessible

1. **Open browser**
2. **Go to**: `http://localhost:5000/api/health`
3. **You should see**: `{"status":"ok"}`
4. **If you see an error**, the backend is not running correctly

### Step 3: Check Port Conflicts

- **Port 5000 might be in use**
- **Try changing the port** in `backend/app.py`:
  ```python
  app.run(debug=True, host='0.0.0.0', port=5001)  # Change to 5001
  ```
- **Update** `frontend/js/config.js`:
  ```javascript
  API_BASE_URL: 'http://localhost:5001/api',  // Match the port
  ```

### Step 4: Check CORS Configuration

The backend should have CORS enabled. Verify in `backend/app.py`:
```python
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
```

### Step 5: Check Browser Console

1. **Open DevTools** (F12)
2. **Go to Console tab**
3. **Look for specific error messages**
4. **Go to Network tab**
   - Check if requests are being made
   - Check the status codes
   - Check if requests are blocked

### Step 6: Common Issues

#### Issue: "CORS policy" error
**Solution**: Make sure CORS is configured in backend (see Step 4)

#### Issue: "Connection refused"
**Solution**: Backend is not running (see Step 1)

#### Issue: "404 Not Found"
**Solution**: Check API URL in `frontend/js/config.js` matches backend routes

#### Issue: Frontend served from file://
**Solution**: 
- Must use HTTP server (not file://)
- Use `python -m http.server 8000` or Live Server

### Step 7: Test Backend Directly

Use curl or Postman to test:

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test"}'
```

### Step 8: Check Firewall/Antivirus

- Some firewalls block localhost connections
- Temporarily disable to test
- Add exception for localhost:5000

### Step 9: Verify Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Make sure all packages are installed:
- Flask
- Flask-CORS
- Flask-SQLAlchemy
- Flask-Bcrypt
- Flask-JWT-Extended

### Step 10: Check Database

The backend creates `notes.db` automatically. If there are issues:
```bash
cd backend
# Delete old database
rm notes.db  # or del notes.db on Windows
# Restart server - it will recreate
python app.py
```

## Quick Diagnostic Checklist

- [ ] Backend is running (`python app.py` in backend folder)
- [ ] Backend accessible at `http://localhost:5000/api/health`
- [ ] Frontend served via HTTP (not file://)
- [ ] Port 5000 is not blocked
- [ ] CORS is configured in backend
- [ ] API_BASE_URL in config.js matches backend port
- [ ] No firewall blocking localhost
- [ ] All Python dependencies installed
- [ ] Browser console shows specific error (not just "failed to fetch")

## Still Having Issues?

1. **Check browser console** for detailed error
2. **Check backend terminal** for error messages
3. **Try different browser** (Chrome, Firefox, Edge)
4. **Try incognito/private mode** (rules out extensions)
5. **Check if other apps use port 5000**

## Alternative: Use Different Ports

If port 5000 is problematic:

**Backend** (`backend/app.py`):
```python
app.run(debug=True, host='0.0.0.0', port=8001)
```

**Frontend** (`frontend/js/config.js`):
```javascript
API_BASE_URL: 'http://localhost:8001/api',
```

**Frontend Server**:
```bash
python -m http.server 8000  # Keep frontend on 8000
```

---

**Most common fix**: Make sure backend is running! 🚀

