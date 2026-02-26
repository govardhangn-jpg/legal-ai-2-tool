# Indian Legal AI Assistant - Windows Setup Guide

## 📦 What You Have Downloaded

You have the complete source code for the Indian Legal AI Assistant with the following structure:

```
legal-ai-tool/
│
├── index.html                 # Main application file - OPEN THIS
│
├── css/                       # Stylesheets folder
│   ├── variables.css          # Design tokens (colors, spacing)
│   ├── base.css               # Basic styles
│   ├── components.css         # UI components
│   ├── layout.css             # Page layout
│   └── responsive.css         # Mobile/tablet styles
│
├── js/                        # JavaScript folder
│   ├── config.js              # App configuration
│   ├── prompts.js             # Legal prompt templates
│   ├── api.js                 # Claude API calls
│   ├── ui.js                  # User interface logic
│   └── app.js                 # Main application
│
└── docs/                      # Documentation folder
    ├── USER_GUIDE.md          # For lawyers
    └── TECHNICAL_README.md    # For developers
```

## 🚀 Quick Start (Windows)

### Option 1: Direct File Open (Easiest)

1. **Extract the ZIP file** to a folder on your computer
   - Example: `C:\legal-ai-tool\`

2. **Open index.html**
   - Right-click on `index.html`
   - Select "Open with" → Your web browser (Chrome, Edge, Firefox)

3. **Get API Key**
   - Visit: https://console.anthropic.com/
   - Sign up and create an API key
   - Copy the key (starts with `sk-ant-`)

4. **Start Using**
   - Paste your API key in the tool
   - Select a legal service (Contract/Research/Opinion)
   - Fill in details and generate!

### Option 2: Using Local Web Server (Recommended for Development)

**Using Python (if installed):**

```bash
# Open Command Prompt or PowerShell in the project folder
cd C:\path\to\legal-ai-tool

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Then open browser to:
http://localhost:8000
```

**Using Node.js (if installed):**

```bash
# Install http-server globally (one time)
npm install -g http-server

# Run in project folder
cd C:\path\to\legal-ai-tool
http-server -p 8000

# Open browser to:
http://localhost:8000
```

**Using VS Code (if installed):**

1. Install "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

## 🖥️ Windows-Specific Notes

### File Paths in Windows

The paths you saw in our conversation were **Linux paths** from my development environment:
- ❌ `/home/claude/legal-ai-tool/` (Linux - won't work on Windows)
- ✅ `C:\Users\YourName\legal-ai-tool\` (Windows - use this format)

### Running Commands

**Don't try to run these Linux commands in GitBash:**
```bash
# These are from Linux environment - DON'T USE
cd /home/claude
cat indian-legal-ai.html
```

**Instead, use Windows commands:**
```bash
# In Command Prompt or PowerShell
cd C:\legal-ai-tool
type index.html        # View file content
notepad index.html     # Edit file
explorer .             # Open folder in File Explorer
```

### GitBash on Windows

If using GitBash, paths are different:
```bash
# Windows path in GitBash format
cd /c/legal-ai-tool/
# or
cd ~/Documents/legal-ai-tool/
```

## 📝 Project Structure Explained

### HTML File (index.html)
- Main application page
- Contains the UI structure
- Links to CSS and JS files

### CSS Files (css/ folder)

1. **variables.css**: Design system
   - Colors: `--primary`, `--secondary`, `--accent`
   - Spacing: `--spacing-sm`, `--spacing-md`
   - Easy to customize brand colors here

2. **base.css**: Foundation styles
   - Typography
   - Form elements
   - Reset styles

3. **components.css**: UI components
   - Buttons
   - Cards
   - Loading spinner
   - Error messages

4. **layout.css**: Page structure
   - Header
   - Container
   - Grid layouts

5. **responsive.css**: Mobile optimization
   - Tablet styles
   - Mobile styles
   - Print styles

### JavaScript Files (js/ folder)

1. **config.js**: Configuration
   - API settings
   - Mode definitions
   - Messages and titles
   - Easy to modify settings here

2. **prompts.js**: Legal templates
   - Contract prompt builder
   - Research prompt builder
   - Opinion prompt builder
   - Input validation

3. **api.js**: Claude API integration
   - API call with retry logic
   - Rate limit handling
   - Error management
   - Cost calculation

4. **ui.js**: User interface
   - Mode selection
   - Form handling
   - Result display
   - Error/loading states

5. **app.js**: Application core
   - Initialization
   - Browser compatibility
   - Settings management
   - Global error handling

## 🎨 Customization Guide

### Change Colors

Edit `css/variables.css`:

```css
:root {
    --primary: #1a1a2e;      /* Header color */
    --secondary: #8b4513;    /* Main accent */
    --accent: #d4af37;       /* Highlights */
}
```

### Change Branding

Edit `index.html` line ~13:

```html
<h1>⚖️ Your Law Firm Name</h1>
<p class="tagline">Your custom tagline here</p>
```

### Add Contract Types

Edit `js/config.js` line ~11:

```javascript
CONTRACT_TYPES: [
    'Sale Deed',
    'Your New Contract Type',  // Add here
    // ... more types
]
```

### Modify Prompts

Edit `js/prompts.js` to change how legal prompts are generated.

## 🔧 Development Workflow

### 1. Making Changes

**Edit Files:**
- Use any text editor: Notepad++, VS Code, Sublime Text
- Open the file you want to modify
- Save changes

**Test Changes:**
- Refresh browser (F5 or Ctrl+R)
- Check browser console (F12) for errors

### 2. Version Control with Git

```bash
# Initialize git repository
cd C:\legal-ai-tool
git init

# Add files
git add .

# Commit changes
git commit -m "Initial commit"

