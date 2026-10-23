/**
 * FRONTEND CONTROLLER - Dashboard Aktivitas & Target
 */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxl3rwFhja-GUaFjYrWvKdEmChOSEdR13EeOwxGLSrOLBkUCYLYUfSe5HSk---aaEFjaA/exec";

let activeTab = "activities";
let currentDailyActivities = [];
let currentTargets = [];

document.addEventListener("DOMContentLoaded", () => {
  initTimeSelectors();
  
  const todayStr = formatDateToISO(new Date());
  document.getElementById("inputDate").value = todayStr;
  document.getElementById("dashboardFilterDate").value = todayStr;
  document.getElementById("targetDate").value = todayStr;

  loadDailyActivities();
});

// Switch Tab Navbar
function switchTab(tab) {
  activeTab = tab;
  const btnAct = document.getElementById("navBtnActivities");
  const btnTgt = document.getElementById("navBtnTargets");
  const tabAct = document.getElementById("tabActivities");
  const tabTgt = document.getElementById("tabTargets");

  if (tab === "activities") {
    btnAct.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer bg-blue-600 text-white shadow-xs";
    btnTgt.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200";
    tabAct.classList.remove("hidden");
    tabTgt.classList.add("hidden");
    loadDailyActivities();
  } else {
    btnTgt.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer bg-emerald-600 text-white shadow-xs";
    btnAct.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200";
    tabTgt.classList.remove("hidden");
    tabAct.classList.add("hidden");
    loadTargets();
  }
}

function refreshCurrentTab() {
  if (activeTab === "activities") loadDailyActivities();
  else loadTargets();
}

function initTimeSelectors() {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  ["startHour", "endHour", "editStartHour", "editEndHour"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = hours.map(h => `<option value="${h}">${h}</option>`).join("");
  });

  ["startMinute", "endMinute", "editStartMinute", "editEndMinute"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = minutes.map(m => `<option value="${m}">${m}</option>`).join("");
  });

  const now = new Date();
  const curH = String(now.getHours()).padStart(2, "0");
  const curM = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0");
  const nextH = String((now.getHours() + 1) % 24).padStart(2, "0");

  document.getElementById("startHour").value = curH;
  document.getElementById("startMinute").value = curM;
  document.getElementById("endHour").value = nextH;
  document.getElementById("endMinute").value = curM;
}

// ==========================================
// 1. LOGIKA AKTIVITAS
// ==========================================

async function loadDailyActivities() {
  const loading = document.getElementById("dailyLoading");
  const container = document.getElementById("dailyContainer");
  const filterDateVal = document.getElementById("dashboardFilterDate").value;

  loading.classList.remove("hidden");
  container.classList.add("hidden");

  document.getElementById("dailyDateLabel").innerText = formatDateFullIndo(filterDateVal);
  document.getElementById("selectedDateText").innerText = formatDateShortIndo(filterDateVal);

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getDailyActivities&date=${filterDateVal}`);
    const json = await res.json();
    loading.classList.add("hidden");

    if (json.status === "success") {
      currentDailyActivities = json.data || [];
      renderDailyList(currentDailyActivities);
      container.classList.remove("hidden");
    } else throw new Error(json.message);
  } catch (err) {
    loading.classList.add("hidden");
    container.classList.remove("hidden");
    container.innerHTML = `<div class="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold text-center">Gagal memuat data: ${err.message}</div>`;
  }
}

function renderDailyList(activities) {
  const container = document.getElementById("dailyContainer");
  document.getElementById("statTotalActivities").innerText = activities.length;
  container.innerHTML = "";

  if (activities.length === 0) {
    container.innerHTML = `<div class="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">Belum ada aktivitas yang dicatat untuk tanggal ini.</div>`;
    return;
  }

  [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime)).forEach(item => {
    const card = document.createElement("div");
    card.className = "p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs";

    card.innerHTML = `
      <div class="space-y-1.5 w-full">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            ⏰ ${escapeHtml(item.startTime)} - ${escapeHtml(item.endTime)}
          </span>
          <span class="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
            ${escapeHtml(item.category)}
          </span>
        </div>
        <h3 class="text-sm font-bold text-slate-900 mt-1">${escapeHtml(item.activity)}</h3>
        ${item.notes && item.notes !== "-" ? `<p class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">📝 ${escapeHtml(item.notes)}</p>` : ""}
      </div>

      <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
        <button onclick="openEditModal('${item.id}')" class="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer">✏️ Edit</button>
        <button onclick="handleDeleteActivity('${item.id}')" class="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer">🗑️ Hapus</button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const btn = document.getElementById("btnSubmitActivity");
  const alertBox = document.getElementById("formAlert");

  const startTime = `${document.getElementById("startHour").value}:${document.getElementById("startMinute").value}`;
  const endTime = `${document.getElementById("endHour").value}:${document.getElementById("endMinute").value}`;
  const inputDateVal = document.getElementById("inputDate").value;

  const payload = {
    date: inputDateVal,
    startTime: startTime,
    endTime: endTime,
    category: document.getElementById("inputCategory").value,
    activity: document.getElementById("inputActivity").value,
    notes: document.getElementById("inputNotes").value
  };

  btn.disabled = true;
  btn.innerText = "Menyimpan...";

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "addActivity", data: payload })
    });
    const result = await res.json();

    if (result.status === "success") {
      alertBox.innerText = "Aktivitas berhasil disimpan!";
      alertBox.className = "text-xs text-center p-2 rounded-lg font-medium bg-emerald-50 text-emerald-700 block border border-emerald-200";
      document.getElementById("inputActivity").value = "";
      document.getElementById("inputNotes").value = "";
      document.getElementById("dashboardFilterDate").value = inputDateVal;
      loadDailyActivities();
    } else throw new Error(result.message);
  } catch (err) {
    alertBox.innerText = "Gagal: " + err.message;
    alertBox.className = "text-xs text-center p-2 rounded-lg font-medium bg-rose-50 text-rose-700 block border border-rose-200";
  } finally {
    btn.disabled = false;
    btn.innerText = "+ Simpan Kegiatan";
    setTimeout(() => alertBox.classList.add("hidden"), 3500);
  }
}

