# ⭐ מעקב משימות — Kids Task Tracker

A family-oriented Progressive Web App (PWA) for tracking children's daily tasks and rewarding them with coins they can spend in a virtual store.

Built as a lightweight, mobile-first Hebrew app — no app store required. Parents install it once on the family device, and kids simply tap their name to start.

## Project Goals

- Motivate children to complete daily routines through a coin-based reward system
- Provide parents with a simple management panel (protected by PIN)
- Support multiple families with isolated data and a shared admin dashboard
- Run entirely for free using GitHub Pages + Firebase free tier

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript (no framework) |
| Hosting | GitHub Pages |
| Auth | Firebase Authentication (Email/Password) |
| Database | Firebase Realtime Database |
| App Type | PWA (Progressive Web App) — installable on any device |

## Screens

### Login / Registration
- Email + password authentication
- New families get default tasks and rewards
- Terms of service and privacy policy acceptance
- Beta warning banner

### Home — Child Selection
- Grid of children with avatars and coin balances
- Tap a child's name to enter their dashboard
- Settings (⚙️) protected by a 4-digit parent PIN
- Admin dashboard (📊) visible only to the app administrator

### Child Dashboard
- Daily, weekly, and one-time tasks with emoji icons
- Progress bar showing daily completion
- Tap a task to mark it complete and earn coins
- Coin animation and confetti celebration on completion
- Access to the reward store

### Reward Store
- List of available rewards with coin prices
- Children can redeem coins for rewards
- Parents define rewards and prices

### Parent Management Panel (PIN-protected)
- **Children tab** — add/remove children, choose avatars, give bonus coins
- **Tasks tab** — add/edit/remove tasks, set frequency (daily/weekly/one-time), assign to specific children
- **Rewards tab** — add/edit/remove rewards and prices
- **Settings tab** — change PIN, reset coins, full reset, logout

### Admin Dashboard (admin only)
- Total families and children count
- List of all registered families
- Inactive families (7+ days without usage)
- Usage distribution overview

## Default Tasks & Rewards

**Tasks** (5 coins each):
- 🪥 Brush teeth (morning) | 🪥 Brush teeth (evening)
- 👕 Get dressed independently | 🛁 Shower

**Rewards** (100 coins each):
- 📱 30 min screen time | 🎲 Game with mom | 🎲 Game with dad
- 🍫 Snack | 🏖️ Beach trip

All defaults are fully editable and deletable.

## Installation & Setup

### Prerequisites
- A [Firebase](https://console.firebase.google.com/) project (free Spark plan)
- A GitHub account with [GitHub Pages](https://pages.github.com/) enabled

### Step 1 — Firebase Setup

1. Create a new Firebase project
2. Enable **Authentication** → **Email/Password** sign-in method
3. Create a **Realtime Database** (choose `europe-west1` or your closest region)
4. Set database rules:
   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null"
     }
   }
   ```
5. Register a **Web app** in Project Settings and copy the config values

### Step 2 — Code Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/iditc/kids-tasks-app.git
   cd kids-tasks-app
   ```

2. Open `app.js` and replace the Firebase config at the top with your own:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     databaseURL: "https://YOUR_PROJECT-default-rtdb.europe-west1.firebasedatabase.app",
     projectId: "YOUR_PROJECT",
     storageBucket: "YOUR_PROJECT.firebasestorage.app",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. Set the admin email in `app.js`:
   ```javascript
   const ADMIN_EMAIL = 'your-email@example.com';
   ```

4. Push to GitHub and enable GitHub Pages (Settings → Pages → Source: main branch)

5. Add your GitHub Pages domain (`yourusername.github.io`) to Firebase Console → Authentication → Settings → Authorized domains

### Step 3 — First Registration

1. Open your GitHub Pages URL
2. Register with the admin email you set in step 2
3. You'll get the default tasks and rewards, and access to the admin dashboard

## Project Structure

```
kids-tasks-app/
├── index.html        # Main HTML — all screens
├── app.js            # Application logic, Firebase integration
├── styles.css        # All styles (RTL, mobile-first)
├── manifest.json     # PWA manifest
├── terms.html        # Terms of service (Hebrew)
├── privacy.html      # Privacy policy (Hebrew)
└── README.md
```

## Firebase Data Structure

```
/families/{familyId}/
  ├── parentUid, parentEmail, familyName
  ├── parentPin
  ├── children[]      # name, avatar, coins
  ├── tasks[]         # name, emoji, coins, frequency, assignedTo
  ├── rewards[]       # name, emoji, cost
  └── completions{}   # tracked by child × task × date

/users/{uid}/
  ├── email, displayName, familyId
  └── lastActive

/admin/uids/{uid}: true
```

## License

This project is provided as-is for personal and family use.
