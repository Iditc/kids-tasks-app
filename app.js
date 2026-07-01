// ── Firebase Config ──
// Replace YOUR_API_KEY, YOUR_SENDER_ID, YOUR_APP_ID with values from Firebase Console
// Firebase Console → Project Settings → General → Your apps → Web app
const firebaseConfig = {
  apiKey: "AIzaSyAcIpv4ypEbVI5bnTX6gWa71pdTqUZaSvM",
  authDomain: "kids-tasks-9a6bc.firebaseapp.com",
  databaseURL: "https://kids-tasks-9a6bc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kids-tasks-9a6bc",
  storageBucket: "kids-tasks-9a6bc.firebasestorage.app",
  messagingSenderId: "513481769811",
  appId: "1:513481769811:web:e0ad4a7355cd574664d7a6"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const ADMIN_EMAIL = 'cohen.idit10@gmail.com';
const MAX_FAMILIES = 25;

// ── Constants ──

const AVATARS = ['🦁','🐱','🐶','🦊','🐰','🐼','🦄','🐸','🐯','🐨','❤️','💎','😊','😎','🌟','🦋','🌈','👑','🤴','👸','🐝','🌸','💜','🔥','🍀','🎀','😺'];
const TASK_EMOJIS = ['👕','🥣','💊','🪥','🛏️','📚','⭐','🎒','🏃','🧹','🐕','🎹','🖌️','✏️','🧺','🛁','🎸','🎻','🎤','🥁','🎵','⚽','🏀','🏊','🤸','🥋','🚴','⛺','🔥','🏕️','💉','🩺','🏥','🩸','💊','🧪','🎨','🧩','💻','📐','🔬','🤝','✂️','💅'];
const REWARD_EMOJIS = ['🎲','🎬','📱','🍦','🎮','🛝','🧩','📖','🎨','🏊','♟️','💰','💵','🪙','🎁','🧸','🎠','🎢','🎪','🏆','👟','👗','🎧','🍕','🍫','🛍️','🏖️'];
const DAYS_HE = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

function genId() {
  return Math.random().toString(36).substring(2, 9);
}

function defaultTasks() {
  return [
    { id: genId(), name: 'צחצוח שיניים בוקר', coins: 5, frequency: 'daily', emoji: '🪥', assignedTo: [], dayOfWeek: null },
    { id: genId(), name: 'צחצוח שיניים ערב', coins: 5, frequency: 'daily', emoji: '🪥', assignedTo: [], dayOfWeek: null },
    { id: genId(), name: 'להתלבש לבד', coins: 5, frequency: 'daily', emoji: '👕', assignedTo: [], dayOfWeek: null },
    { id: genId(), name: 'מקלחת', coins: 5, frequency: 'daily', emoji: '🛁', assignedTo: [], dayOfWeek: null },
  ];
}

function defaultRewards() {
  return [
    { id: genId(), name: 'זמן מסך 30 דקות', cost: 100, emoji: '📱' },
    { id: genId(), name: 'משחק עם אמא', cost: 100, emoji: '🎲' },
    { id: genId(), name: 'משחק עם אבא', cost: 100, emoji: '🎲' },
    { id: genId(), name: 'חטיף', cost: 100, emoji: '🍫' },
    { id: genId(), name: 'ים', cost: 100, emoji: '🏖️' },
  ];
}

function defaultFamilyData() {
  return {
    parentPin: '1234',
    children: [],
    tasks: defaultTasks(),
    rewards: defaultRewards(),
    completions: {},
  };
}

// ── State ──

let registering = false;
let currentUser = null;
let familyId = null;
let isAdmin = false;
let data = null;
let dataListener = null;
let currentChildId = null;
let selectedAvatar = AVATARS[0];
let selectedTaskEmoji = TASK_EMOJIS[0];
let selectedRewardEmoji = REWARD_EMOJIS[0];
let newTaskChildIds = [];

// ── Auth UI ──

function showLoginTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.login-tab').forEach((t, i) => {
    t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
}

async function loginUser() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'נא למלא אימייל וסיסמה';
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (e) {
    errorEl.textContent = authErrorMessage(e.code);
  }
}

