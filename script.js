/**
 * FRONTEND LOGIC - 1% Daily Habit & Activity Tracker
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0T8Z_b0NvYHgz4BSTUGHnLZ36hKx6ebiFKdpymywU2hu6mtWps3pNS61D1pXcDfbAgw/exec"; // Ganti dengan URL deployment Web App Apps Script Anda
const ADMIN_PIN = "1234"; // PIN Admin Anda

let appData = { notes: [], activities: [], targets: [] };
let isAdmin = false;
let currentTargetSub = "Usaha";
let secretClickCount = 0;

// Proteksi DevTools & Klik Kanan
document.addEventListener('keydown', e => {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) || (e.ctrlKey && e.key === 'U')) {
    e.preventDefault();
    alert('Akses dibatasi.');
    return false;
  }
});

// Shortcut Keyboard Tersembunyi untuk Login Admin (Ctrl + Alt + M)
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'm') {
    e.preventDefault();
    if (!isAdmin) {
      document.getElementById('loginModal').classList.remove('hidden');
    } else {
      toggleAdminMode(false);
    }
  }
});

window.onload = () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('actDate').value = today;
  document.getElementById('targetDeadline').value = today;
  fetchAllData();
};

// Pemicu Klik Rahasia 5x pada header utama
function secretAdminTrigger() {
  secretClickCount++;
  if (secretClickCount >= 5) {
    secretClickCount = 0;
    if (!isAdmin) {
      document.getElementById('loginModal').classList.remove('hidden');
    } else {
      toggleAdminMode(false);
    }
  }
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

function verifyAdminPin(e) {
  e.preventDefault();
  const pin = document.getElementById('adminPinInput').value;
  if (pin === ADMIN_PIN) {
    closeLoginModal();
    toggleAdminMode(true);
  } else {
    alert("PIN Salah!");
  }
}

function toggleAdminMode(status) {
  isAdmin = status;
  document.getElementById('adminBadge').classList.toggle('hidden', !isAdmin);
  
  // Update Lock Badges & Submit Buttons
  ['note', 'act', 'target'].forEach(prefix => {
    let badge = document.getElementById(prefix + 'LockBadge');
    let btn = document.getElementById('btnSubmit' + capitalize(prefix === 'act' ? 'activity' : prefix));
    if (badge && btn) {
      if (isAdmin) {
        badge.className = "text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-md";
        badge.innerText = "Terbuka (Admin)";
        btn.disabled = false;
        btn.className = "w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition cursor-pointer";
        if(prefix === 'target') btn.className = "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-sm transition cursor-pointer";
      } else {
        badge.className = "text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-md";
        badge.innerText = "Terkunci (Admin)";
        btn.disabled = true;
        btn.className = "w-full bg-slate-300 text-slate-600 font-semibold py-2.5 rounded-lg text-sm transition cursor-pointer";
      }
    }
  });

  renderNotes();
  renderActivities();
  renderTargets();
  alert(isAdmin ? "Mode Admin Aktif! Fitur Tambah/Edit/Hapus Terbuka." : "Mode Admin Dinonaktifkan.");
}

async function fetchAllData() {
  try {
    let res = await fetch(SCRIPT_URL + "?action=getAllData");
    let json = await res.json();
    if (json.status === "success") {
      appData = json.data;
      renderAll();
    }
  } catch (err) {
    console.error("Gagal memuat data:", err);
  }
}

function renderAll() {
  renderNotes();
  renderActivities();
  renderTargets();
}

// --- NAVIGASI UTAMA ---
function switchMainTab(tab) {
  ['dashboard', 'aktivitas', 'target'].forEach(t => {
    document.getElementById('tab' + capitalize(t)).classList.toggle('hidden', t !== tab);
    let btn = document.getElementById('navMain' + capitalize(t));
    if (t === tab) {
      btn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer bg-blue-600 text-white shadow-xs whitespace-nowrap";
    } else {
      btn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap";
    }
  });
}

// --- SUB NAVIGASI AKTIVITAS ---
function switchSubAktivitas(sub) {
  document.getElementById('subContainerKegiatan').classList.toggle('hidden', sub !== 'kegiatan');
  document.getElementById('subContainerRiwayat').classList.toggle('hidden', sub !== 'riwayat');
  
  document.getElementById('subBtnKegiatan').className = sub === 'kegiatan' ? "px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white cursor-pointer transition" : "px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition";
  document.getElementById('subBtnRiwayat').className = sub === 'riwayat' ? "px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white cursor-pointer transition" : "px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition";
  
  if (sub === 'riwayat') renderDailyGrid();
}

// --- SUB NAVIGASI TARGET ---
function switchSubTarget(cat) {
  currentTargetSub = cat;
  ['Usaha', 'Kebutuhan', 'Kewajiban', 'Skripsi'].forEach(c => {
    let btn = document.getElementById('targetSub' + c);
    if (btn) {
      btn.className = c === cat ? "px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white cursor-pointer transition whitespace-nowrap" : "px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition whitespace-nowrap";
    }
  });
  document.getElementById('targetCategoryInput').value = cat;
  document.getElementById('targetFormTitle').innerText = "🎯 Tambah Target " + cat;
  document.getElementById('targetListTitle').innerText = "Daftar Target " + cat;
  renderTargets();
}

// --- RENDER NOTES ---
function renderNotes() {
  let container = document.getElementById('notesContainer');
  document.getElementById('statTotalNotes').innerText = appData.notes.length;
  if (appData.notes.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 col-span-2 text-center py-6">Belum ada catatan.</p>`;
    return;
  }
  container.innerHTML = appData.notes.map(n => `
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative">
      <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(n.title)}</h3>
      <p class="text-xs text-slate-600 whitespace-pre-wrap" dir="auto">${escapeHtml(n.content)}</p>
      ${isAdmin ? `
        <div class="flex gap-2 pt-2 border-t border-slate-100 mt-2">
          <button onclick='openEditNoteModal(${JSON.stringify(n)})' class="text-xs text-blue-600 font-semibold cursor-pointer">Edit</button>
          <button onclick="deleteNote('${n.id}')" class="text-xs text-red-600 font-semibold cursor-pointer">Hapus</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// --- RENDER ACTIVITIES (TO-DO) ---
function renderActivities() {
  let todoContainer = document.getElementById('todoActivitiesContainer');
  let todos = appData.activities;

  if (todos.length === 0) {
    todoContainer.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Belum ada kegiatan rutin harian.</p>`;
    return;
  }

  todoContainer.innerHTML = todos.map(a => `
    <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
      <div>
        <span class="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">${a.category}</span>
        <h4 class="font-bold text-sm text-slate-800 mt-1" dir="auto">${escapeHtml(a.activity)}</h4>
        <p class="text-xs text-slate-500">📅 ${a.date} | ⏰ ${a.startTime} - ${a.endTime} | Status: <span class="${a.status === 'Selesai' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}">${a.status}</span></p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="completeActivity('${a.id}')" class="px-3 py-1.5 ${a.status === 'Selesai' ? 'bg-amber-500' : 'bg-emerald-600'} hover:opacity-90 text-white rounded-lg text-xs font-semibold cursor-pointer">
          ${a.status === 'Selesai' ? 'Batalkan' : 'Tandai Selesai'}
        </button>
        ${isAdmin ? `<button onclick="deleteActivity('${a.id}')" class="text-red-500 text-xs px-2 py-1 cursor-pointer">Hapus</button>` : ''}
      </div>
    </div>
  `).join('');
}

// --- RENDER RIWAYAT HARIAN GRID ---
function renderDailyGrid() {
  let gridContainer = document.getElementById('dailyGridContainer');
  let completed = appData.activities.filter(a => a.status === "Selesai" && a.completedDate);

  let grouped = {};
  completed.forEach(a => {
    let d = a.completedDate;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(a);
  });

  let dates = Object.keys(grouped).sort().reverse();
  if (dates.length === 0) {
    gridContainer.innerHTML = `<p class="text-xs text-slate-400 col-span-2 text-center py-6">Belum ada riwayat kegiatan selesai.</p>`;
    return;
  }

  gridContainer.innerHTML = dates.map(date => `
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div class="border-b border-slate-100 pb-2 flex justify-between items-center">
        <h3 class="font-bold text-slate-900 text-sm">📅 ${date}</h3>
        <span class="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">${grouped[date].length} Selesai</span>
      </div>
      <div class="space-y-2">
        ${grouped[date].map(item => `
          <div class="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
            <div class="font-bold text-slate-800" dir="auto">${escapeHtml(item.activity)}</div>
            <div class="text-slate-500">${item.category} • ⏰ ${item.startTime} - ${item.endTime}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// --- RENDER TARGETS ---
function renderTargets() {
  let container = document.getElementById('targetContainer');
  let filtered = appData.targets.filter(t => t.category === currentTargetSub);
  document.getElementById('targetCountBadge').innerText = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Belum ada target untuk kategori ${currentTargetSub}.</p>`;
    return;
  }

  container.innerHTML = filtered.map(t => `
    <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
      <div>
        <h4 class="font-bold text-sm text-slate-800 ${t.status === 'Selesai' ? 'line-through text-slate-400' : ''}" dir="auto">${escapeHtml(t.title)}</h4>
        <p class="text-xs text-slate-500">⏳ Tenggat: ${t.deadline}</p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="toggleTargetStatus('${t.id}', '${t.status === 'Selesai' ? 'Belum' : 'Selesai'}')" class="px-3 py-1.5 ${t.status === 'Selesai' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-lg text-xs font-semibold cursor-pointer">
          ${t.status === 'Selesai' ? 'Batalkan' : 'Selesai'}
        </button>
        ${isAdmin ? `<button onclick="deleteTarget('${t.id}')" class="text-red-500 text-xs px-2 py-1 cursor-pointer">Hapus</button>` : ''}
      </div>
    </div>
  `).join('');
}

// --- FORM SUBMIT HANDLERS (ADMIN ONLY) ---
async function handleNoteSubmit(e) {
  e.preventDefault();
  if (!isAdmin) return alert("Akses ditolak. Masuk sebagai admin terlebih dahulu.");
  let payload = { action: "addNote", data: { title: document.getElementById('noteTitle').value, content: document.getElementById('noteContent').value } };
  await sendPost(payload);
  document.getElementById('noteForm').reset();
  fetchAllData();
}

async function handleActivitySubmit(e) {
  e.preventDefault();
  if (!isAdmin) return alert("Akses ditolak. Masuk sebagai admin terlebih dahulu.");
  let payload = {
    action: "addActivity",
    data: {
      date: document.getElementById('actDate').value,
      startTime: document.getElementById('actStart').value,
      endTime: document.getElementById('actEnd').value,
      category: document.getElementById('actCategory').value,
      activity: document.getElementById('actName').value,
      notes: document.getElementById('actNotes').value
    }
  };
  await sendPost(payload);
  document.getElementById('activityForm').reset();
  fetchAllData();
}

async function handleTargetSubmit(e) {
  e.preventDefault();
  if (!isAdmin) return alert("Akses ditolak. Masuk sebagai admin terlebih dahulu.");
  let payload = {
    action: "addTarget",
    data: {
      title: document.getElementById('targetTitle').value,
      category: document.getElementById('targetCategoryInput').value,
      deadline: document.getElementById('targetDeadline').value
    }
  };
  await sendPost(payload);
  document.getElementById('targetTitle').value = '';
  fetchAllData();
}

// --- USER ACTIONS (TANPA PERLU LOGIN) ---
async function completeActivity(id) {
  let act = appData.activities.find(a => a.id === id);
  let newStatus = (act && act.status === 'Selesai') ? 'Belum' : 'Selesai';
  await sendPost({ action: "completeActivity", id: id });
  fetchAllData();
}

async function toggleTargetStatus(id, status) {
  await sendPost({ action: "toggleTargetStatus", id: id, status: status });
  fetchAllData();
}

// --- ADMIN DELETE & EDIT ---
function openEditNoteModal(note) {
  document.getElementById('editNoteId').value = note.id;
  document.getElementById('editNoteTitle').value = note.title;
  document.getElementById('editNoteContent').value = note.content;
  document.getElementById('editNoteModal').classList.remove('hidden');
}

function closeEditNoteModal() {
  document.getElementById('editNoteModal').classList.add('hidden');
}

async function handleEditNoteSubmit(e) {
  e.preventDefault();
  let payload = {
    action: "updateNote",
    data: {
      id: document.getElementById('editNoteId').value,
      title: document.getElementById('editNoteTitle').value,
      content: document.getElementById('editNoteContent').value
    }
  };
  await sendPost(payload);
  closeEditNoteModal();
  fetchAllData();
}

async function deleteNote(id) {
  if (confirm("Hapus catatan ini?")) {
    await sendPost({ action: "deleteNote", id: id });
    fetchAllData();
  }
}

async function deleteActivity(id) {
  if (confirm("Hapus kegiatan ini?")) {
    await sendPost({ action: "deleteActivity", id: id });
    fetchAllData();
  }
}

async function deleteTarget(id) {
  if (confirm("Hapus target ini?")) {
    await sendPost({ action: "deleteTarget", id: id });
    fetchAllData();
  }
}

async function sendPost(payload) {
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Error POST:", err);
  }
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
