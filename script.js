/**
 * FRONTEND LOGIC - 1% Daily Habit & Activity Tracker (Format Tanggal Konsisten & Edit Kegiatan)
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxurwk5648ciLG-RNZS7WnxHYQPVG8wnhugpBT4gC7Y00wTar1UcXwjitD4mKuzw4s7/exec"; 

let appData = { notes: [], activities: [], targets: [] };
let isAdmin = false;
let currentTargetSub = "Usaha";
let secretClickCount = 0;
let currentSelectedDate = "";

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
  currentSelectedDate = today;
  
  let dateInput = document.getElementById('selectedActivityDate');
  if (dateInput) dateInput.value = today;
  
  let targetInput = document.getElementById('targetDeadline');
  if (targetInput) targetInput.value = today;

  updateDayBadge(today);
  fetchAllData();
};

function onDateChanged() {
  let dateInput = document.getElementById('selectedActivityDate');
  currentSelectedDate = dateInput.value;
  updateDayBadge(currentSelectedDate);
  renderActivities();
}

// Fungsi Formatting Tanggal Menjadi: Senin, 16 November 2026
function formatIndonesianDate(dateString) {
  if (!dateString) return "";
  let d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('id-ID', options);
}

function updateDayBadge(dateStr) {
  let formatted = formatIndonesianDate(dateStr);
  let dayBadge = document.getElementById('selectedDayBadge');
  if (dayBadge) dayBadge.innerText = formatted;
}

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
  alert(isAdmin ? "Mode Admin Aktif! Tombol Edit & Hapus terbuka." : "Mode Admin Dinonaktifkan.");
}

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
      btn.className = "px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer bg-blue-600 text-white shadow-xs whitespace-nowrap shrink-0";
    } else {
      btn.className = "px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap shrink-0";
    }
  });
}

// --- SUB NAVIGASI AKTIVITAS ---
function switchSubAktivitas(sub) {
  document.getElementById('subContainerKegiatan').classList.toggle('hidden', sub !== 'kegiatan');
  document.getElementById('subContainerRiwayat').classList.toggle('hidden', sub !== 'riwayat');
  
  document.getElementById('subBtnKegiatan').className = sub === 'kegiatan' ? "px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white cursor-pointer transition whitespace-nowrap shrink-0" : "px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition whitespace-nowrap shrink-0";
  document.getElementById('subBtnRiwayat').className = sub === 'riwayat' ? "px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white cursor-pointer transition whitespace-nowrap shrink-0" : "px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition whitespace-nowrap shrink-0";
  
  if (sub === 'riwayat') renderDailyGrid();
}

// --- SUB NAVIGASI TARGET ---
function switchSubTarget(cat) {
  currentTargetSub = cat;
  ['Usaha', 'Kebutuhan', 'Kewajiban', 'Skripsi'].forEach(c => {
    let btn = document.getElementById('targetSub' + c);
    if (btn) {
      btn.className = c === cat ? "px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white cursor-pointer transition whitespace-nowrap shrink-0" : "px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition whitespace-nowrap shrink-0";
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
        <div class="flex gap-3 pt-2 border-t border-slate-100 mt-2">
          <button onclick='openEditNoteModal(${JSON.stringify(n)})' class="text-xs text-blue-600 font-semibold cursor-pointer">Edit</button>
          <button onclick="deleteNote('${n.id}')" class="text-xs text-red-600 font-semibold cursor-pointer">Hapus</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// --- RENDER ACTIVITIES ---
function renderActivities() {
  let todoContainer = document.getElementById('todoActivitiesContainer');
  let todos = appData.activities;

  if (todos.length === 0) {
    todoContainer.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Belum ada kegiatan harian.</p>`;
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  let isDifferentDay = (currentSelectedDate !== todayStr);

  todoContainer.innerHTML = todos.map(a => {
    let displayStatus = isDifferentDay ? "Belum" : a.status;
    let displayNotes = isDifferentDay ? "" : (a.notes || "");

    return `
      <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <h4 class="font-bold text-sm text-slate-800" dir="auto">${escapeHtml(a.activity)}</h4>
          <div class="flex items-center gap-2">
            <button onclick="completeActivityWithNotes('${a.id}')" class="px-3 py-1.5 ${displayStatus === 'Selesai' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-xl text-xs font-semibold cursor-pointer transition">
              ${displayStatus === 'Selesai' ? 'Batalkan' : 'Tandai Selesai'}
            </button>
            ${isAdmin ? `
              <div class="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                <button onclick='openEditActivityModal(${JSON.stringify(a)})' class="text-xs text-blue-600 font-semibold cursor-pointer">Edit</button>
                <button onclick="deleteActivity('${a.id}')" class="text-xs text-red-500 font-semibold cursor-pointer">Hapus</button>
              </div>
            ` : ''}
          </div>
        </div>
        <div>
          <input type="text" id="actNoteInput_${a.id}" dir="auto" value="${escapeHtml(displayNotes)}" placeholder="Isi catatan kegiatan..." class="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-1 focus:ring-blue-500">
        </div>
      </div>
    `;
  }).join('');
}

// --- RENDER RIWAYAT HARIAN GRID (Dengan format tanggal profesional) ---
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

  gridContainer.innerHTML = dates.map(date => {
    let formattedDate = formatIndonesianDate(date);
    return `
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="border-b border-slate-100 pb-2.5 flex justify-between items-center gap-2 flex-wrap">
          <h3 class="font-bold text-slate-900 text-xs sm:text-sm">📅 ${formattedDate}</h3>
          <span class="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">${grouped[date].length} Selesai</span>
        </div>
        <div class="space-y-2">
          ${grouped[date].map(item => `
            <div class="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div class="font-bold text-slate-800" dir="auto">${escapeHtml(item.activity)}</div>
              ${item.notes ? `<div class="text-blue-600 font-medium">Catatan: ${escapeHtml(item.notes)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// --- RENDER TARGETS (Dengan tenggat tanggal terformat) ---
function renderTargets() {
  let container = document.getElementById('targetContainer');
  let filtered = appData.targets.filter(t => t.category === currentTargetSub);
  document.getElementById('targetCountBadge').innerText = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Belum ada target untuk kategori ${currentTargetSub}.</p>`;
    return;
  }

  container.innerHTML = filtered.map(t => {
    let formattedDeadline = formatIndonesianDate(t.deadline);
    return `
      <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl gap-3">
        <div>
          <h4 class="font-bold text-sm text-slate-800 ${t.status === 'Selesai' ? 'line-through text-slate-400' : ''}" dir="auto">${escapeHtml(t.title)}</h4>
          <p class="text-xs text-slate-500 mt-0.5">⏳ Tenggat: ${formattedDeadline}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button onclick="toggleTargetStatus('${t.id}', '${t.status === 'Selesai' ? 'Belum' : 'Selesai'}')" class="px-3.5 py-1.5 ${t.status === 'Selesai' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-xl text-xs font-semibold cursor-pointer transition">
            ${t.status === 'Selesai' ? 'Batalkan' : 'Selesai'}
          </button>
          ${isAdmin ? `<button onclick="deleteTarget('${t.id}')" class="text-red-500 text-xs px-2 py-1 cursor-pointer font-semibold">Hapus</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
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
  let payload = {
    action: "addActivity",
    data: {
      date: currentSelectedDate,
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
async function completeActivityWithNotes(id) {
  let notesInput = document.getElementById('actNoteInput_' + id);
  let notesVal = notesInput ? notesInput.value : "";
  
  await sendPost({ 
    action: "completeActivity", 
    id: id, 
    notes: notesVal, 
    selectedDate: currentSelectedDate 
  });
  fetchAllData();
}

async function toggleTargetStatus(id, status) {
  await sendPost({ action: "toggleTargetStatus", id: id, status: status });
  fetchAllData();
}

// --- ADMIN EDIT & DELETE MODALS ---
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

// Handler Edit Kegiatan
function openEditActivityModal(activity) {
  document.getElementById('editActivityId').value = activity.id;
  document.getElementById('editActivityNameInput').value = activity.activity;
  document.getElementById('editActivityModal').classList.remove('hidden');
}

function closeEditActivityModal() {
  document.getElementById('editActivityModal').classList.add('hidden');
}

async function handleEditActivitySubmit(e) {
  e.preventDefault();
  let payload = {
    action: "updateActivity",
    data: {
      id: document.getElementById('editActivityId').value,
      activity: document.getElementById('editActivityNameInput').value
    }
  };
  await sendPost(payload);
  closeEditActivityModal();
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
    let res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error("Error POST:", err);
  }
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
