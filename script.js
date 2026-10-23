/**
 * FRONTEND CONTROLLER - Daily Activity Tracker Dashboard
 */

// URL DEPLOYMENT GOOGLE APPS SCRIPT
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJqigPqa6AO-JMAFnzck7cZC-WuOCPRQT4QXQZ1HHmBMPOD3kH7Bw6oBTVMuQxg1rqdQ/exec";

let currentDailyActivities = [];

document.addEventListener("DOMContentLoaded", () => {
  initTimeSelectors();
  
  const todayStr = formatDateToISO(new Date());
  document.getElementById("inputDate").value = todayStr;
  document.getElementById("dashboardFilterDate").value = todayStr;

  loadDailyActivities();
});

/**
 * Inisialisasi dropdown jam (00:00 - 23:55)
 */
function initTimeSelectors() {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  const targetHourSelects = ["startHour", "endHour", "editStartHour", "editEndHour"];
  const targetMinuteSelects = ["startMinute", "endMinute", "editStartMinute", "editEndMinute"];

  targetHourSelects.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = hours.map(h => `<option value="${h}">${h}</option>`).join("");
  });

  targetMinuteSelects.forEach(id => {
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

/**
 * READ: Ambil Riwayat Aktivitas Khusus 1 Hari
 */
async function loadDailyActivities() {
  const loading = document.getElementById("dailyLoading");
  const container = document.getElementById("dailyContainer");
  const rangeLabel = document.getElementById("dailyDateLabel");
  const filterDateVal = document.getElementById("dashboardFilterDate").value;

  loading.classList.remove("hidden");
  container.classList.add("hidden");

  rangeLabel.innerText = formatDateFullIndo(filterDateVal);
  document.getElementById("selectedDateText").innerText = formatDateShortIndo(filterDateVal);

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getDailyActivities&date=${filterDateVal}`);
    const json = await res.json();

    loading.classList.add("hidden");

    if (json.status === "success") {
      currentDailyActivities = json.data || [];
      renderDailyList(currentDailyActivities);
      container.classList.remove("hidden");
    } else {
      throw new Error(json.message);
    }
  } catch (err) {
    loading.classList.add("hidden");
    container.classList.remove("hidden");
    container.innerHTML = `<div class="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold text-center">Gagal memuat data: ${err.message}</div>`;
  }
}

/**
 * Render Daftar Aktivitas Harian
 */
function renderDailyList(activities) {
  const container = document.getElementById("dailyContainer");
  const statTotal = document.getElementById("statTotalActivities");
  container.innerHTML = "";

  statTotal.innerText = activities.length;

  if (activities.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 border border-dashed border-slate-200 rounded-xl">
        <p class="text-slate-400 text-sm font-medium">Belum ada aktivitas yang dicatat untuk hari ini.</p>
        <p class="text-slate-400 text-xs mt-1">Gunakan formulir di sebelah kiri untuk menambah kegiatan.</p>
      </div>
    `;
    return;
  }

  // Urutkan berdasarkan jam mulai
  const sortedActivities = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));

  sortedActivities.forEach(item => {
    const card = document.createElement("div");
    card.className = "p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition flex items-start justify-between gap-3 shadow-2xs";

    card.innerHTML = `
      <div class="space-y-1.5 w-full">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
            ⏰ ${item.startTime} - ${item.endTime}
          </span>
          <span class="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md">
            ${escapeHtml(item.category)}
          </span>
        </div>
        <h4 class="text-sm font-semibold text-slate-900">${escapeHtml(item.activity)}</h4>
        ${item.notes && item.notes !== "-" ? `<p class="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">${escapeHtml(item.notes)}</p>` : ""}
      </div>

      <div class="flex items-center gap-1 shrink-0 pt-0.5">
        <button onclick="openEditModal('${item.id}')" title="Edit" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition cursor-pointer">
          ✏️
        </button>
        <button onclick="handleDeleteActivity('${item.id}')" title="Hapus" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition cursor-pointer">
          🗑️
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

/**
 * CREATE: Simpan Aktivitas Baru
 */
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
  alertBox.className = "hidden text-xs text-center p-2 rounded-lg font-medium";

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

      // Samakan filter tanggal dashboard dengan tanggal input
      document.getElementById("dashboardFilterDate").value = inputDateVal;
      loadDailyActivities();
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    alertBox.innerText = "Gagal: " + err.message;
    alertBox.className = "text-xs text-center p-2 rounded-lg font-medium bg-rose-50 text-rose-700 block border border-rose-200";
  } finally {
    btn.disabled = false;
    btn.innerText = "+ Simpan Kegiatan";
    setTimeout(() => alertBox.classList.add("hidden"), 3500);
  }
}

/**
 * UPDATE: Edit Aktivitas
 */
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
    } else {
      alert("Gagal update: " + result.message);
    }
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Simpan Perubahan";
  }
}

/**
 * DELETE: Hapus Aktivitas
 */
async function handleDeleteActivity(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus aktivitas ini?")) return;

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "deleteActivity", id: id })
    });
    const result = await res.json();

    if (result.status === "success") {
      loadDailyActivities();
    } else {
      alert("Gagal menghapus: " + result.message);
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Helpers
function formatDateToISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateFullIndo(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatDateShortIndo(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short"
  });
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
