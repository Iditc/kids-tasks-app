const AVATARS = ['🦁','🐱','🐶','🦊','🐰','🐼','🦄','🐸','🐯','🐨','❤️','💎','😊','😎','🌟','🦋','🌈','👑','🤴','👸','🐝','🌸','💜','🔥','🍀','🎀','😺'];
const TASK_EMOJIS = ['👕','🥣','💊','🪥','🛏️','📚','⭐','🎒','🏃','🧹','🐕','🎹','🖌️','✏️','🧺','🛁','🎸','🎻','🎤','🥁','🎵','⚽','🏀','🏊','🤸','🥋','🚴','⛺','🔥','🏕️','💉','🩺','🏥','🩸','💊','🧪','🎨','🧩','💻','📐','🔬','🤝','✂️','💅'];

const REWARD_EMOJIS = ['🎲','🎬','📱','🍦','🎮','🛝','🧩','📖','🎨','🏊'];
const DAYS_HE = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

const DEFAULT_DATA = {
  parentPin: '1234',
  children: [],
  tasks: [
    { id: genId(), name: 'להתלבש', coins: 2, frequency: 'daily', emoji: '👕', assignedTo: [], dayOfWeek: null },
    { id: genId(), name: 'ארוחת בוקר', coins: 2, frequency: 'daily', emoji: '🥣', assignedTo: [], dayOfWeek: null },
    { id: genId(), name: 'תרופות', coins: 3, frequency: 'daily', emoji: '💊', assignedTo: [], dayOfWeek: null },
    { id: genId(), name: 'צחצוח שיניים בוקר', coins: 2, frequency: 'daily', emoji: '🪥', assignedTo: [], dayOfWeek: null },
    { id: genId(), name: 'צחצוח שיניים ערב', coins: 2, frequency: 'daily', emoji: '🪥', assignedTo: [], dayOfWeek: null },
    { id: genId(), name: 'סידור חדר', coins: 3, frequency: 'daily', emoji: '🛏️', assignedTo: [], dayOfWeek: null },
    { id: genId(), name: 'חוג', coins: 5, frequency: 'weekly', emoji: '⭐', assignedTo: [], dayOfWeek: 2 },
  ],
  rewards: [
    { id: genId(), name: 'משחק עם אמא', cost: 10, emoji: '🎲' },
    { id: genId(), name: 'סרט', cost: 15, emoji: '🎬' },
    { id: genId(), name: '30 דק׳ מסך', cost: 8, emoji: '📱' },
  ],
  completions: {},
};

const FIREBASE_URL = 'https://kids-tasks-9a6bc-default-rtdb.europe-west1.firebasedatabase.app';

let data = JSON.parse(JSON.stringify(DEFAULT_DATA));
let currentChildId = null;
let selectedAvatar = AVATARS[0];
let selectedTaskEmoji = TASK_EMOJIS[0];
let selectedRewardEmoji = REWARD_EMOJIS[0];
let newTaskChildIds = [];

function genId() {
  return Math.random().toString(36).substring(2, 9);
}

function migrateData(d) {
  d.tasks.forEach(t => {
    if (!t.assignedTo) t.assignedTo = [];
    if (t.dayOfWeek === undefined) t.dayOfWeek = null;
  });
  if (!d.completions) d.completions = {};
  return d;
}

async function loadData() {
  try {
    const res = await fetch(FIREBASE_URL + '/data.json');
    if (res.ok) {
      const serverData = await res.json();
      if (serverData) return migrateData(serverData);
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function saveData(d) {
  const toSave = d || data;
  fetch(FIREBASE_URL + '/data.json', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toSave),
  }).catch(() => {});
}

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
  const dk = frequency === 'weekly' ? getWeekKey() : getDateKey();
  return `${childId}_${taskId}_${dk}`;
}

function isCompleted(childId, taskId, frequency) {
  return !!data.completions[completionKey(childId, taskId, frequency)];
}

function isTaskForChild(task, childId) {
  return task.assignedTo.length === 0 || task.assignedTo.includes(childId);
}

function isTaskVisibleToday(task) {
  if (task.frequency === 'daily') return true;
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
  return data.tasks.filter(t =>
    t.frequency === frequency &&
    isTaskForChild(t, childId) &&
    isTaskVisibleToday(t)
  );
}