async function registerUser() {
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const terms = document.getElementById('register-terms').checked;
  const errorEl = document.getElementById('register-error');
  errorEl.textContent = '';

  if (!name) { errorEl.textContent = 'נא להזין שם משפחה'; return; }
  if (!email) { errorEl.textContent = 'נא להזין אימייל'; return; }
  if (password.length < 6) { errorEl.textContent = 'סיסמה חייבת להכיל לפחות 6 תווים'; return; }
  if (!terms) { errorEl.textContent = 'נא לאשר את תנאי השימוש'; return; }

  try {
    const countSnap = await db.ref('meta/familyCount').once('value');
    if ((countSnap.val() || 0) >= MAX_FAMILIES) {
      errorEl.textContent = 'מצטערים, ההרשמה סגורה כרגע 😔 זוהי גרסת בטא מוגבלת ל-' + MAX_FAMILIES + ' משפחות. נסו שוב מאוחר יותר!';
      return;
    }

    registering = true;
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    registering = false;

    alert('נרשמת בהצלחה! 🎉\nלחצ/י על כפתור הכניסה כדי להיכנס.');
    await auth.signOut();
    showLoginTab('login');
    document.getElementById('login-email').value = email;
  } catch (e) {
    registering = false;
    errorEl.textContent = authErrorMessage(e.code);
  }
}

async function resetPassword() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) {
    document.getElementById('login-error').textContent = 'נא להזין אימייל לאיפוס סיסמה';
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    alert('נשלח מייל לאיפוס סיסמה');
  } catch (e) {
    document.getElementById('login-error').textContent = authErrorMessage(e.code);
  }
}

function logoutUser() {
  detachListener();
  auth.signOut();
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

function authErrorMessage(code) {
  const m = {
    'auth/email-already-in-use': 'האימייל כבר רשום. נסו להתחבר',
    'auth/invalid-email': 'כתובת אימייל לא תקינה',
    'auth/weak-password': 'סיסמה חלשה מדי (לפחות 6 תווים)',
    'auth/user-not-found': 'משתמש לא נמצא',
    'auth/wrong-password': 'סיסמה שגויה',
    'auth/invalid-credential': 'אימייל או סיסמה שגויים',
    'auth/too-many-requests': 'יותר מדי ניסיונות. נסו שוב מאוחר יותר',
  };
  return m[code] || 'שגיאה: ' + code;
}

// ── Auth State Listener ──

auth.onAuthStateChanged(async (user) => {
  if (registering) return;
  try {
    if (user) {
      currentUser = user;
      const today = new Date().toISOString().split('T')[0];

      let adminResult = false;
      try {
        const adminSnap = await db.ref('admin/uids/' + user.uid).once('value');
        adminResult = adminSnap.exists();
      } catch (e) {}
      isAdmin = adminResult;

      let userSnap;
      try {
        userSnap = await db.ref('users/' + user.uid).once('value');
      } catch (e) {
        alert('שגיאה בקריאת נתוני משתמש: ' + e.message);
        showScreen('screen-login');
        return;
      }
      let userData = userSnap.val();

      if (!userData || !userData.familyId) {
        try {
          const newFamilyId = genId();
          const familyData = defaultFamilyData();
          familyData.parentUid = user.uid;
          familyData.parentEmail = user.email;
          familyData.familyName = user.displayName || user.email;
          familyData.createdAt = new Date().toISOString();

          await db.ref('families/' + newFamilyId).set(familyData);

          userData = {
            email: user.email,
            displayName: user.displayName || user.email,
            familyId: newFamilyId,
            lastActive: today,
          };
          await db.ref('users/' + user.uid).set(userData);

          const countSnap = await db.ref('meta/familyCount').once('value');
          await db.ref('meta/familyCount').set((countSnap.val() || 0) + 1);

          if (user.email.toLowerCase() === ADMIN_EMAIL) {
            await db.ref('admin/uids/' + user.uid).set(true);
            isAdmin = true;
          }
        } catch (e) {
          alert('שגיאה ביצירת חשבון: ' + e.message);
          showScreen('screen-login');
          return;
        }
      } else {
        db.ref('users/' + user.uid + '/lastActive').set(today).catch(() => {});
      }

      if (userData && userData.familyId) {
        familyId = userData.familyId;
        attachListener();
        showScreen('screen-home');

        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) adminBtn.style.display = isAdmin ? 'inline-flex' : 'none';

        const infoEl = document.getElementById('account-info');
        if (infoEl) infoEl.textContent = 'מחובר/ת כ: ' + user.email;
      } else {
        showScreen('screen-login');
      }
    } else {
      currentUser = null;
      familyId = null;
      isAdmin = false;
      data = null;
      detachListener();
      showScreen('screen-login');
    }
  } catch (e) {
    console.error('Auth error:', e);
    showScreen('screen-login');
  }
});

