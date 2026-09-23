/**
 * FRONTEND CONTROLLER - 1% Daily & Activity Tracker
 */

// 1. Masukkan URL hasil deployment Apps Script Anda di sini
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzFxgAWFu9oRa7bGOT4O-OIbCthT-iW34ogCnSpG_1s5qRDK_cN43Kyl7G7iX7e9F1O/exec";


// Inisialisasi Tanggal Hari Ini (Format: YYYY-MM-DD)
const todayStr = new Date().toISOString().split("T")[0];

document.addEventListener("DOMContentLoaded", () => {
  // Atur nilai default date input
  const filterDateInput = document.getElementById("filterDate");
  const inputDate = document.getElementById("inputDate");
  
  filterDateInput.value = todayStr;
  inputDate.value = todayStr;

  // Muat Wawasan AI & Riwayat kegiatan hari ini
  fetchAiInsight();
  loadActivities(todayStr);

  // Pasang listener saat tanggal di header diubah
  filterDateInput.addEventListener("change", (e) => {
    const selectedDate = e.target.value;
    inputDate.value = selectedDate;
    loadActivities(selectedDate);
  });
});

/**
 * Mengambil Wawasan Mikro 1% dari Backend Apps Script (Gemini AI)
 */
async function fetchAiInsight() {
  const badge = document.getElementById("aiCategoryBadge");
  const insightText = document.getElementById("aiInsightText");
  const actionText = document.getElementById("aiActionText");
  const btnRefresh = document.getElementById("btnRefreshAi");

  badge.innerText = "Memuat...";
  insightText.innerText = "Gemini sedang merumuskan prinsip 1% untuk hari ini...";
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
      throw new Error("Gagal mengurai respons AI.");
    }
  } catch (err) {
    // Fallback lokal jika ada kendala koneksi
    badge.innerText = "Kebugaran & Recovery";
    insightText.innerText = '"Bukan seberapa keras Anda berlatih hari ini, melainkan seberapa konsisten Anda hadir setiap hari."';
    actionText.innerText = "Lakukan 10 kali squat atau jalan santai 3 menit.";
  } finally {
    btnRefresh.disabled = false;
  }
}

/**
 * Mengambil Daftar Aktivitas dari Google Sheets Berdasarkan Tanggal
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
        itemCard.className = "p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 transition flex items-start justify-between gap-3";
        
        itemCard.innerHTML = `
          <div class="space-y-1.5 w-full">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                ⏰ ${item.startTime} - ${item.endTime}
              </span>
              <span class="text-xs font-medium text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                ${item.category}
              </span>
            </div>
            <h3 class="text-sm font-semibold text-slate-900">${escapeHtml(item.activity)}</h3>
            ${item.notes && item.notes !== "-" ? `<p class="text-xs text-slate-500 italic bg-white/60 p-2 rounded border border-slate-100">${escapeHtml(item.notes)}</p>` : ""}
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
    emptyState.innerHTML = `<p class="text-xs text-rose-500 font-medium">Gagal memuat aktivitas. Pastikan URL Apps Script sudah di-deploy dengan akses 'Anyone'.</p>`;
  }
}

/**
 * Menyimpan Aktivitas Baru ke Google Sheets
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  const btn = document.getElementById("btnSubmitActivity");
  const alertBox = document.getElementById("formAlert");

  const formData = {
    date: document.getElementById("inputDate").value,
    startTime: document.getElementById("inputStartTime").value,
    endTime: document.getElementById("inputEndTime").value,
    category: document.getElementById("inputCategory").value,
    activity: document.getElementById("inputActivity").value,
    notes: document.getElementById("inputNotes").value
  };

  btn.disabled = true;
  btn.innerText = "Menyimpan ke Sheets...";
  alertBox.className = "hidden text-xs text-center p-2 rounded-lg font-medium";

  try {
    // Menggunakan text/plain POST payload untuk menghindari pre-flight CORS block di Apps Script
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addActivity",
        data: formData
      })
    });

    const result = await response.json();

    if (result.status === "success") {
      alertBox.innerText = "Aktivitas berhasil dicatat! ✓";
      alertBox.className = "text-xs text-center p-2 rounded-lg font-medium bg-emerald-50 text-emerald-700 block border border-emerald-200";

      // Reset form isian nama dan catatan
      document.getElementById("inputActivity").value = "";
      document.getElementById("inputNotes").value = "";

      // Jika tanggal formulir sama dengan tanggal yang sedang dilihat, refresh timeline
      const activeFilterDate = document.getElementById("filterDate").value;
      if (formData.date === activeFilterDate) {
        loadActivities(activeFilterDate);
      }
    } else {
      throw new Error(result.message || "Terjadi kesalahan.");
    }
  } catch (err) {
    alertBox.innerText = "Gagal menyimpan: " + err.message;
    alertBox.className = "text-xs text-center p-2 rounded-lg font-medium bg-rose-50 text-rose-700 block border border-rose-200";
  } finally {
    btn.disabled = false;
    btn.innerText = "Simpan ke Spreadsheet";
    setTimeout(() => {
      alertBox.classList.add("hidden");
    }, 4000);
  }
}

// Format tanggal ke Bahasa Indonesia (Contoh: 23 September 2026)
function formatDateIndo(dateString) {
  if (!dateString) return "";
  const parts = dateString.split("-");
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

// Sanitasi teks untuk mencegah XSS
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
