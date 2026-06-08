/* ===========================================================
   CatNet — wspólna logika dla wszystkich podstron
   =========================================================== */

const API_KEY = "Live_p2Iw0CPRFAh8EIYZqvt3CMJMOqQQFjRdUND82x6c0kHVB5proE1aCebeSRcvJvrT";
let currentLimit = 2;
let timerInterval;

// Awaryjne koty (gdy TheCatAPI nie odpowiada)
const fallbackImages = [
    "https://cdn2.thecatapi.com/images/MTY3ODIyMQ.jpg",
    "https://cdn2.thecatapi.com/images/1g.jpg",
    "https://cdn2.thecatapi.com/images/3f1.jpg",
    "https://cdn2.thecatapi.com/images/a5j.jpg"
];

/* ---------- Ulubione koty (zapis w przeglądarce) ---------- */
function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem("catnet_favorites") || "[]");
    } catch {
        return [];
    }
}

function isFavorite(url) {
    return getFavorites().includes(url);
}

function toggleFavorite(url) {
    const favs = getFavorites();
    const idx = favs.indexOf(url);
    if (idx === -1) {
        favs.push(url);
    } else {
        favs.splice(idx, 1);
    }
    localStorage.setItem("catnet_favorites", JSON.stringify(favs));
    updateFavCounter();
    return idx === -1; // true jeśli właśnie dodano
}

function updateFavCounter() {
    const el = document.getElementById("fav-count");
    if (el) el.innerText = getFavorites().length;
}

/* ---------- Ładowanie kotów ---------- */
async function loadCats(gridId = "cat-grid", limit = currentLimit) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = "";

    try {
        const response = await fetch(
            `https://api.thecatapi.com/v1/images/search?limit=${limit}&api_key=${API_KEY}`
        );
        if (!response.ok) throw new Error("API Błąd");
        const data = await response.json();
        if (!data || data.length === 0) throw new Error("Pusta odpowiedź API");

        data.forEach((cat) => createCatElement(grid, cat.url));
    } catch (err) {
        console.warn("Zabezpieczenie aktywne: TheCatAPI nie odpowiada, ładuję rezerwę.", err);
        for (let i = 0; i < limit; i++) {
            createCatElement(grid, fallbackImages[i % fallbackImages.length]);
        }
    }
}

function createCatElement(grid, url) {
    const card = document.createElement("div");
    card.className = "cat-card";

    const img = document.createElement("img");
    img.src = url;
    img.alt = "Losowy kot z CatNet";
    img.loading = "lazy";

    const fav = document.createElement("button");
    fav.className = "fav-btn" + (isFavorite(url) ? " is-fav" : "");
    fav.type = "button";
    fav.title = "Dodaj do ulubionych";
    fav.innerHTML = isFavorite(url) ? "♥" : "♡";
    fav.addEventListener("click", () => {
        const added = toggleFavorite(url);
        fav.classList.toggle("is-fav", added);
        fav.innerHTML = added ? "♥" : "♡";
        // Odśwież sekcję ulubionych, jeśli jest na stronie
        if (document.getElementById("fav-grid")) renderFavorites("fav-grid");
    });

    card.appendChild(img);
    card.appendChild(fav);
    grid.appendChild(card);
}

function refreshCats(gridId = "cat-grid") {
    loadCats(gridId);
}

/* ---------- Galeria ulubionych ---------- */
function renderFavorites(gridId = "fav-grid") {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const favs = getFavorites();
    grid.innerHTML = "";

    if (favs.length === 0) {
        grid.innerHTML =
            '<p class="empty-hint">Nie masz jeszcze ulubionych kotów. Kliknij serduszko na zdjęciu, aby je tu zapisać. 🐾</p>';
        return;
    }
    favs.forEach((url) => createCatElement(grid, url));
}

/* ---------- Prawdziwy licznik (CounterAPI) ---------- */
async function loadCounter() {
    const counterElement = document.getElementById("real-viewers");
    if (!counterElement) return;
    try {
        const response = await fetch("https://api.counterapi.dev/v1/onlinekot2026/catnet_rgb/up");
        if (!response.ok) throw new Error("Counter API Błąd");
        const data = await response.json();
        localStorage.setItem("catnet_rgb_count", data.count);
        counterElement.innerText = data.count;
    } catch {
        counterElement.innerText = localStorage.getItem("catnet_rgb_count") || "1482";
    }
}