setTimeout(() => {
  const s = document.querySelector('.screen.active');
  if (s && s.id === 'screen-loading') {
    showScreen('screen-login');
  }
}, 5000);

// ── Data ──

function migrateData(d) {
  if (!d.tasks) d.tasks = [];
  if (!d.rewards) d.rewards = [];
  if (!d.children) d.children = [];
  if (!Array.isArray(d.children)) d.children = Object.values(d.children);
  if (!Array.isArray(d.tasks)) d.tasks = Object.values(d.tasks);
  if (!Array.isArray(d.rewards)) d.rewards = Object.values(d.rewards);
  d.tasks.forEach(t => {
    if (!t.assignedTo) t.assignedTo = [];
    if (t.dayOfWeek === undefined) t.dayOfWeek = null;
  });
  if (!d.completions) d.completions = {};
  return d;
}

function attachListener() {
  detachListener();
  dataListener = db.ref('families/' + familyId).on('value', (snapshot) => {
    const val = snapshot.val();
    if (val) {
      data = migrateData(val);
      const nameEl = document.getElementById('family-name');
      if (nameEl) nameEl.textContent = data.familyName || 'מי אני?';
      renderActiveScreen();
    }
  });
}

function detachListener() {
  if (familyId && dataListener) {
    db.ref('families/' + familyId).off('value', dataListener);
  }
  dataListener = null;
}

function saveData() {
  if (!familyId || !data) return;
  db.ref('families/' + familyId).set(data).catch(() => {});
}

function renderActiveScreen() {
  const s = document.querySelector('.screen.active');
  if (!s) return;
  if (s.id === 'screen-loading') {
    showScreen('screen-home');
    renderHome();
    return;
  }
  switch (s.id) {
    case 'screen-home': renderHome(); break;
    case 'screen-child': renderChild(); break;
    case 'screen-store': renderStore(); break;
    case 'screen-parent': renderParent(); break;
  }
}

// ── Date Helpers ──

function getDateKey() {
  return new Date().toISOString().split('T')[0];
}

function getWeekKey() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return 'w' + monday.toISOString().split('T')[0];
}

function completionKey(childId, taskId, frequency) {
  if (frequency === 'once') return childId + '_' + taskId + '_once';
  const dk = frequency === 'weekly' ? getWeekKey() : getDateKey();
  return childId + '_' + taskId + '_' + dk;
}

function isCompleted(childId, taskId, frequency) {
  return !!data.completions[completionKey(childId, taskId, frequency)];
}

function isTaskForChild(task, childId) {
  return task.assignedTo.length === 0 || task.assignedTo.includes(childId);
}

function isTaskVisibleToday(task) {
  if (task.frequency === 'daily') return true;
  if (task.frequency === 'once') return true;
  if (task.dayOfWeek === null || task.dayOfWeek === undefined) return true;
  return new Date().getDay() === task.dayOfWeek;
}

// ── Navigation ──

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function goHome() {
  currentChildId = null;
  showScreen('screen-home');
  renderHome();
}

function goToChild() {
  showScreen('screen-child');
  renderChild();
}

// ── Home Screen ──

function renderHome() {
  if (!data) return;
  const grid = document.getElementById('children-grid');
  const msg = document.getElementById('no-children-msg');

  if (data.children.length === 0) {
    grid.innerHTML = '';
    msg.style.display = 'block';
    return;
  }

  msg.style.display = 'none';
  grid.innerHTML = data.children.map(child => `
    <div class="child-card" onclick="selectChild('${child.id}')">
      <span class="avatar">${child.avatar}</span>
      <span class="name">${child.name}</span>
      <span class="coins-badge">${child.coins} 🪙</span>
    </div>
  `).join('');
}

function selectChild(id) {
  currentChildId = id;
  showScreen('screen-child');
  renderChild();
}

// ── Child Dashboard ──

