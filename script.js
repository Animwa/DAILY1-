/**
 * FRONTEND CONTROLLER - 1% Daily & Activity Tracker
 * Format: 24 Jam (00:00 - 23:59)
 */

// GANTI DENGAN URL WEB APP DARI GOOGLE APPS SCRIPT ANDA
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzFxgAWFu9oRa7bGOT4O-OIbCthT-iW34ogCnSpG_1s5qRDK_cN43Kyl7G7iX7e9F1O/exec";

// Inisialisasi Tanggal Hari Ini (Format: YYYY-MM-DD)
const now = new Date();
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

document.addEventListener("DOMContentLoaded", () => {
  // Inisialisasi Dropdown Format 24 Jam
  init24HourSelectors();

  // Atur nilai default date input ke hari ini
  const filterDateInput = document.getElementById("filterDate");
  const inputDate = document.getElementById("inputDate");
  
  filterDateInput.value = todayStr;
  inputDate.value = todayStr;

  // Muat Wawasan AI & Riwayat kegiatan
  fetchAiInsight();
  loadActivities(todayStr);

  // Listener ganti tanggal di header
  filterDateInput.addEventListener("change", (e) => {
    const selectedDate = e.target.value;
    inputDate.value = selectedDate;
    loadActivities(selectedDate);
  });
});

/**
 * Mengisi dropdown pilihan jam (00 - 23) dan menit (00 - 55 kelipatan 5)
 */
function init24HourSelectors() {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  const startHourEl = document.getElementById("startHour");
  const endHourEl = document.getElementById("endHour");
  const startMinuteEl = document.getElementById("startMinute");
  const endMinuteEl = document.getElementById("endMinute");

  startHourEl.innerHTML = hours.map(h => `<option value="${h}">${h}</option>`).join("");
  endHourEl.innerHTML = hours.map(h => `<option value="${h}">${h}</option>`).join("");

  startMinuteEl.innerHTML = minutes.map(m => `<option value="${m}">${m}</option>`).join("");
  endMinuteEl.innerHTML = minutes.map(m => `<option value="${m}">${m}</option>`).join("");

  // Set nilai default jam ke jam saat ini
  const currentHour = String(now.getHours()).padStart(2, "0");
  const currentMinRounded = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0");
  
  startHourEl.value = currentHour;
  startMinuteEl.value = currentMinRounded;
  
  // Set jam selesai default 1 jam setelahnya
  const nextHour = String((now.getHours() + 1) % 24).padStart(2, "0");
  endHourEl.value = nextHour;
  endMinuteEl.value = currentMinRounded;
}

/**
 * Mengambil Wawasan Mikro 1% dari Apps Script (Gemini AI)
 */