/* ---------- Logika VIP ---------- */
function requestVip() {
    const now = new Date().getTime();
    const savedTime = localStorage.getItem("catnet_rgb_unlock");

    if (!savedTime) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        localStorage.setItem("catnet_rgb_unlock", tomorrow.getTime());
        alert(
            "CatNet VIP jest całkowicie za darmo! Ze względu na ogromne zainteresowanie, darmowe wejściówki odnawiają się codziennie o północy. Poczekaj do jutra i odbierz swój dostęp!"
        );
        startCountdown(tomorrow.getTime());
    } else {
        const unlockTime = parseInt(savedTime);
        if (now >= unlockTime) {
            const key = prompt("Podaj klucz deszyfrujący VIP:");
            if (key) {
                sessionStorage.setItem("catnet_rgb_active", "true");
                activateVipMode();
            }
        }
    }
}

function checkVipStatus() {
    const savedTime = localStorage.getItem("catnet_rgb_unlock");
    if (!savedTime) return;
    const unlockTime = parseInt(savedTime);
    if (new Date().getTime() < unlockTime) {
        startCountdown(unlockTime);
    } else {
        const btn = document.getElementById("vip-btn");
        if (btn) btn.innerText = "WPROWADŹ KLUCZ VIP";
    }
}

function startCountdown(unlockTime) {
    const btn = document.getElementById("vip-btn");
    const timerBox = document.getElementById("timer-container");
    const countdownDisplay = document.getElementById("countdown");
    const badge = document.getElementById("vip-badge");
    if (!btn || !timerBox || !countdownDisplay) return;

    btn.disabled = true;
    btn.innerText = "WERYFIKACJA W TOKU...";
    if (badge) badge.style.display = "none";
    timerBox.style.display = "block";

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const diff = unlockTime - new Date().getTime();
        if (diff <= 0) {
            clearInterval(timerInterval);
            btn.disabled = false;
            btn.innerText = "WPROWADŹ KLUCZ VIP";
            if (badge) badge.style.display = "flex";
            timerBox.style.display = "none";
        } else {
            let h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            let s = Math.floor((diff % (1000 * 60)) / 1000);
            h = h < 10 ? "0" + h : h;
            m = m < 10 ? "0" + m : m;
            s = s < 10 ? "0" + s : s;
            countdownDisplay.innerText = `${h}:${m}:${s}`;
        }
    }, 1000);
}

function activateVipMode() {
    document.body.classList.add("vip-mode");
    const box = document.getElementById("vip-box");
    if (box) box.style.display = "none";
    currentLimit = 3;
    loadCats("cat-grid", currentLimit);
}

/* ---------- Ukryty panel admina ---------- */
let tClicks = 0;
function triggerAdmin() {
    tClicks++;
    if (tClicks === 17) {
        const panel = document.getElementById("adm-panel");
        if (panel) panel.style.display = "block";
        tClicks = 0;
    }
}
function saveAdmin() {
    currentLimit = document.getElementById("adm-limit").value;
    refreshCats();
    document.getElementById("adm-panel").style.display = "none";
}
function forceVip() {
    sessionStorage.setItem("catnet_rgb_active", "true");
    activateVipMode();
    document.getElementById("adm-panel").style.display = "none";
}

/* ---------- Ciekawostki o kotach ---------- */
const catFacts = [
    "Kot potrafi wydawać ponad 100 różnych dźwięków, a pies tylko około 10.",
    "Koty przesypiają nawet 70% swojego życia.",
    "Mruczenie kota ma częstotliwość, która wspomaga gojenie się kości.",
    "Każdy nosek kota ma unikalny wzór — jak ludzki odcisk palca.",
    "Koty nie czują smaku słodkiego.",
    "Grupa kotów to po angielsku „a clowder”.",
    "Kot potrafi biec z prędkością nawet 48 km/h.",
    "Koty ocierają się o ludzi, by zostawić swój zapach — to znak akceptacji."
];

function showRandomFact() {
    const el = document.getElementById("cat-fact");
    if (!el) return;
    el.innerText = catFacts[Math.floor(Math.random() * catFacts.length)];
}