function getChildTasks(childId, frequency) {
  return data.tasks.filter(t => {
    if (frequency === 'once') {
      return t.frequency === 'once' &&
        isTaskForChild(t, childId) &&
        !isCompleted(childId, t.id, 'once');
    }
    return t.frequency === frequency &&
      isTaskForChild(t, childId) &&
      isTaskVisibleToday(t);
  });
}

function renderChild() {
  if (!data) return;
  const child = data.children.find(c => c.id === currentChildId);
  if (!child) return goHome();

  document.getElementById('child-avatar').textContent = child.avatar;
  document.getElementById('child-name').textContent = child.name;
  document.getElementById('child-coins').textContent = child.coins;

  const dailyTasks = getChildTasks(child.id, 'daily');
  const weeklyTasks = getChildTasks(child.id, 'weekly');
  const onceTasks = getChildTasks(child.id, 'once');

  renderTaskList('daily-tasks', dailyTasks, child.id);
  renderTaskList('weekly-tasks', weeklyTasks, child.id);
  renderTaskList('once-tasks', onceTasks, child.id);

  document.getElementById('daily-section').style.display = dailyTasks.length ? 'block' : 'none';
  document.getElementById('weekly-section').style.display = weeklyTasks.length ? 'block' : 'none';
  document.getElementById('once-section').style.display = onceTasks.length ? 'block' : 'none';

  const completedDaily = dailyTasks.filter(t => isCompleted(child.id, t.id, 'daily')).length;
  const totalDaily = dailyTasks.length;
  const pct = totalDaily > 0 ? (completedDaily / totalDaily) * 100 : 0;

  document.getElementById('daily-progress-fill').style.width = pct + '%';
  document.getElementById('daily-progress-text').textContent =
    totalDaily > 0 ? completedDaily + ' / ' + totalDaily : '';

  const banner = document.querySelector('.all-done-banner');
  if (banner) banner.remove();

  if (totalDaily > 0 && completedDaily === totalDaily) {
    const b = document.createElement('div');
    b.className = 'all-done-banner';
    b.textContent = '🎉 כל המשימות היומיות הושלמו! 🎉';
    document.getElementById('daily-progress').after(b);
  }
}

function renderTaskList(containerId, tasks, childId) {
  const container = document.getElementById(containerId);
  container.innerHTML = tasks.map(task => {
    const done = isCompleted(childId, task.id, task.frequency);
    return `
      <div class="task-item ${done ? 'completed' : ''}" onclick="toggleTask('${task.id}','${task.frequency}', this)">
        <div class="task-checkbox">${done ? '✓' : ''}</div>
        <span class="task-emoji">${task.emoji}</span>
        <span class="task-name">${task.name}</span>
        <span class="task-coins">${task.coins} 🪙</span>
      </div>
    `;
  }).join('');
}

function toggleTask(taskId, frequency, element) {
  const child = data.children.find(c => c.id === currentChildId);
  const task = data.tasks.find(t => t.id === taskId);
  if (!child || !task) return;

  const key = completionKey(currentChildId, taskId, frequency);
  const wasDone = !!data.completions[key];

  if (wasDone) {
    delete data.completions[key];
    child.coins = Math.max(0, child.coins - task.coins);
  } else {
    data.completions[key] = true;
    child.coins += task.coins;
    animateCoin(element);
    playCoinSound();
  }

  saveData();
  renderChild();

  const dailyTasks = getChildTasks(currentChildId, 'daily');
  const allDone = dailyTasks.length > 0 &&
    dailyTasks.every(t => isCompleted(currentChildId, t.id, 'daily'));
  if (!wasDone && allDone) {
    setTimeout(() => { showConfetti(); playAllDoneSound(); }, 300);
  }
}

// ── Store ──

function showStore() {
  showScreen('screen-store');
  renderStore();
}

function renderStore() {
  if (!data) return;
  const child = data.children.find(c => c.id === currentChildId);
  if (!child) return;

  document.getElementById('store-coins').textContent = child.coins;

  const list = document.getElementById('rewards-list');
  list.innerHTML = data.rewards.map(r => `
    <div class="reward-item">
      <span class="reward-emoji">${r.emoji}</span>
      <div class="reward-info">
        <div class="reward-name">${r.name}</div>
        <div class="reward-cost">${r.cost} 🪙</div>
      </div>
      <button class="btn-redeem" ${child.coins < r.cost ? 'disabled' : ''}
              onclick="redeemReward('${r.id}')">
        המר
      </button>
    </div>
  `).join('');
}

