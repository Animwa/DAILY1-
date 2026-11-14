/**
 * FRONTEND LOGIC - 1% Daily Habit & Activity Tracker (Optimized Sync)
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyhdyr9GIS_bOW6BzNcMcPIEDT77Pdh_g7i3V1wwj3m37B-OPXhFOqCVUQH9yNsZgv02w/exec"; // Ganti dengan URL deployment Web App Apps Script Anda

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
  let targetInput = document.getElementById('targetDeadline');
  if (targetInput) targetInput.value = today;
  fetchAllData();
};

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

async function verifyAdminPin(e) {
  e.preventDefault();
  const pin = document.getElementById('adminPinInput').value;
  try {
    let res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "verifyPin", pin: pin })
    });
    let json = await res.json();
    if (json.status === "success") {
      closeLoginModal();
      toggleAdminMode(true);
    } else {
      alert("Kode akses salah!");
    }
  } catch (err) {
    console.error("Gagal verifikasi PIN:", err);
    alert("Kesalahan koneksi saat verifikasi.");
  }
}

function toggleAdminMode(status) {
  isAdmin = status;
  document.getElementById('adminBadge').classList.toggle('hidden', !isAdmin);
  renderNotes();
  renderActivities();
  renderTargets();
  alert(isAdmin ? "Mode Admin Aktif! Tombol Edit/Hapus terbuka." : "Mode Admin Dinonaktifkan.");
}

// Sinkronisasi data dari Google Sheets dengan indikator loading
async function fetchAllData() {
  const syncBtn = document.querySelector('button[onclick="fetchAllData()"]');
  if (syncBtn) syncBtn.innerHTML = "🔄 Menyinkronkan...";

  try {
    let res = await fetch(SCRIPT_URL + "?action=getAllData");
    let json = await res.json();
    if (json.status === "success") {
      appData = json.data;
      renderAll();
    }
  } catch (err) {
    console.error("Gagal memuat data:", err);
    alert("Gagal menyinkronkan data. Periksa kembali URL Web App Apps Script Anda.");
  } finally {
    if (syncBtn) syncBtn.innerHTML = "🔄 Sinkronisasi";
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

// --- RENDER ACTIVITIES & DYNAMIC NOTES ---
function renderActivities() {
  let todoContainer = document.getElementById('todoActivitiesContainer');
  let todos = appData.activities;

  if (todos.length === 0) {
    todoContainer.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Belum ada kegiatan harian.</p>`;
    return;
  }

  todoContainer.innerHTML = todos.map(a => `
    <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="font-bold text-sm text-slate-800" dir="auto">${escapeHtml(a.activity)}</h4>
        <div class="flex items-center gap-2">
          <button onclick="completeActivity('${a.id}')" class="px-3 py-1.5 ${a.status === 'Selesai' ? 'bg-amber-500' : 'bg-emerald-600'} hover:opacity-90 text-white rounded-lg text-xs font-semibold cursor-pointer">
            ${a.status === 'Selesai' ? 'Batalkan' : 'Tandai Selesai'}
          </button>
          ${isAdmin ? `<button onclick="deleteActivity('${a.id}')" class="text-red-500 text-xs px-2 py-1 cursor-pointer">Hapus</button>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-2 pt-1">
        <input type="text" id="actNoteInput_${a.id}" dir="auto" value="${escapeHtml(a.notes || '')}" placeholder="Tambah catatan kegiatan (cth: Juz 1-2)..." class="w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-white outline-none focus:ring-1 focus:ring-blue-500">
        <button onclick="saveActivityNotes('${a.id}')" class="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap">Simpan Catatan</button>
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
            ${item.notes ? `<div class="text-blue-600 font-medium">Catatan: ${escapeHtml(item.notes)}</div>` : ''}
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

// --- FORM SUBMIT HANDLERS ---
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
  const today = new Date().toISOString().split('T')[0];
  let payload = {
    action: "addActivity",
    data: {
      date: today,
      activity: document.getElementById('actName').value
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

// --- USER ACTIONS ---
async function completeActivity(id) {
  await sendPost({ action: "completeActivity", id: id });
  fetchAllData();
}

async function saveActivityNotes(id) {
  let notesVal = document.getElementById('actNoteInput_' + id).value;
  await sendPost({ action: "updateActivityNotes", id: id, notes: notesVal });
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

// Fungsi pengiriman POST stabil tanpa header pemicu CORS preflight error
async function sendPost(payload) {
  try {
    let res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error("Error POST:", err);
    alert("Gagal mengirim data ke server. Periksa koneksi internet Anda.");
  }
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