async function fetchAiInsight() {
  const badge = document.getElementById("aiCategoryBadge");
  const insightText = document.getElementById("aiInsightText");
  const actionText = document.getElementById("aiActionText");
  const btnRefresh = document.getElementById("btnRefreshAi");

  badge.innerText = "Memuat...";
  insightText.innerText = "Gemini sedang merumuskan wawasan mikro 1% untuk hari ini...";
  actionText.innerText = "...";
  btnRefresh.disabled = true;

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getAiInsight`);
    const result = await response.json();

    if (result.status === "success" && result.insight) {
      badge.innerText = result.insight.category;
      insightText.innerText = `"${result.insight.insight}"`;
      actionText.innerText = result.insight.action;
    } else {
      throw new Error("Format respons tidak valid.");
    }
  } catch (err) {
    // Fallback jika API sedang limit atau ada kendala koneksi
    badge.innerText = "Kebugaran Fisik";
    insightText.innerText = '"Konsistensi 2 menit jauh lebih bermakna daripada 1 jam latihan yang ditunda."';
    actionText.innerText = "Lakukan 10 push-up atau peregangan leher dan punggung sekarang.";
  } finally {
    btnRefresh.disabled = false;
  }
}

/**
 * Mengambil Riwayat Kegiatan Berdasarkan Tanggal dari Google Sheets
 */
async function loadActivities(dateStr) {
  const container = document.getElementById("timelineContainer");
  const emptyState = document.getElementById("timelineEmpty");
  const loading = document.getElementById("timelineLoading");
  const label = document.getElementById("selectedDateLabel");

  label.innerText = formatDateIndo(dateStr);
  loading.classList.remove("hidden");
  container.classList.add("hidden");
  emptyState.classList.add("hidden");

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getActivities&date=${dateStr}`);
    const result = await response.json();

    loading.classList.add("hidden");

    if (result.status === "success" && result.data && result.data.length > 0) {
      container.innerHTML = "";
      
      result.data.forEach((item) => {
        const itemCard = document.createElement("div");
        itemCard.className = "p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 transition flex items-start justify-between gap-3";
        
        itemCard.innerHTML = `
          <div class="space-y-1.5 w-full">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                ⏰ ${item.startTime} - ${item.endTime}
              </span>
              <span class="text-xs font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                ${item.category}
              </span>
            </div>
            <h3 class="text-sm font-semibold text-slate-900">${escapeHtml(item.activity)}</h3>
            ${item.notes && item.notes !== "-" ? `<p class="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 italic">${escapeHtml(item.notes)}</p>` : ""}
          </div>
        `;
        container.appendChild(itemCard);
      });

      container.classList.remove("hidden");
    } else {
      emptyState.classList.remove("hidden");
    }
  } catch (err) {
    loading.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.innerHTML = `<p class="text-xs text-rose-500 font-medium">Gagal mengambil data kegiatan. Pastikan URL Apps Script sudah benar dan hak akses telah disetel ke 'Anyone'.</p>`;
  }
}

/**
 * Menyimpan Aktivitas Baru ke Google Sheets
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  const btn = document.getElementById("btnSubmitActivity");
  const alertBox = document.getElementById("formAlert");

  // Ambil nilai jam 24 jam dari dropdown
  const startTime = `${document.getElementById("startHour").value}:${document.getElementById("startMinute").value}`;
  const endTime = `${document.getElementById("endHour").value}:${document.getElementById("endMinute").value}`;

  const formData = {
    date: document.getElementById("inputDate").value,
    startTime: startTime,
    endTime: endTime,
    category: document.getElementById("inputCategory").value,
    activity: document.getElementById("inputActivity").value,
    notes: document.getElementById("inputNotes").value
  };

  btn.disabled = true;
  btn.innerText = "Menyimpan ke Sheets...";
  alertBox.className = "hidden text-xs text-center p-2.5 rounded-lg font-medium";

  try {
    // Menggunakan POST payload JSON string
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addActivity",
        data: formData
      })
    });

    const result = await response.json();

    if (result.status === "success") {
      alertBox.innerText = "Aktivitas berhasil disimpan! ✓";
      alertBox.className = "text-xs text-center p-2.5 rounded-lg font-medium bg-emerald-50 text-emerald-700 block border border-emerald-200";

      // Bersihkan teks form
      document.getElementById("inputActivity").value = "";
      document.getElementById("inputNotes").value = "";

      // Jika tanggal formulir sama dengan tanggal yang sedang dilihat, refresh riwayat
      const activeFilterDate = document.getElementById("filterDate").value;
      if (formData.date === activeFilterDate) {
        loadActivities(activeFilterDate);
      }
    } else {
      throw new Error(result.message || "Gagal menyimpan.");
    }
  } catch (err) {
    alertBox.innerText = "Error: " + err.message;
    alertBox.className = "text-xs text-center p-2.5 rounded-lg font-medium bg-rose-50 text-rose-700 block border border-rose-200";
  } finally {
    btn.disabled = false;
    btn.innerText = "Simpan ke Spreadsheet";
    setTimeout(() => {
      alertBox.classList.add("hidden");
    }, 4000);
  }
}

// Helper: Format Tanggal Bahasa Indonesia
function formatDateIndo(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

// Helper: Sanitasi karakter HTML
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
