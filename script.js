/**
 * FRONTEND CONTROLLER - 1% Daily & Weekly Activity Tracker (CRUD 7 Hari)
 */

// GANTI DENGAN URL WEB APP DEPLOYMENT APPS SCRIPT ANDA
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-2yGZeA8ACZ-8hdJ1y3Ys42nTuvW9CWaZz7gRyVP5eo6H82NxIAN9NdfnV_Cum8SZ_w/exec";

// Cache penyimpanan data kegiatan aktif
let allActivities = [];

document.addEventListener("DOMContentLoaded", () => {
  initTimeSelectors();
  
  // Set default tanggal form tambah ke hari ini
  document.getElementById("inputDate").value = formatDateToISO(new Date());

  fetchAiInsight();
  loadWeeklyActivities();
});

/**
 * Inisialisasi dropdown jam 24 jam (00:00 - 23:55)
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

  // Default jam saat ini
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
 * 1. READ: Ambil Riwayat 7 Hari Terakhir & Kelompokkan Per Hari
 */
async function loadWeeklyActivities() {
  const loading = document.getElementById("weeklyLoading");
  const container = document.getElementById("weeklyContainer");
  const rangeLabel = document.getElementById("weekDateRangeLabel");

  loading.classList.remove("hidden");
  container.classList.add("hidden");

  // Hitung rentang 7 hari terakhir: dari 6 hari lalu s/d hari ini
  const today = new Date();
  const past7Days = new Date();
  past7Days.setDate(today.getDate() - 6);

  const startDateStr = formatDateToISO(past7Days);
  const endDateStr = formatDateToISO(today);

  rangeLabel.innerText = `${formatDateShortIndo(startDateStr)} - ${formatDateShortIndo(endDateStr)}`;

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getWeeklyActivities&startDate=${startDateStr}&endDate=${endDateStr}`);
    const json = await res.json();

    loading.classList.add("hidden");

    if (json.status === "success") {
      allActivities = json.data || [];
      renderWeeklyGroupedList(startDateStr, endDateStr, allActivities);
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
 * Render Riwayat Terkelompok per Hari (Mundur dari Hari Ini)
 */
function renderWeeklyGroupedList(startDateStr, endDateStr, activities) {
  const container = document.getElementById("weeklyContainer");
  container.innerHTML = "";

  // Buat array tanggal 7 hari terakhir (Urutan terbalik: Hari ini paling atas)
  const daysList = [];
  let curr = new Date(endDateStr);
  const end = new Date(startDateStr);

  while (curr >= end) {
    daysList.push(formatDateToISO(curr));
    curr.setDate(curr.getDate() - 1);
  }

  daysList.forEach(dateStr => {
    // Filter aktivitas di hari tersebut dan urutkan jam mulai
    const dayActivities = activities
      .filter(a => a.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const isToday = dateStr === formatDateToISO(new Date());

    const dayCard = document.createElement("div");
    dayCard.className = `rounded-2xl border transition-all ${
      isToday 
        ? "border-blue-200 bg-blue-50/20 shadow-xs" 
        : "border-slate-200/80 bg-white"
    }`;

    // Header Hari
    let headerHtml = `
      <div class="p-3.5 px-4 flex items-center justify-between border-b ${isToday ? 'border-blue-100' : 'border-slate-100'}">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold ${isToday ? 'text-blue-700' : 'text-slate-800'}">
            ${formatDateFullIndo(dateStr)}
          </span>
          ${isToday ? '<span class="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">HARI INI</span>' : ''}
        </div>
        <span class="text-xs font-medium px-2 py-0.5 rounded-full ${
          dayActivities.length > 0 
            ? 'bg-slate-100 text-slate-600' 
            : 'bg-slate-50 text-slate-400'
        }">
          ${dayActivities.length} Kegiatan
        </span>
      </div>
    `;

    // Daftar Aktivitas di Hari Tersebut
    let bodyHtml = `<div class="p-3.5 space-y-2.5">`;

    if (dayActivities.length === 0) {
      bodyHtml += `
        <p class="text-xs text-slate-400 italic py-2 text-center">Tidak ada aktivitas yang dicatat di hari ini.</p>
      `;
    } else {
      dayActivities.forEach(item => {
        bodyHtml += `
          <div class="p-3 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-slate-50 transition flex items-start justify-between gap-3 group">
            <div class="space-y-1 w-full">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                  ⏰ ${item.startTime} - ${item.endTime}
                </span>
                <span class="text-xs font-medium text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                  ${escapeHtml(item.category)}
                </span>
              </div>
              <h4 class="text-sm font-semibold text-slate-900">${escapeHtml(item.activity)}</h4>
              ${item.notes && item.notes !== "-" ? `<p class="text-xs text-slate-500 italic bg-white/70 p-2 rounded border border-slate-100">${escapeHtml(item.notes)}</p>` : ""}
            </div>

            <!-- Tombol Aksi CRUD: Edit & Hapus -->
            <div class="flex items-center gap-1 shrink-0 pt-0.5">
              <button onclick="openEditModal('${item.id}')" title="Edit" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition cursor-pointer">
                ✏️
              </button>
              <button onclick="handleDeleteActivity('${item.id}')" title="Hapus" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer">
                🗑️
              </button>
            </div>
          </div>
        `;
      });
    }

    bodyHtml += `</div>`;
    dayCard.innerHTML = headerHtml + bodyHtml;
    container.appendChild(dayCard);
  });
}

/**
 * 2. CREATE: Simpan Aktivitas Baru
 */
async function handleFormSubmit(event) {
  event.preventDefault();
  const btn = document.getElementById("btnSubmitActivity");
  const alertBox = document.getElementById("formAlert");

  const startTime = `${document.getElementById("startHour").value}:${document.getElementById("startMinute").value}`;
  const endTime = `${document.getElementById("endHour").value}:${document.getElementById("endMinute").value}`;

  const payload = {
    date: document.getElementById("inputDate").value,
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
      alertBox.innerText = "Aktivitas berhasil ditambahkan! ✓";
      alertBox.className = "text-xs text-center p-2 rounded-lg font-medium bg-emerald-50 text-emerald-700 block border border-emerald-200";

      document.getElementById("inputActivity").value = "";
      document.getElementById("inputNotes").value = "";

      loadWeeklyActivities();
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
 * 3. UPDATE: Buka Modal & Simpan Perubahan
 */
function openEditModal(id) {
  const item = allActivities.find(a => String(a.id) === String(id));
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
      loadWeeklyActivities();
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
 * 4. DELETE: Hapus Aktivitas
 */
async function handleDeleteActivity(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus aktivitas ini dari Google Sheets?")) return;

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "deleteActivity", id: id })
    });
    const result = await res.json();

    if (result.status === "success") {
      loadWeeklyActivities();
    } else {
      alert("Gagal menghapus: " + result.message);
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

/**
 * Gemini AI Insight Fetcher
 */
async function fetchAiInsight() {
  const badge = document.getElementById("aiCategoryBadge");
  const insightText = document.getElementById("aiInsightText");
  const actionText = document.getElementById("aiActionText");
  const btnRefresh = document.getElementById("btnRefreshAi");

  badge.innerText = "Memuat...";
  insightText.innerText = "Gemini sedang merumuskan prinsip 1% hari ini...";
  btnRefresh.disabled = true;

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getAiInsight`);
    const result = await response.json();

    if (result.status === "success" && result.insight) {
      badge.innerText = result.insight.category;
      insightText.innerText = `"${result.insight.insight}"`;
      actionText.innerText = result.insight.action;
    }
  } catch (err) {
    badge.innerText = "Kebugaran & Recovery";
    insightText.innerText = '"Bukan seberapa keras Anda berlatih hari ini, melainkan seberapa konsisten Anda hadir setiap hari."';
    actionText.innerText = "Lakukan 10 kali squat atau peregangan 2 menit sekarang.";
  } finally {
    btnRefresh.disabled = false;
  }
}

// Helper: Format tanggal ISO YYYY-MM-DD
function formatDateToISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Helper: Format Lengkap (Contoh: Rabu, 23 Sep 2026)
function formatDateFullIndo(dateStr) {
  const [y, m, d] = dateStr.split("-");
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

// Helper: Format Singkat (Contoh: 17 Sep)
function formatDateShortIndo(dateStr) {
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
