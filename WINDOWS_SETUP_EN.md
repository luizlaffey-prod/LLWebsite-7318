# 🚀 Step-by-Step Instructions - Run LLWebsite on Windows Machine

## 📝 BEFORE YOU START

You'll need 2 things installed:
1. **Git** - To download the code
2. **Node.js** - To run the project

---

## ✅ STEP 1: Install Git

### 1.1 - Open your browser and go to:
```
https://git-scm.com/download/win
```

### 1.2 - Click the green "Download" button
A `.exe` file will download

### 1.3 - Run the installer
- Double-click the downloaded file
- Click "Next" on all screens
- When you see "Select Components", leave everything checked
- Click "Install"
- Click "Finish"

### 1.4 - Test if it worked
- Open **File Explorer** (Windows + E)
- Right-click in any empty folder
- Should see "Git Bash Here"
- If it appears ✅ Git is installed

---

## ✅ STEP 2: Install Node.js

### 2.1 - Open your browser and go to:
```
https://nodejs.org
```

### 2.2 - Click "LTS" (Long Term Support)
The recommended version

### 2.3 - Run the installer
- Double-click the downloaded `.msi` file
- Click "Next"
- Check "I accept..." and click "Next"
- Leave default path (don't change)
- Click "Next" until the end
- Click "Install"
- Click "Finish"

### 2.4 - Test if it worked
- Press: **Windows + R**
- Type: `cmd`
- Press Enter
- In the window that opens, type:
```bash
node --version
```
- Should show something like: `v18.x.x` or `v20.x.x` ✅

---

## ✅ STEP 3: Clone the Repository (Download the Code)

### 3.1 - Create a folder for the project
- Open **File Explorer** (Windows + E)
- Go to: `C:\Users\[YOUR_USERNAME]\Documents`
- Right-click in empty space
- Select "New Folder"
- Name it: `Projects` (or any name you prefer)

### 3.2 - Open Git Bash in this folder
- **Right-click** the `Projects` folder
- Select: **"Git Bash Here"**
- A black window will open (terminal)

### 3.3 - Clone the repository
In the Git Bash window, copy and paste this command:

```bash
git clone https://github.com/luizlaffey-prod/LLWebsite-7318.git
cd LLWebsite-7318
```

Press **Enter** and wait for it to finish (may take a few seconds).

---

## ✅ STEP 4: Install Project Dependencies

Still in the Git Bash window (should be in `LLWebsite-7318` folder), run:

```bash
npm install --legacy-peer-deps
```

⏳ **Will take 2-5 minutes** - normal, don't close the window!

When done, should show something like:
```
added XXX packages
```

---

## ✅ STEP 5: Run the Project

Still in the same Git Bash window, run:

```bash
npm run dev
```

Will show something like:

```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

✅ **Project is running!**

---

## ✅ STEP 6: View the Website in Your Browser

### 6.1 - Copy the link
See in the Git Bash window the link: `http://localhost:5173/`

### 6.2 - Open in browser
- Click any browser (Chrome, Edge, Firefox, etc)
- In the address bar, paste: `http://localhost:5173/`
- Press **Enter**

✅ **Website should load!**

---

## 🧪 TESTING THE SUBSCRIPTION FLOW

1. **Home** → Click **"Originals"** (top menu)
2. Choose a program (ex: "Zero Point Zero")
3. Click **"Subscribe"** or **"Plans"**
4. Choose a plan and click
5. **Login** (you can use any email/password for testing)
6. Click **"Subscribe"** again
7. 🎉 **Success page should appear with your name!**
8. Click **"Go to Your Programs"**
9. Should show: **"Welcome, [your name]"**

✅ If everything worked, you're all set!

---

## 🛑 STOP THE PROJECT

When you want to stop:

In the Git Bash window, press: **`Ctrl + C`**

Will show:
```
^C
```

Done ✅

---

## 🔄 NEXT TIME YOU WANT TO RUN IT

When you use it again:

1. Open **File Explorer**
2. Go to: `C:\Users\[YOUR_USERNAME]\Documents\Projects\LLWebsite-7318`
3. Right-click
4. Select **"Git Bash Here"**
5. Run:
```bash
npm run dev
```
6. Open browser at `http://localhost:5173/`

---

## 📥 UPDATE THE CODE (When there are new changes)

When I tell you there are new changes:

1. Open Git Bash in the project folder
2. Run:
```bash
git pull origin main
```
3. If the server is running, it will reload automatically
4. If not, run `npm run dev` again

---

## ⚠️ PROBLEMS?

### ❌ "npm command not found"
- Means Node.js wasn't installed correctly
- Close the Git Bash window
- Reinstall Node.js following STEP 2 again
- Open a new Git Bash window

### ❌ "Port 5173 already in use"
- Means there's another `npm run dev` running
- Press `Ctrl + C` in the other window
- Run `npm run dev` again in the current window

### ❌ Page doesn't load in browser
- Check if the Git Bash window is still open (shows the link?)
- If not, run `npm run dev` again
- Try another browser (Chrome, Edge, Firefox)

### ❌ Page shows error when logging in/subscribing
- Open **Developer Tools** (F12)
- Go to **Console** tab (black area)
- Copy any red error message
- Send me a screenshot

---

## ✨ All Set!

Now you can see and test the website on your machine! 🎉

**Need help?** Just reach out!