function redeemReward(rewardId) {
  const child = data.children.find(c => c.id === currentChildId);
  const reward = data.rewards.find(r => r.id === rewardId);
  if (!child || !reward || child.coins < reward.cost) return;

  if (!confirm('להמיר ' + reward.cost + ' מטבעות ל"' + reward.name + '"?')) return;

  child.coins -= reward.cost;
  saveData();
  showConfetti();
  renderStore();
}

// ── Parent Panel ──

function showPinPrompt() {
  document.getElementById('pin-modal').classList.add('active');
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-error').textContent = '';
  setTimeout(() => document.getElementById('pin-input').focus(), 100);
}

function closePinModal(e) {
  if (e.target === e.currentTarget) {
    document.getElementById('pin-modal').classList.remove('active');
  }
}

function verifyPin() {
  const pin = document.getElementById('pin-input').value;
  if (pin === String(data.parentPin)) {
    document.getElementById('pin-modal').classList.remove('active');
    showScreen('screen-parent');
    renderParent();
  } else {
    document.getElementById('pin-error').textContent = 'קוד שגוי';
    document.getElementById('pin-input').value = '';
  }
}

document.getElementById('pin-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') verifyPin();
});

function renderParent() {
  renderManageChildren();
  renderManageTasks();
  renderManageRewards();
  renderAvatarPicker();
  renderEmojiPicker('task-emoji-picker', TASK_EMOJIS, 'task');
  renderEmojiPicker('reward-emoji-picker', REWARD_EMOJIS, 'reward');
  renderTaskChildPicker();
  renderBonusSelect();
}

// ── Tabs ──

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// ── Manage Children ──

function renderBonusSelect() {
  const select = document.getElementById('bonus-child');
  if (!select || !data) return;
  select.innerHTML = data.children.map(c =>
    '<option value="' + c.id + '">' + c.avatar + ' ' + c.name + '</option>'
  ).join('');
}

function giveBonus() {
  const childId = document.getElementById('bonus-child').value;
  const amount = parseInt(document.getElementById('bonus-amount').value) || 0;
  const reason = document.getElementById('bonus-reason').value.trim();
  if (!childId || amount < 1) return;

  const child = data.children.find(c => c.id === childId);
  if (!child) return;

  const msg = reason
    ? 'לתת ' + amount + ' מטבעות בונוס ל' + child.name + ' על "' + reason + '"?'
    : 'לתת ' + amount + ' מטבעות בונוס ל' + child.name + '?';
  if (!confirm(msg)) return;

  child.coins += amount;
  saveData();
  document.getElementById('bonus-amount').value = '5';
  document.getElementById('bonus-reason').value = '';
  alert(child.name + ' קיבל/ה ' + amount + ' מטבעות! 🎉');
  renderManageChildren();
}

function renderManageChildren() {
  if (!data) return;
  const list = document.getElementById('manage-children-list');
  list.innerHTML = data.children.map(child => `
    <div class="manage-item">
      <span class="item-emoji">${child.avatar}</span>
      <div class="item-info">
        <div class="item-name">${child.name}</div>
        <div class="item-detail">${child.coins} מטבעות</div>
      </div>
      <button class="btn-delete" onclick="deleteChild('${child.id}')">✕</button>
    </div>
  `).join('');
}

function renderAvatarPicker() {
  const picker = document.getElementById('avatar-picker');
  picker.innerHTML = AVATARS.map(a => `
    <div class="avatar-option ${a === selectedAvatar ? 'selected' : ''}"
         onclick="selectAvatar('${a}', this)">${a}</div>
  `).join('');
}

