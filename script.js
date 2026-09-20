(() => {
  "use strict";

  const CONFIG_KEY = "gaokao-countdown-config";
  const DEFAULT_CONFIG = {
    title: "2027 高考倒计时",
    target: "2027-06-07 00:00:00"
  };

  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  const els = {
    title: document.getElementById("appTitle"),
    days: document.getElementById("daysValue"),
    hours: document.getElementById("hoursValue"),
    minutes: document.getElementById("minutesValue"),
    seconds: document.getElementById("secondsValue"),
    targetText: document.getElementById("targetText"),
    countdownMark: document.getElementById("countdownMark"),
    nowText: document.getElementById("nowText"),
    settingsButton: document.getElementById("settingsButton"),
    settingsModal: document.getElementById("settingsModal"),
    settingsForm: document.getElementById("settingsForm"),
    yearSelect: document.getElementById("yearSelect"),
    dateInput: document.getElementById("dateInput"),
    timeInput: document.getElementById("timeInput"),
    cancelButton: document.getElementById("cancelButton")
  };

  let config = { ...DEFAULT_CONFIG };
  let targetDate = new Date();
  let timerId = null;

  function readStorage() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY)) || null;
    } catch (_) {
      return null;
    }
  }

  function writeStorage(value) {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(value));
    } catch (_) {
      // Some browsers restrict local storage for file:// pages; the page still works.
    }
  }

  async function loadConfig() {
    let fileConfig = null;
    try {
      const response = await fetch("config.json", { cache: "no-store" });
      if (response.ok) {
        fileConfig = await response.json();
      }
    } catch (_) {
      fileConfig = null;
    }
    let stored = readStorage();
    if (stored && stored.target === "2027-06-07T09:00:00") {
      try {
        localStorage.removeItem(CONFIG_KEY);
      } catch (_) {
        // Ignore storage access errors on file:// pages.
      }
      stored = null;
    }
    return { ...DEFAULT_CONFIG, ...(fileConfig || {}), ...(stored || {}) };
  }

  function parseTarget(value) {
    const normalized = String(value || "").trim().replace(" ", "T");
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function applyConfig() {
    document.title = config.title;
    els.title.textContent = config.title;
    const date = parseTarget(config.target);
    if (date) {
      targetDate = date;
    }
  }

  function formatTarget(date) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${hh}:${mm}`;
  }

  function formatNow(date) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]} ${hh}:${mm}:${ss}`;
  }

  function calendarDayDiff(target, now) {
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((targetDay.getTime() - nowDay.getTime()) / 86400000);
  }

  function render(now) {
    const diff = Math.max(0, targetDate.getTime() - now.getTime());
    let days;
    let hours;
    let minutes;
    let seconds;
    if (diff > 0) {
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
      const cycleSeconds = Math.floor((endOfToday.getTime() - now.getTime()) / 1000);
      days = Math.max(0, calendarDayDiff(targetDate, now));
      hours = Math.floor(cycleSeconds / 3600);
      minutes = Math.floor((cycleSeconds % 3600) / 60);
      seconds = cycleSeconds % 60;
    } else {
      days = 0;
      hours = 0;
      minutes = 0;
      seconds = 0;
    }

    els.days.textContent = String(days);
    els.hours.textContent = String(hours).padStart(2, "0");
    els.minutes.textContent = String(minutes).padStart(2, "0");
    els.seconds.textContent = String(seconds).padStart(2, "0");
    els.targetText.textContent = formatTarget(targetDate);
    els.countdownMark.textContent = diff > 0 ? "倒计时中" : "已开考";
    els.nowText.textContent = `今天 ${formatNow(now)}`;
  }

  function tick() {
    const now = new Date();
    render(now);
    const nextBoundary = 1000 - now.getMilliseconds() + 25;
    timerId = setTimeout(tick, nextBoundary);
  }

  function ensureYearOption(year) {
    if (![...els.yearSelect.options].some((option) => option.value === String(year))) {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      els.yearSelect.appendChild(option);
    }
  }

  function openSettings() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year <= currentYear + 3; year += 1) {
      years.push(year);
    }
    years.forEach((year) => ensureYearOption(year));
    ensureYearOption(targetDate.getFullYear());
    els.yearSelect.value = String(targetDate.getFullYear());
    els.dateInput.value = [
      targetDate.getFullYear(),
      String(targetDate.getMonth() + 1).padStart(2, "0"),
      String(targetDate.getDate()).padStart(2, "0")
    ].join("-");
    els.timeInput.value = `${String(targetDate.getHours()).padStart(2, "0")}:${String(targetDate.getMinutes()).padStart(2, "0")}`;
    els.settingsModal.hidden = false;
  }

  function closeSettings() {
    els.settingsModal.hidden = true;
  }

  function saveSettings(event) {
    event.preventDefault();
    const dateValue = els.dateInput.value || "2027-06-07";
    const rawTime = els.timeInput.value || "00:00";
    const timeValue = rawTime.split(":").length === 3 ? rawTime : `${rawTime}:00`;
    const target = `${dateValue}T${timeValue}`;
    const parsed = parseTarget(target);
    if (!parsed) {
      return;
    }
    const nextConfig = {
      title: `${parsed.getFullYear()} 高考倒计时`,
      target
    };
    config = nextConfig;
    writeStorage(nextConfig);
    applyConfig();
    render(new Date());
    closeSettings();
  }

  els.settingsButton.addEventListener("click", openSettings);
  els.yearSelect.addEventListener("change", () => {
    const year = els.yearSelect.value;
    if (year) {
      els.dateInput.value = `${year}-06-07`;
    }
  });
  els.cancelButton.addEventListener("click", closeSettings);
  els.settingsModal.addEventListener("click", (event) => {
    if (event.target === els.settingsModal) {
      closeSettings();
    }
  });
  els.settingsForm.addEventListener("submit", saveSettings);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.settingsModal.hidden) {
      closeSettings();
    }
  });

  const onVisible = () => {
    if (document.visibilityState === "visible") {
      render(new Date());
    }
  };
  document.addEventListener("visibilitychange", onVisible);

  loadConfig().then((loaded) => {
    config = loaded;
    applyConfig();
    render(new Date());
    tick();
  });
})();