function openEditModal(id) {
  const item = currentDailyActivities.find(a => String(a.id) === String(id));
  if (!item) return;

  document.getElementById("editId").value = item.id;
  document.getElementById("editDate").value = item.date;

  const [sH, sM] = (item.startTime || "00:00").split(":");
  const [eH, eM] = (item.endTime || "00:00").split(":");

  document.getElementById("editStartHour").value = sH;
  document.getElementById("editStartMinute").value = sM;
  document.getElementById("editEndHour").value = eH;
  document.getElementById("editEndMinute").value = eM;

  document.getElementById("editCategory").value = item.category;
  document.getElementById("editActivity").value = item.activity;
  document.getElementById("editNotes").value = item.notes === "-" ? "" : item.notes;

  document.getElementById("editModal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
}

async function handleEditSubmit(event) {
  event.preventDefault();
  const btn = document.getElementById("btnSaveEdit");

  const startTime = `${document.getElementById("editStartHour").value}:${document.getElementById("editStartMinute").value}`;
  const endTime = `${document.getElementById("editEndHour").value}:${document.getElementById("editEndMinute").value}`;

  const payload = {
    id: document.getElementById("editId").value,
    date: document.getElementById("editDate").value,
    startTime: startTime,
    endTime: endTime,
    category: document.getElementById("editCategory").value,
    activity: document.getElementById("editActivity").value,
    notes: document.getElementById("editNotes").value
  };

  btn.disabled = true;
  btn.innerText = "Menyimpan...";

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "updateActivity", data: payload })
    });
    const result = await res.json();

    if (result.status === "success") {
      closeEditModal();
      loadDailyActivities();
    } else alert("Gagal update: " + result.message);
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Simpan Perubahan";
  }
}

async function handleDeleteActivity(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus aktivitas ini?")) return;
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "deleteActivity", id: id })
    });
    const result = await res.json();
    if (result.status === "success") loadDailyActivities();
    else alert("Gagal menghapus: " + result.message);
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ==========================================
// 2. LOGIKA TARGET
// ==========================================