function selectAvatar(avatar, el) {
  selectedAvatar = avatar;
  document.querySelectorAll('#avatar-picker .avatar-option')
    .forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function addChild() {
  const nameInput = document.getElementById('new-child-name');
  const name = nameInput.value.trim();
  if (!name) return;

  data.children.push({
    id: genId(),
    name,
    avatar: selectedAvatar,
    coins: 0,
  });

  saveData();
  nameInput.value = '';
  renderManageChildren();
  renderManageTasks();
  renderTaskChildPicker();
}

function deleteChild(id) {
  const child = data.children.find(c => c.id === id);
  if (!child || !confirm('למחוק את ' + child.name + '?')) return;

  data.children = data.children.filter(c => c.id !== id);
  data.tasks.forEach(t => {
    t.assignedTo = t.assignedTo.filter(cid => cid !== id);
  });
  Object.keys(data.completions).forEach(key => {
    if (key.startsWith(id + '_')) delete data.completions[key];
  });
  saveData();
  renderManageChildren();
  renderManageTasks();
  renderTaskChildPicker();
}

// ── Manage Tasks ──

function renderManageTasks() {
  if (!data) return;
  const list = document.getElementById('manage-tasks-list');
  list.innerHTML = data.tasks.map(task => {
    const daySelect = task.frequency === 'weekly' ? `
      <select class="day-select" onchange="updateTaskDay('${task.id}', this.value)">
        ${DAYS_HE.map((d, i) => `<option value="${i}" ${task.dayOfWeek === i ? 'selected' : ''}>יום ${d}</option>`).join('')}
      </select>` : '';

    const childToggles = data.children.map(child => {
      const isAssigned = task.assignedTo.length === 0 || task.assignedTo.includes(child.id);
      return `<span class="child-toggle ${isAssigned ? 'active' : ''}"
                    onclick="toggleTaskChild('${task.id}','${child.id}')"
                    title="${child.name}">${child.avatar}</span>`;
    }).join('');

    return `
      <div class="manage-item-wrap">
        <div class="manage-item">
          <span class="item-emoji">${task.emoji}</span>
          <div class="item-info">
            <div class="item-name">${task.name}</div>
            <div class="item-detail">${task.frequency === 'daily' ? 'יומית' : task.frequency === 'weekly' ? 'שבועית' : 'חד-פעמית'}</div>
          </div>
          <div class="coins-edit">
            <input type="number" class="coins-input" value="${task.coins}" min="1" max="50"
                   onchange="updateTaskCoins('${task.id}', this.value)">
            <span>🪙</span>
          </div>
          <button class="btn-delete" onclick="deleteTask('${task.id}')">✕</button>
        </div>
        ${daySelect ? '<div class="task-day-row">' + daySelect + '</div>' : ''}
        ${data.children.length > 1 ? `
          <div class="task-children-row">
            <span class="children-label">משויך ל:</span>
            ${childToggles}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function toggleTaskChild(taskId, childId) {
  const task = data.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.assignedTo.length === 0) {
    task.assignedTo = data.children.map(c => c.id).filter(id => id !== childId);
  } else if (task.assignedTo.includes(childId)) {
    task.assignedTo = task.assignedTo.filter(id => id !== childId);
  } else {
    task.assignedTo.push(childId);
    if (task.assignedTo.length === data.children.length) {
      task.assignedTo = [];
    }
  }

  saveData();
  renderManageTasks();
}

function updateTaskDay(taskId, value) {
  const task = data.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.dayOfWeek = parseInt(value);
  saveData();
}

function updateTaskCoins(taskId, value) {
  const task = data.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.coins = Math.max(1, Math.min(50, parseInt(value) || 1));
  saveData();
}

function renderEmojiPicker(containerId, emojis, type) {
  const container = document.getElementById(containerId);
  const selected = type === 'task' ? selectedTaskEmoji : selectedRewardEmoji;
  container.innerHTML = emojis.map(e => `
    <div class="emoji-option ${e === selected ? 'selected' : ''}"
         onclick="selectEmoji('${type}', '${e}', this)">${e}</div>
  `).join('');
}

function selectEmoji(type, emoji, el) {
  if (type === 'task') selectedTaskEmoji = emoji;
  else selectedRewardEmoji = emoji;

  el.parentElement.querySelectorAll('.emoji-option')
    .forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function renderTaskChildPicker() {
  const container = document.getElementById('task-child-picker');
  if (!container || !data) return;
  if (data.children.length === 0) {
    container.innerHTML = '<span class="children-label">אין ילדים עדיין</span>';
    return;
  }
  container.innerHTML = data.children.map(child => {
    const sel = newTaskChildIds.includes(child.id);
    return '<span class="child-toggle ' + (sel ? 'active' : '') + '"' +
      ' onclick="toggleNewTaskChild(\'' + child.id + '\')"' +
      ' title="' + child.name + '">' + child.avatar + ' ' + child.name + '</span>';
  }).join('');
}

function toggleNewTaskChild(childId) {
  if (newTaskChildIds.includes(childId)) {
    newTaskChildIds = newTaskChildIds.filter(id => id !== childId);
  } else {
    newTaskChildIds.push(childId);
  }
  renderTaskChildPicker();
}

function onFreqChange() {
  const freq = document.getElementById('new-task-freq').value;
  document.getElementById('day-picker-row').style.display =
    freq === 'weekly' ? 'flex' : 'none';
}

function addTask() {
  const nameInput = document.getElementById('new-task-name');
  const name = nameInput.value.trim();
  if (!name) return;

  const coins = parseInt(document.getElementById('new-task-coins').value) || 2;
  const frequency = document.getElementById('new-task-freq').value;
  const dayOfWeek = frequency === 'weekly'
    ? parseInt(document.getElementById('new-task-day').value)
    : null;

  data.tasks.push({
    id: genId(),
    name,
    coins,
    frequency,
    emoji: selectedTaskEmoji,
    assignedTo: [...newTaskChildIds],
    dayOfWeek,
  });

  saveData();
  nameInput.value = '';
  newTaskChildIds = [];
  renderManageTasks();
  renderTaskChildPicker();
}

function deleteTask(id) {
  const task = data.tasks.find(t => t.id === id);
  if (!task || !confirm('למחוק את "' + task.name + '"?')) return;

  data.tasks = data.tasks.filter(t => t.id !== id);
  saveData();
  renderManageTasks();
}

// ── Manage Rewards ──

function renderManageRewards() {
  if (!data) return;
  const list = document.getElementById('manage-rewards-list');
  list.innerHTML = data.rewards.map(r => `
    <div class="manage-item">
      <span class="item-emoji">${r.emoji}</span>
      <div class="item-info">
        <div class="item-name">${r.name}</div>
      </div>
      <div class="coins-edit">
        <input type="number" class="coins-input" value="${r.cost}" min="1" max="500"
               onchange="updateRewardCost('${r.id}', this.value)">
        <span>🪙</span>
      </div>
      <button class="btn-delete" onclick="deleteReward('${r.id}')">✕</button>
    </div>
  `).join('');
}

function updateRewardCost(rewardId, value) {
  const reward = data.rewards.find(r => r.id === rewardId);
  if (!reward) return;
  reward.cost = Math.max(1, Math.min(500, parseInt(value) || 1));
  saveData();
}

function addReward() {
  const nameInput = document.getElementById('new-reward-name');
  const name = nameInput.value.trim();
  if (!name) return;

  const cost = parseInt(document.getElementById('new-reward-cost').value) || 10;

  data.rewards.push({
    id: genId(),
    name,
    cost,
    emoji: selectedRewardEmoji,
  });

  saveData();
  nameInput.value = '';
  renderManageRewards();
}

function deleteReward(id) {
  const reward = data.rewards.find(r => r.id === id);
  if (!reward || !confirm('למחוק את "' + reward.name + '"?')) return;

  data.rewards = data.rewards.filter(r => r.id !== id);
  saveData();
  renderManageRewards();
}

// ── Settings ──

function changePin() {
  const pin = document.getElementById('new-pin').value.trim();
  if (pin.length !== 4 || isNaN(pin)) {
    alert('הקוד חייב להיות 4 ספרות');
    return;
  }
  data.parentPin = pin;
  saveData();
  document.getElementById('new-pin').value = '';
  alert('הקוד שונה בהצלחה');
}

function resetCoins() {
  if (!confirm('לאפס את המטבעות של כל הילדים?')) return;
  if (!confirm('בטוח? הפעולה לא ניתנת לביטול')) return;
  data.children.forEach(c => c.coins = 0);
  saveData();
  alert('המטבעות אופסו');
  renderParent();
}

function resetAll() {
  if (!confirm('למחוק את כל הנתונים? ילדים, משימות, מתנות ומטבעות?')) return;
  if (!confirm('בטוח לגמרי? הפעולה לא ניתנת לביטול!')) return;

  const preserved = {
    parentUid: data.parentUid,
    parentEmail: data.parentEmail,
    familyName: data.familyName,
    createdAt: data.createdAt,
  };

  data = defaultFamilyData();
  Object.assign(data, preserved);
  saveData();
  goHome();
}

// ── Sound ──

function playCoinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

function playAllDoneSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch (e) {}
}

// ── Animations ──

function animateCoin(element) {
  const coin = document.getElementById('coin-animation');
  const rect = element.getBoundingClientRect();
  coin.style.left = rect.left + rect.width / 2 - 16 + 'px';
  coin.style.top = rect.top + 'px';
  coin.classList.remove('active');
  void coin.offsetWidth;
  coin.classList.add('active');
}

function showConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#6C63FF','#FF6B6B','#FFD93D','#6BCB77','#FF9FF3','#54A0FF'];

  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.animationDuration = (1 + Math.random()) + 's';
    container.appendChild(piece);
  }

  setTimeout(() => { container.innerHTML = ''; }, 2500);
}

// ── Admin Dashboard ──

async function showAdmin() {
  if (!isAdmin) return;
  showScreen('screen-admin');
  renderAdmin();
}

async function renderAdmin() {
  if (!isAdmin) return;

  const [familiesSnap, usersSnap] = await Promise.all([
    db.ref('families').once('value'),
    db.ref('users').once('value'),
  ]);

  const families = familiesSnap.val() || {};
  const users = usersSnap.val() || {};

  const familyEntries = Object.entries(families);
  const userEntries = Object.entries(users);

  let totalChildren = 0;
  familyEntries.forEach(([, fam]) => {
    totalChildren += (fam.children || []).length;
  });

  document.getElementById('admin-total-families').textContent = familyEntries.length;
  document.getElementById('admin-total-children').textContent = totalChildren;

  const today = new Date();

  const familiesList = document.getElementById('admin-families-list');
  familiesList.innerHTML = familyEntries.map(([, fam]) => {
    const numKids = (fam.children || []).length;
    return `<div class="manage-item">
      <span class="item-emoji">👨‍👩‍👧‍👦</span>
      <div class="item-info">
        <div class="item-name">${fam.familyName || 'ללא שם'}</div>
        <div class="item-detail">${numKids} ילדים · ${fam.parentEmail || ''}</div>
      </div>
    </div>`;
  }).join('') || '<p class="empty-msg">אין משפחות</p>';

  const inactiveList = document.getElementById('admin-inactive-list');
  const inactive = userEntries.filter(([, u]) => {
    if (!u.lastActive) return true;
    const diff = (today - new Date(u.lastActive)) / (1000 * 60 * 60 * 24);
    return diff >= 7;
  });

  if (inactive.length === 0) {
    inactiveList.innerHTML = '<p class="empty-msg">כל המשפחות פעילות! 🎉</p>';
  } else {
    inactiveList.innerHTML = inactive.map(([, u]) => {
      const daysSince = u.lastActive
        ? Math.floor((today - new Date(u.lastActive)) / (1000 * 60 * 60 * 24))
        : '?';
      return `<div class="manage-item">
        <span class="item-emoji">⏸️</span>
        <div class="item-info">
          <div class="item-name">${u.displayName || u.email}</div>
          <div class="item-detail">${daysSince} ימים ללא שימוש</div>
        </div>
      </div>`;
    }).join('');
  }

  const usageChart = document.getElementById('admin-usage-chart');
  const usageData = userEntries.map(([, u]) => ({
    name: u.displayName || u.email,
    daysSince: u.lastActive
      ? Math.floor((today - new Date(u.lastActive)) / (1000 * 60 * 60 * 24))
      : 999,
    lastActive: u.lastActive || null,
  })).sort((a, b) => a.daysSince - b.daysSince);

  usageChart.innerHTML = usageData.map(u => {
    const cls = u.daysSince === 0 ? 'usage-today'
      : u.daysSince <= 3 ? 'usage-recent'
      : u.daysSince <= 7 ? 'usage-week'
      : 'usage-inactive';
    const label = !u.lastActive ? 'לא פעיל'
      : u.daysSince === 0 ? 'היום'
      : u.daysSince + ' ימים';
    return `<div class="usage-bar ${cls}">
      <span class="usage-name">${u.name}</span>
      <span class="usage-days">${label}</span>
    </div>`;
  }).join('');
}

// ── Service Worker Cleanup ──

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs =>
    regs.forEach(r => r.unregister())
  );
}