# Create repository on GitHub and push
git remote add origin https://github.com/yourusername/legal-ai-tool.git
git push -u origin main
```

### 3. Debugging

**Open Browser Developer Tools:**
- Chrome/Edge: Press F12 or Ctrl+Shift+I
- Firefox: Press F12

**Check Console for Errors:**
- Look for red error messages
- Check Network tab for API failures

**Common Issues:**

1. **API Key Error**: Check if key is correct and active
2. **CORS Error**: Use local server instead of file://
3. **Blank Page**: Check browser console for JS errors

## 📂 File Organization Tips

### Keep Original Files Backup

```
C:\legal-ai-tool\           # Your working copy
C:\legal-ai-tool-backup\    # Original backup
C:\legal-ai-tool-custom\    # Your customized version
```

### Organize by Client

```
C:\legal-tools\
├── legal-ai-tool\          # Base tool
├── client-a\               # Customized for Client A
└── client-b\               # Customized for Client B
```

## 🌐 Deployment Options for Windows Users

### 1. Local Network Sharing (Law Firm Intranet)

**Share on Network Drive:**
```
\\firm-server\shared\legal-ai-tool\
```

**Users access via:**
```
\\firm-server\shared\legal-ai-tool\index.html
```

### 2. IIS (Internet Information Services)

1. Enable IIS in Windows Features
2. Copy folder to `C:\inetpub\wwwroot\legal-ai-tool\`
3. Access via `http://localhost/legal-ai-tool/`

### 3. Cloud Hosting (Recommended)

**Free Options:**
- **Netlify**: Drag and drop folder
- **Vercel**: Connect GitHub repo
- **GitHub Pages**: Host from repository

**Steps for Netlify (Easiest):**
1. Go to netlify.com
2. Drag the `legal-ai-tool` folder
3. Get public URL instantly
4. Share with team

## 🔐 Security Considerations

### API Key Storage

**Current Implementation:**
- User enters key each session
- Stored in browser session storage
- Cleared when browser closes

**For Enterprise:**
- Set up backend proxy (see TECHNICAL_README.md)
- Store key server-side
- Users don't see actual key

### Client Data

**Important:**
- All processing happens on Anthropic servers
- No client data stored locally by this tool
- Review firm's AI usage policy
- Consider data encryption for sensitive cases

## 📱 Testing on Different Devices

### Desktop Browsers
- Chrome (recommended)
- Edge
- Firefox
- Safari (on Mac)

### Mobile Browsers
- Open `index.html` via file browser
- Or host on local server and access via IP
- Responsive design adapts automatically

### Tablet
- Works great on iPad/Android tablets
- Large forms easy to fill

## 💡 Tips for Law Firms

### 1. Customize for Your Practice

**Add Your Contract Templates:**
- Modify `js/prompts.js`
- Add firm-specific clauses
- Include standard terms

**Brand It:**
- Add firm logo to `assets/images/`
- Update colors in `css/variables.css`
- Change footer text

### 2. Create SOP (Standard Operating Procedure)

Document for your team:
1. How to access tool
2. API key management
3. Quality review process
4. Usage guidelines

### 3. Cost Management

**Monitor Usage:**
- Track queries per lawyer
- Set monthly budget alerts
- Review Anthropic console regularly

**Typical Costs:**
- 50 queries/month = ~₹2,500
- 200 queries/month = ~₹10,000

### 4. Training

**New Lawyer Onboarding:**
1. Show USER_GUIDE.md
2. Demo each mode
3. Emphasize review requirements
4. Practice with sample cases

## 🆘 Troubleshooting Common Windows Issues

### Issue 1: File Won't Open in Browser

**Solution:**
- Right-click → Properties
- Check "Unblock" if present
- Click "Open with" → Choose browser

### Issue 2: Changes Not Showing

**Solution:**
- Hard refresh: Ctrl+F5
- Clear browser cache
- Check if editing correct file

### Issue 3: CSS Not Loading

**Solution:**
- Check file paths in index.html
- Ensure css/ folder is in same directory
- Open DevTools → Network tab to check

### Issue 4: JavaScript Errors

**Solution:**
- Press F12 → Console tab
- Look for error messages
- Check if all js/ files are present

### Issue 5: CORS Policy Error

**Solution:**
- Don't open via `file://` protocol
- Use local web server
- Or upload to web host

## 📧 Support & Resources

### Documentation Files
- `docs/USER_GUIDE.md` - For lawyers
- `docs/TECHNICAL_README.md` - For IT team
- This file - For setup

### Online Resources
- Anthropic API Docs: https://docs.anthropic.com
- Claude Console: https://console.anthropic.com

### Community
- GitHub Issues: Report bugs
- Email Support: [Your email]

## ✅ Checklist for First Use

- [ ] Downloaded and extracted all files
- [ ] Opened index.html in browser
- [ ] Got API key from Anthropic
- [ ] Tested contract drafting
- [ ] Tested case research
- [ ] Tested legal opinion
- [ ] Read USER_GUIDE.md
- [ ] Customized branding (optional)
- [ ] Shared with team

## 🎯 Next Steps

1. **Test Thoroughly**: Try all three modes with sample data
2. **Customize**: Add your branding and templates
3. **Deploy**: Choose deployment method for your team
4. **Train**: Show lawyers how to use effectively
5. **Monitor**: Track usage and costs
6. **Iterate**: Gather feedback and improve

---

**Need Help?**

If you encounter any issues:
1. Check troubleshooting section above
2. Review TECHNICAL_README.md
3. Contact your IT department
4. Check Anthropic documentation

**Happy Legal AI Assistance!** ⚖️

---

*Built for Indian Legal Professionals | Windows Compatible | Production Ready*