function renderChild() {
  const child = data.children.find(c => c.id === currentChildId);
  if (!child) return goHome();

  document.getElementById('child-avatar').textContent = child.avatar;
  document.getElementById('child-name').textContent = child.name;
  document.getElementById('child-coins').textContent = child.coins;

  const dailyTasks = getChildTasks(child.id, 'daily');
  const weeklyTasks = getChildTasks(child.id, 'weekly');

  renderTaskList('daily-tasks', dailyTasks, child.id);
  renderTaskList('weekly-tasks', weeklyTasks, child.id);

  document.getElementById('daily-section').style.display = dailyTasks.length ? 'block' : 'none';
  document.getElementById('weekly-section').style.display = weeklyTasks.length ? 'block' : 'none';

  const completedDaily = dailyTasks.filter(t => isCompleted(child.id, t.id, 'daily')).length;
  const totalDaily = dailyTasks.length;
  const pct = totalDaily > 0 ? (completedDaily / totalDaily) * 100 : 0;

  document.getElementById('daily-progress-fill').style.width = pct + '%';
  document.getElementById('daily-progress-text').textContent =
    totalDaily > 0 ? `${completedDaily} / ${totalDaily}` : '';

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

  if (!confirm(`להמיר ${reward.cost} מטבעות ל"${reward.name}"?`)) return;

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
  if (pin === data.parentPin) {
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

function renderManageChildren() {
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
  if (!child || !confirm(`למחוק את ${child.name}?`)) return;

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
            <div class="item-detail">${task.frequency === 'daily' ? 'יומית' : 'שבועית'}</div>
          </div>
          <div class="coins-edit">
            <input type="number" class="coins-input" value="${task.coins}" min="1" max="50"
                   onchange="updateTaskCoins('${task.id}', this.value)">
            <span>🪙</span>
          </div>
          <button class="btn-delete" onclick="deleteTask('${task.id}')">✕</button>
        </div>
        ${daySelect ? `<div class="task-day-row">${daySelect}</div>` : ''}
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
    if (task.assignedTo.length === 0) {
      task.assignedTo = [];
    }
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
  if (!container) return;
  if (data.children.length === 0) {
    container.innerHTML = '<span class="children-label">אין ילדים עדיין</span>';
    return;
  }
  container.innerHTML = data.children.map(child => {
    const sel = newTaskChildIds.includes(child.id);
    return `<span class="child-toggle ${sel ? 'active' : ''}"
                  onclick="toggleNewTaskChild('${child.id}')"
                  title="${child.name}">${child.avatar} ${child.name}</span>`;
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
  if (!task || !confirm(`למחוק את "${task.name}"?`)) return;

  data.tasks = data.tasks.filter(t => t.id !== id);
  saveData();
  renderManageTasks();
}

// ── Manage Rewards ──

function renderManageRewards() {
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
  if (!reward || !confirm(`למחוק את "${reward.name}"?`)) return;

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

// ── Reset ──

function resetCoins() {
  if (!confirm('לאפס את המטבעות של כל הילדים?')) return;
  if (!confirm('בטוח? הפעולה לא ניתנת לביטול')) return;
  data.children.forEach(c => c.coins = 0);
  saveData();
  alert('המטבעות אופסו');
  renderParent();
}

async function resetAll() {
  if (!confirm('למחוק את כל הנתונים? ילדים, משימות, מתנות ומטבעות?')) return;
  if (!confirm('בטוח לגמרי? הפעולה לא ניתנת לביטול!')) return;
  data = JSON.parse(JSON.stringify(DEFAULT_DATA));
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

// ── Cleanup old Service Worker ──

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs =>
    regs.forEach(r => r.unregister())
  );
}

// ── Init ──

async function init() {
  data = await loadData();
  renderHome();
}

init();

setInterval(async () => {
  data = await loadData();
  const activeScreen = document.querySelector('.screen.active');
  if (!activeScreen) return;
  if (activeScreen.id === 'screen-child') renderChild();
  else if (activeScreen.id === 'screen-home') renderHome();
  else if (activeScreen.id === 'screen-store') renderStore();
}, 3000);