async function loadTargets() {
  const loading = document.getElementById("targetLoading");
  const container = document.getElementById("targetContainer");

  loading.classList.remove("hidden");
  container.classList.add("hidden");

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getTargets`);
    const json = await res.json();
    loading.classList.add("hidden");

    if (json.status === "success") {
      currentTargets = json.data || [];
      renderTargetList(currentTargets);
      container.classList.remove("hidden");
    } else throw new Error(json.message);
  } catch (err) {
    loading.classList.add("hidden");
    container.classList.remove("hidden");
    container.innerHTML = `<div class="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold text-center">Gagal memuat target: ${err.message}</div>`;
  }
}

function renderTargetList(targets) {
  const container = document.getElementById("targetContainer");
  document.getElementById("statTotalTargets").innerText = targets.length;
  container.innerHTML = "";

  if (targets.length === 0) {
    container.innerHTML = `<div class="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">Belum ada target yang ditentukan.</div>`;
    return;
  }

  // URUTKAN DARI TANGGAL TERDEKAT KE PALING JAUH
  const sortedTargets = [...targets].sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));

  sortedTargets.forEach(item => {
    const isDone = item.status === "Sudah";
    const card = document.createElement("div");
    card.className = `p-4 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
      isDone ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-slate-200"
    }`;

    card.innerHTML = `
      <div class="space-y-1 w-full">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
            📅 ${formatDateFullIndo(item.targetDate)}
          </span>
          <span class="text-xs font-bold px-2.5 py-0.5 rounded-md border ${
            isDone ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-amber-100 text-amber-700 border-amber-300"
          }">
            ${isDone ? "✓ Sudah Dilaksanakan" : "⏳ Belum Dilaksanakan"}
          </span>
        </div>
        <h3 class="text-base font-bold text-slate-900 ${isDone ? "line-through text-slate-400" : ""}">${escapeHtml(item.title)}</h3>
      </div>

      <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
        <button onclick="openEditTargetModal('${item.id}')" class="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer">
          ✏️ Edit
        </button>
        <button onclick="toggleTargetStatus('${item.id}', '${isDone ? "Belum" : "Sudah"}')" class="px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
          isDone ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-emerald-600 text-white hover:bg-emerald-700"
        }">
          ${isDone ? "Tandai Belum" : "Tandai Sudah"}
        </button>
        <button onclick="handleDeleteTarget('${item.id}')" class="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer">
          🗑️
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function handleTargetSubmit(event) {
  event.preventDefault();
  const btn = document.getElementById("btnSubmitTarget");
  const alertBox = document.getElementById("targetFormAlert");

  const payload = {
    title: document.getElementById("targetTitle").value,
    targetDate: document.getElementById("targetDate").value
  };

  btn.disabled = true;
  btn.innerText = "Menyimpan...";

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "addTarget", data: payload })
    });
    const result = await res.json();

    if (result.status === "success") {
      alertBox.innerText = "Target berhasil ditambahkan!";
      alertBox.className = "text-xs text-center p-2 rounded-lg font-medium bg-emerald-50 text-emerald-700 block border border-emerald-200";
      document.getElementById("targetTitle").value = "";
      loadTargets();
    } else throw new Error(result.message);
  } catch (err) {
    alertBox.innerText = "Gagal: " + err.message;
    alertBox.className = "text-xs text-center p-2 rounded-lg font-medium bg-rose-50 text-rose-700 block border border-rose-200";
  } finally {
    btn.disabled = false;
    btn.innerText = "+ Simpan Target";
    setTimeout(() => alertBox.classList.add("hidden"), 3500);
  }
}

function openEditTargetModal(id) {
  const item = currentTargets.find(t => String(t.id) === String(id));
  if (!item) return;

  document.getElementById("editTargetId").value = item.id;
  document.getElementById("editTargetTitle").value = item.title;
  document.getElementById("editTargetDate").value = item.targetDate;

  document.getElementById("editTargetModal").classList.remove("hidden");
}

function closeEditTargetModal() {
  document.getElementById("editTargetModal").classList.add("hidden");
}

async function handleEditTargetSubmit(event) {
  event.preventDefault();
  const btn = document.getElementById("btnSaveEditTarget");

  const payload = {
    id: document.getElementById("editTargetId").value,
    title: document.getElementById("editTargetTitle").value,
    targetDate: document.getElementById("editTargetDate").value
  };

  btn.disabled = true;
  btn.innerText = "Menyimpan...";

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "updateTarget", data: payload })
    });
    const result = await res.json();

    if (result.status === "success") {
      closeEditTargetModal();
      loadTargets();
    } else alert("Gagal update target: " + result.message);
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Simpan Perubahan";
  }
}

async function toggleTargetStatus(id, newStatus) {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "toggleTargetStatus", id: id, status: newStatus })
    });
    const result = await res.json();
    if (result.status === "success") loadTargets();
    else alert("Gagal update status: " + result.message);
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function handleDeleteTarget(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus target ini?")) return;
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "deleteTarget", id: id })
    });
    const result = await res.json();
    if (result.status === "success") loadTargets();
    else alert("Gagal menghapus target: " + result.message);
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ==========================================
// HELPERS (Format Tanggal & Nama Hari Otomatis Bahasa Indonesia)
// ==========================================

function formatDateToISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateFullIndo(dateStr) {
  if (!dateStr) return "";
  let cleanStr = String(dateStr).trim();
  
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  if (cleanStr.includes("/")) {
    const dateObj = new Date(cleanStr);
    if (!isNaN(dateObj.getTime())) {
      return `${days[dateObj.getDay()]}, ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    }
  } else if (cleanStr.includes("-")) {
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      let y = parseInt(parts[0]);
      let m = parseInt(parts[1]) - 1;
      let d = parseInt(parts[2]);
      const dateObj = new Date(y, m, d);
      if (!isNaN(dateObj.getTime())) {
        return `${days[dateObj.getDay()]}, ${d} ${months[m]} ${y}`;
      }
    }
  }
  return cleanStr;
}

function formatDateShortIndo(dateStr) {
  if (!dateStr) return "";
  let cleanStr = String(dateStr).trim();
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

  if (cleanStr.includes("/")) {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()} ${months[d.getMonth()]}`;
    }
  } else if (cleanStr.includes("-")) {
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      let y = parseInt(parts[0]);
      let m = parseInt(parts[1]) - 1;
      let d = parseInt(parts[2]);
      const dateObj = new Date(y, m, d);
      if (!isNaN(dateObj.getTime())) {
        return `${d} ${months[m]}`;
      }
    }
  }
  return cleanStr;
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
