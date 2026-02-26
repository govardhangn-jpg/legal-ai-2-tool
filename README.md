# 🚀 COMPLETE SETUP GUIDE - Indian Legal AI Assistant

## 📁 Files You Received

```
legal-ai-tool/
│
├── index.html              ✅ Main application
│
├── js/                     ✅ ALL JavaScript files
│   ├── config.js          ✅ Configuration
│   ├── prompts.js         ✅ Legal prompts
│   ├── api.js             ✅ API integration
│   ├── ui.js              ✅ User interface
│   └── app.js             ✅ Main app
│
└── backend/                ✅ Backend server
    ├── package.json       ✅ Dependencies
    ├── server.js          ✅ Server code
    └── .env               ✅ API key config
```

## ⚡ QUICK START (3 Steps)

### Step 1: Setup Backend

```bash
# Navigate to your project folder
cd "C:\GN Docs\legal-ai-tool"

# Go to backend folder
cd backend

# Install dependencies (FIRST TIME ONLY)
npm install

# Edit .env file and add your API key
notepad .env
```

In `.env` file, replace with your actual API key:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-from-console
PORT=3000
```

### Step 2: Start Backend Server

```bash
# Make sure you're in backend folder
cd backend

# Start server
npm start
```

You should see:
```
🚀 ========================================
   Legal AI Backend Server Started!
========================================
📡 Server: http://localhost:3000
✅ API key configured
```

**KEEP THIS TERMINAL OPEN!**

### Step 3: Start Frontend

**Open NEW terminal/command prompt:**

```bash
# Go to main project folder (NOT backend)
cd "C:\GN Docs\legal-ai-tool"

# Start frontend
python -m http.server 8000
```

You should see:
```
Serving HTTP on :: port 8000
```

**KEEP THIS TERMINAL OPEN TOO!**

### Step 4: Open Application

Open browser to: **http://localhost:8000**

## ✅ Verify Everything Works

1. **Backend Health Check**: http://localhost:3000/api/health
   - Should show: `{"status":"ok","message":"Legal AI Backend Running"}`

2. **Frontend**: http://localhost:8000
   - Should load the application

3. **Try Contract Drafting**:
   - Click "Contract Drafting"
   - Select "Employment Contract"
   - Fill in details
   - Click "Generate"
   - Should work without errors!

## 🎯 Two Terminals Must Be Running

**Terminal 1 (Backend):**
```
C:\GN Docs\legal-ai-tool\backend> npm start
✅ Server running on http://localhost:3000
```

**Terminal 2 (Frontend):**
```
C:\GN Docs\legal-ai-tool> python -m http.server 8000
✅ Serving on http://localhost:8000
```

## 🛑 Common Errors FIXED

### Error: "callClaudeAPI not defined"
✅ **FIXED**: All JS files now included (config.js, prompts.js, api.js, ui.js, app.js)

### Error: "CORS policy"
✅ **FIXED**: Using backend server instead of direct API calls

### Error: "Backend server not running"
✅ **SOLUTION**: Start backend first with `npm start`

### Error: "Cannot find module 'express'"
✅ **SOLUTION**: Run `npm install` in backend folder

## 📂 File Locations

Make sure files are in these EXACT locations:

```
C:\GN Docs\legal-ai-tool\
│
├── index.html              ← Main HTML file
│
├── js\                     ← JavaScript folder
│   ├── config.js
│   ├── prompts.js
│   ├── api.js
│   ├── ui.js
│   └── app.js
│
└── backend\                ← Backend folder
    ├── node_modules\       ← Created by npm install
    ├── package.json
    ├── server.js
    └── .env                ← YOUR API KEY HERE
```

## 🔧 Troubleshooting

### Backend won't start
```bash
cd backend
npm install
npm start
```

### Frontend won't load
```bash
# Use Python 3
python -m http.server 8000

# OR if you have Python 2
python -m SimpleHTTPServer 8000
```

### API calls failing
1. Check backend is running: http://localhost:3000/api/health
2. Check .env file has correct API key
3. Check browser console (F12) for errors

## 💡 Quick Commands Reference

```bash
# Start backend
cd backend
npm start

# Start frontend (new terminal)
cd ..
python -m http.server 8000

# Check backend health
curl http://localhost:3000/api/health

# Stop servers
Press Ctrl+C in each terminal
```

## 🎉 You're All Set!

Once both servers are running:
1. Open http://localhost:8000
2. Select a legal service
3. Fill in the details
4. Generate your document!

No more "callClaudeAPI not defined" errors! 🚀

---

**Need Help?**
- Check browser console (F12) for errors
- Verify both servers are running
- Ensure .env has your API key
- Make sure all files are in correct locations

**Working?** 
Give it a try - generate your first contract! ⚖️