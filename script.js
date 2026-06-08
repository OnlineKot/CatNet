/* ===========================================================
   CatNet — wspólna logika dla wszystkich podstron
   =========================================================== */

const API_KEY = "Live_p2Iw0CPRFAh8EIYZqvt3CMJMOqQQFjRdUND82x6c0kHVB5proE1aCebeSRcvJvrT";
let currentLimit = 2;
let currentBreed = "";       // filtr rasy (puste = wszystkie)
let forceFallback = false;   // tryb awaryjny wymuszony przez admina
let autoRefreshTimer = null;  // pokaz slajdów / auto-odświeżanie
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
        if (forceFallback) throw new Error("Wymuszony tryb awaryjny");
        const breedParam = currentBreed ? `&breed_ids=${currentBreed}` : "";
        const response = await fetch(
            `https://api.thecatapi.com/v1/images/search?limit=${limit}${breedParam}&api_key=${API_KEY}`
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
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => openLightbox(url));

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
        if (panel) {
            panel.style.display = "block";
            admStats();
        }
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
    "Koty przesypiają od 12 do 16 godzin na dobę.",
    "Kot potrafi wydać ponad 100 różnych dźwięków, a pies tylko około 10.",
    "Każdy nosek kota ma niepowtarzalny wzór — jak ludzki odcisk palca.",
    "Koty w ogóle nie czują smaku słodkiego.",
    "Mruczenie kota mieści się w częstotliwości sprzyjającej regeneracji kości.",
    "Kot potrafi biec z prędkością nawet 48 km/h.",
    "Grupa kotów to po angielsku „a clowder”.",
    "Kot ma pięć palców na każdej przedniej łapie, a tylko cztery na tylnych.",
    "W każdym uchu kota pracują 32 mięśnie.",
    "Koty potrafią obracać uszy o niemal 180 stopni.",
    "Kot widzi w półmroku kilka razy lepiej niż człowiek.",
    "Wąsy kota wyczuwają najmniejszy ruch powietrza.",
    "Kot ma trzecią powiekę, zwaną migotką.",
    "Serce kota bije około 140–220 razy na minutę.",
    "Koty pocą się wyłącznie przez opuszki łap.",
    "Kot potrafi skoczyć na wysokość kilkukrotności swojej długości.",
    "Koty spędzają nawet połowę dnia na pielęgnacji futra.",
    "Język kota pokryty jest maleńkimi haczykami z keratyny.",
    "Kot machający ogonem na boki często jest poirytowany.",
    "Powolne mruganie kota to koci „pocałunek” i znak zaufania.",
    "Koty ocierają się o ludzi, by zostawić swój zapach.",
    "Najstarszy znany kot dożył 38 lat.",
    "Kot potrafi rozpoznać głos opiekuna, ale często go ignoruje.",
    "Dorosły kot ma 30 zębów, a kocię tylko 26.",
    "Koty nie mają obojczyka, dlatego mieszczą się w wąskich szczelinach.",
    "Jeśli głowa kota się zmieści, zmieści się i reszta ciała.",
    "Koty miauczą głównie do ludzi, rzadko do innych kotów.",
    "Koty mają zwykle po 12 wąsów z każdej strony pyszczka.",
    "Kot pije, zaginając czubek języka do tyłu w kształt litery J.",
    "Kot rozpoznaje świat głównie węchem — ma miliony receptorów zapachu.",
    "Kot przewraca się na grzbiet, gdy w pełni Ci ufa.",
    "Koty domowe i tygrysy dzielą ponad 95% DNA.",
    "Kocięta rodzą się ślepe i głuche.",
    "Koty zaczynają mruczeć już w pierwszych dniach życia.",
    "Najcięższy zarejestrowany kot ważył ponad 20 kg.",
    "Koty potrafią śnić — poruszają wąsami i łapkami przez sen.",
    "Kot ląduje na łapach dzięki tzw. odruchowi prostowania.",
    "Wiele kotów nie znosi zapachu cytrusów.",
    "W starożytnym Egipcie koty czczono jako święte zwierzęta.",
    "Koty potrafią wyczuć zbliżającą się burzę.",
    "Kot porusza się, stawiając najpierw obie prawe, potem obie lewe łapy.",
    "Kocie pazury są zakrzywione, dlatego łatwiej wspinają się w górę niż schodzą.",
    "Koty drapią przedmioty, by ostrzyć pazury i zaznaczyć teren.",
    "Wąsy kota mają mniej więcej szerokość jego ciała.",
    "Koty lepiej widzą odcienie niebieskiego i zielonego niż czerwień.",
    "Większość kotów nie lubi moczyć futra — ale są wyjątki.",
    "Rasa Turecki Van słynie z zamiłowania do pływania.",
    "Koty potrafią ćwierkać na widok ptaków za oknem.",
    "Oczy kota świecą w ciemności dzięki warstwie odbijającej światło.",
    "Koty są najbardziej aktywne o świcie i o zmierzchu.",
    "Mruczenie kota potrafi obniżyć ciśnienie krwi opiekuna.",
    "Niektóre koty są „praworęczne”, inne „leworęczne”.",
    "Kot potrafi przebiec krótki dystans szybciej niż najszybszy człowiek.",
    "Kot potrafi wskoczyć i wylądować niemal bezgłośnie.",
    "Koty mają wąsy także z tyłu przednich łap.",
    "Wyprostowany ogon z zagiętym czubkiem to przyjazne powitanie.",
    "Kot, który „udeptuje” Cię łapkami, czuje się przy Tobie bezpiecznie.",
    "Koty potrafią nauczyć się otwierać drzwi i szuflady.",
    "Kocięta z jednego miotu mogą mieć różnych ojców.",
    "Kot widzi pod szerszym kątem niż człowiek.",
    "Koty słabo widzą tuż przed własnym noskiem.",
    "Słuch kota sięga znacznie wyżej niż ludzki — łapie ultradźwięki.",
    "Dlatego kot słyszy mysz, której my w ogóle nie usłyszymy.",
    "Kot potrafi rozpoznać swoje imię, choć nie zawsze reaguje.",
    "Koty śpią więcej, gdy jest zimno lub pochmurno.",
    "Wiele kotów jest nietolerancyjnych na laktozę, mimo miłości do mleka.",
    "Koty to mięsożercy — najlepszą przekąską jest dla nich mięso.",
    "Kot potrzebuje tauryny, którą musi dostać z pożywienia.",
    "Wibrysy pomagają kotu „widzieć” w ciemności dotykiem.",
    "Kot często wraca w to samo miejsce, które uznał za bezpieczne.",
    "Kocie mruczenie bywa wykorzystywane w terapii relaksacyjnej.",
    "Każdy kot ma swój własny, niepowtarzalny zapach.",
    "Koty uwielbiają ciepłe, podwyższone miejsca z dobrym widokiem.",
    "Pudełko to dla kota najlepsza kryjówka i poczucie bezpieczeństwa.",
    "Koty czują się komfortowo w niewielkich, zamkniętych przestrzeniach.",
    "Niektóre koty aportują zabawki jak pieski.",
    "Kocie zabawy to trening instynktu łowieckiego.",
    "Kot poluje „na niby” nawet wtedy, gdy jest najedzony.",
    "Koty potrafią rozpoznawać emocje opiekuna po tonie głosu.",
    "Kot porusza ogonem, uszami i całym ciałem, by się komunikować.",
    "Kotka częściej używa prawej łapy, a kocur lewej.",
    "Kot ma znakomity zmysł równowagi dzięki uchu wewnętrznemu.",
    "Koty potrafią przeżyć upadek dzięki rozkładaniu ciała jak spadochron.",
    "Kot potrafi przespać większość dnia, a starszy jeszcze więcej.",
    "Kot zmienia nastrój w sekundę — od pieszczot do dzikiej zabawy.",
    "Koci ogon pomaga utrzymać równowagę podczas skoków.",
    "Koty rozpoznają znajome osoby także po sposobie chodzenia.",
    "Kot potrafi zapamiętać, gdzie schowano jego ulubioną zabawkę.",
    "Mruczenie to także sposób kota na ukojenie własnego stresu.",
    "Koty witają się, dotykając się noskami.",
    "Kot wystawiający brzuch okazuje Ci ogromne zaufanie.",
    "Wzór futra każdego kota jest niepowtarzalny.",
    "Koty potrafią naśladować ton ludzkiego głosu, by zwrócić uwagę.",
    "Kot bywa zaskakująco zwinny nawet w ciasnych zakamarkach.",
    "Koty często wybierają najcieplejsze miejsce w całym domu.",
    "Kot, który mruży do Ciebie oczy, mówi „lubię Cię”.",
    "Koty potrafią nauczyć się prostych sztuczek za pomocą nagród.",
    "Przyjaźń z kotem buduje się powoli, ale jest wyjątkowo trwała.",
    "Kot potrafi rozpoznać, kiedy jesteś smutny, i przychodzi się przytulić.",
    "A ten kot, którego właśnie oglądasz, jest po prostu najsłodszym kotem na świecie. 🐱💖"
];

/* Własne fakty dodane przez admina */
function getCustomFacts() {
    try {
        return JSON.parse(localStorage.getItem("catnet_custom_facts") || "[]");
    } catch {
        return [];
    }
}
function getAllFacts() {
    return catFacts.concat(getCustomFacts());
}

/* „Dozowanie” — worek losujący bez powtórek aż do wyczerpania puli */
let factBag = [];
function nextFact() {
    if (factBag.length === 0) {
        factBag = getAllFacts().slice();
        for (let i = factBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [factBag[i], factBag[j]] = [factBag[j], factBag[i]];
        }
    }
    return factBag.pop();
}

function showRandomFact(elId = "cat-fact") {
    const el = document.getElementById(elId);
    if (!el) return;
    el.style.opacity = "0";
    setTimeout(() => {
        el.innerText = nextFact();
        el.style.transition = "opacity 0.3s ease";
        el.style.opacity = "1";
    }, 120);
}

/* Najsłodszy kot na świecie (sekcja na stronie Fakty) */
async function loadSweetCat() {
    const grid = document.getElementById("sweet-grid");
    if (!grid) return;
    let url;
    try {
        const res = await fetch(`https://api.thecatapi.com/v1/images/search?limit=1&api_key=${API_KEY}`);
        const data = await res.json();
        url = data[0].url;
    } catch {
        url = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    }
    grid.innerHTML = "";
    createCatElement(grid, url);
}

/* ===========================================================
   USTAWIENIA UŻYTKOWNIKA (motywy, tryb, gęstość, liczba kotów)
   =========================================================== */

const ACCENTS = {
    aurora: { a: "#7c5cff", b: "#ff5ca8", grad: "linear-gradient(120deg,#7c5cff 0%,#5cc8ff 50%,#ff5ca8 100%)" },
    ocean:  { a: "#2bb7ff", b: "#5cf0d0", grad: "linear-gradient(120deg,#2bb7ff,#5cf0d0)" },
    sunset: { a: "#ff8a3c", b: "#ff4d6d", grad: "linear-gradient(120deg,#ff8a3c,#ff4d6d)" },
    forest: { a: "#27c46b", b: "#8ef0a0", grad: "linear-gradient(120deg,#27c46b,#8ef0a0)" },
    candy:  { a: "#ff5ca8", b: "#ffd34d", grad: "linear-gradient(120deg,#ff5ca8,#ffd34d)" },
    mono:   { a: "#9aa0c0", b: "#cfd4ec", grad: "linear-gradient(120deg,#9aa0c0,#cfd4ec)" }
};

const SETTINGS_KEY = "catnet_settings";
const defaultSettings = {
    accent: "aurora",
    mode: "dark",
    density: "comfortable",
    perPage: 8,
    autoRefresh: false
};

function getSettings() {
    try {
        return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    } catch {
        return { ...defaultSettings };
    }
}

function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function setSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    saveSettings(s);
    applySettings();
}

function applySettings() {
    const s = getSettings();
    const ac = ACCENTS[s.accent] || ACCENTS.aurora;
    const root = document.documentElement.style;
    root.setProperty("--accent", ac.a);
    root.setProperty("--accent-2", ac.b);
    root.setProperty("--accent-grad", ac.grad);
    document.body.classList.toggle("light", s.mode === "light");
    document.body.classList.toggle("dense", s.density === "dense");
    syncSettingsUI();
}

/* ---------- Budowa szuflady ustawień ---------- */
function buildSettingsDrawer() {
    if (document.getElementById("settings-drawer")) return;

    const overlay = document.createElement("div");
    overlay.className = "drawer-overlay";
    overlay.id = "settings-overlay";
    overlay.addEventListener("click", closeSettings);

    const swatches = Object.keys(ACCENTS)
        .map(
            (key) =>
                `<button class="swatch" data-accent="${key}" title="${key}"
                    style="background:${ACCENTS[key].grad}"></button>`
        )
        .join("");

    const drawer = document.createElement("aside");
    drawer.className = "drawer";
    drawer.id = "settings-drawer";
    drawer.innerHTML = `
        <div class="drawer-head">
            <h3>⚙️ Ustawienia</h3>
            <button class="icon-btn" onclick="closeSettings()">✕</button>
        </div>

        <div class="setting-group">
            <label>Kolor motywu</label>
            <div class="swatches" id="accent-swatches">${swatches}</div>
        </div>

        <div class="setting-group">
            <label>Tryb</label>
            <div class="seg" id="mode-seg">
                <button data-mode="dark">🌙 Ciemny</button>
                <button data-mode="light">☀️ Jasny</button>
            </div>
        </div>

        <div class="setting-group">
            <label>Gęstość siatki</label>
            <div class="seg" id="density-seg">
                <button data-density="comfortable">Komfortowa</button>
                <button data-density="dense">Gęsta</button>
            </div>
        </div>

        <div class="setting-group">
            <label>Kotów na stronę (galeria)</label>
            <div class="range-row">
                <input type="range" id="perpage-range" min="4" max="20" step="1">
                <span class="val" id="perpage-val">8</span>
            </div>
        </div>

        <div class="setting-group">
            <div class="switch-row">
                <span>🎞️ Pokaz slajdów (auto)</span>
                <label class="switch">
                    <input type="checkbox" id="autorefresh-toggle">
                    <span class="slider"></span>
                </label>
            </div>
        </div>

        <div class="setting-group">
            <label>Szybkie akcje</label>
            <button class="btn btn-ghost btn-block" onclick="surpriseCat()">🎁 Niespodzianka — losowy kot</button>
            <button class="btn btn-ghost btn-block" onclick="clearFavorites()">🗑️ Wyczyść ulubione</button>
            <button class="btn btn-ghost btn-block" onclick="resetSettings()">↺ Przywróć domyślne</button>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    // Zdarzenia
    drawer.querySelectorAll("[data-accent]").forEach((b) =>
        b.addEventListener("click", () => setSetting("accent", b.dataset.accent))
    );
    drawer.querySelectorAll("[data-mode]").forEach((b) =>
        b.addEventListener("click", () => setSetting("mode", b.dataset.mode))
    );
    drawer.querySelectorAll("[data-density]").forEach((b) =>
        b.addEventListener("click", () => setSetting("density", b.dataset.density))
    );
    const range = drawer.querySelector("#perpage-range");
    range.addEventListener("input", () => {
        document.getElementById("perpage-val").innerText = range.value;
    });
    range.addEventListener("change", () => {
        setSetting("perPage", parseInt(range.value));
        if (document.getElementById("cat-grid")) {
            currentLimit = parseInt(range.value);
            loadCats("cat-grid", currentLimit);
        }
    });
    drawer.querySelector("#autorefresh-toggle").addEventListener("change", (e) => {
        setSetting("autoRefresh", e.target.checked);
        e.target.checked ? startAutoRefresh() : stopAutoRefresh();
    });
}

function syncSettingsUI() {
    const s = getSettings();
    document.querySelectorAll("#accent-swatches .swatch").forEach((b) =>
        b.classList.toggle("active", b.dataset.accent === s.accent)
    );
    document.querySelectorAll("#mode-seg button").forEach((b) =>
        b.classList.toggle("active", b.dataset.mode === s.mode)
    );
    document.querySelectorAll("#density-seg button").forEach((b) =>
        b.classList.toggle("active", b.dataset.density === s.density)
    );
    const range = document.getElementById("perpage-range");
    if (range) {
        range.value = s.perPage;
        document.getElementById("perpage-val").innerText = s.perPage;
    }
    const auto = document.getElementById("autorefresh-toggle");
    if (auto) auto.checked = s.autoRefresh;
}

function openSettings() {
    document.getElementById("settings-overlay")?.classList.add("open");
    document.getElementById("settings-drawer")?.classList.add("open");
}
function closeSettings() {
    document.getElementById("settings-overlay")?.classList.remove("open");
    document.getElementById("settings-drawer")?.classList.remove("open");
}

function resetSettings() {
    saveSettings({ ...defaultSettings });
    applySettings();
    showToast("Przywrócono ustawienia domyślne");
}

function clearFavorites() {
    if (getFavorites().length === 0) {
        showToast("Brak ulubionych do usunięcia");
        return;
    }
    if (!confirm("Na pewno usunąć wszystkie ulubione koty?")) return;
    localStorage.removeItem("catnet_favorites");
    updateFavCounter();
    renderFavorites("fav-grid");
    document.querySelectorAll(".fav-btn.is-fav").forEach((b) => {
        b.classList.remove("is-fav");
        b.innerHTML = "♡";
    });
    showToast("Usunięto ulubione koty");
}

/* ===========================================================
   POKAZ SLAJDÓW / AUTO-ODŚWIEŻANIE
   =========================================================== */
function startAutoRefresh() {
    stopAutoRefresh();
    if (!document.getElementById("cat-grid")) return;
    autoRefreshTimer = setInterval(() => loadCats("cat-grid", currentLimit), 5000);
}
function stopAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
}

/* ===========================================================
   LIGHTBOX (podgląd, pobieranie, udostępnianie)
   =========================================================== */
let lightboxUrl = "";

function buildLightbox() {
    if (document.getElementById("lightbox")) return;
    const box = document.createElement("div");
    box.className = "lightbox";
    box.id = "lightbox";
    box.innerHTML = `
        <button class="icon-btn lightbox-close" onclick="closeLightbox()">✕</button>
        <img id="lightbox-img" src="" alt="Kot w powiększeniu">
        <div class="lightbox-actions">
            <button class="btn btn-primary" id="lightbox-fav" onclick="lightboxToggleFav()">♡ Ulubione</button>
            <button class="btn btn-ghost" onclick="downloadImage(lightboxUrl)">⬇️ Pobierz</button>
            <button class="btn btn-ghost" onclick="shareImage(lightboxUrl)">🔗 Udostępnij</button>
        </div>
    `;
    box.addEventListener("click", (e) => {
        if (e.target === box) closeLightbox();
    });
    document.body.appendChild(box);
}

function openLightbox(url) {
    lightboxUrl = url;
    const box = document.getElementById("lightbox");
    if (!box) return;
    document.getElementById("lightbox-img").src = url;
    updateLightboxFav();
    box.classList.add("open");
}
function closeLightbox() {
    document.getElementById("lightbox")?.classList.remove("open");
}
function updateLightboxFav() {
    const btn = document.getElementById("lightbox-fav");
    if (!btn) return;
    const fav = isFavorite(lightboxUrl);
    btn.innerHTML = fav ? "♥ W ulubionych" : "♡ Ulubione";
}
function lightboxToggleFav() {
    toggleFavorite(lightboxUrl);
    updateLightboxFav();
    if (document.getElementById("fav-grid")) renderFavorites("fav-grid");
    // odśwież serduszka na widocznych kartach
    document.querySelectorAll(".cat-card img").forEach((img) => {
        if (img.src === lightboxUrl) {
            const b = img.parentElement.querySelector(".fav-btn");
            const fav = isFavorite(lightboxUrl);
            b.classList.toggle("is-fav", fav);
            b.innerHTML = fav ? "♥" : "♡";
        }
    });
}

async function downloadImage(url) {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "catnet-kot.jpg";
        a.click();
        URL.revokeObjectURL(a.href);
        showToast("Pobrano zdjęcie 🐾");
    } catch {
        window.open(url, "_blank");
    }
}

async function shareImage(url) {
    if (navigator.share) {
        try {
            await navigator.share({ title: "CatNet", text: "Zobacz tego kota!", url });
            return;
        } catch { /* anulowano */ }
    }
    try {
        await navigator.clipboard.writeText(url);
        showToast("Skopiowano link do zdjęcia 🔗");
    } catch {
        window.open(url, "_blank");
    }
}

async function surpriseCat() {
    closeSettings();
    try {
        const res = await fetch(`https://api.thecatapi.com/v1/images/search?limit=1&api_key=${API_KEY}`);
        const data = await res.json();
        openLightbox(data[0].url);
    } catch {
        openLightbox(fallbackImages[Math.floor(Math.random() * fallbackImages.length)]);
    }
}

/* ===========================================================
   FILTR RAS
   =========================================================== */
async function loadBreeds(selectId = "breed-filter") {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    try {
        const res = await fetch("https://api.thecatapi.com/v1/breeds");
        const breeds = await res.json();
        breeds.forEach((b) => {
            const o = document.createElement("option");
            o.value = b.id;
            o.innerText = b.name;
            sel.appendChild(o);
        });
    } catch {
        sel.parentElement && (sel.disabled = true);
    }
    sel.addEventListener("change", () => {
        currentBreed = sel.value;
        loadCats("cat-grid", currentLimit);
    });
}

/* ===========================================================
   TOAST
   =========================================================== */
let toastTimer;
function showToast(msg) {
    let t = document.getElementById("toast");
    if (!t) {
        t = document.createElement("div");
        t.className = "toast";
        t.id = "toast";
        document.body.appendChild(t);
    }
    t.innerText = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ===========================================================
   ROZBUDOWANY PANEL ADMINA
   =========================================================== */
function admSetLimit() {
    const v = parseInt(document.getElementById("adm-limit").value) || 2;
    currentLimit = v;
    refreshCats();
    showToast("Limit kotów: " + v);
}
function admResetVip() {
    localStorage.removeItem("catnet_rgb_unlock");
    sessionStorage.removeItem("catnet_rgb_active");
    document.body.classList.remove("vip-mode");
    const box = document.getElementById("vip-box");
    if (box) box.style.display = "";
    clearInterval(timerInterval);
    const btn = document.getElementById("vip-btn");
    if (btn) { btn.disabled = false; btn.innerText = "ODBLOKUJ TRYB VIP"; }
    const tc = document.getElementById("timer-container");
    if (tc) tc.style.display = "none";
    showToast("Zresetowano VIP");
    admStats();
}
function admSetCountdown() {
    const mins = parseInt(document.getElementById("adm-countdown").value) || 1;
    const unlock = new Date().getTime() + mins * 60 * 1000;
    localStorage.setItem("catnet_rgb_unlock", unlock);
    startCountdown(unlock);
    showToast("Odliczanie: " + mins + " min");
}
function admSetCounter() {
    const v = document.getElementById("adm-counter").value;
    if (v === "") return;
    localStorage.setItem("catnet_rgb_count", v);
    const el = document.getElementById("real-viewers");
    if (el) el.innerText = v;
    showToast("Licznik ustawiony: " + v);
}
function admToggleVipBox() {
    const box = document.getElementById("vip-box");
    if (!box) return;
    box.style.display = box.style.display === "none" ? "" : "none";
}
function admToggleFallback(cb) {
    forceFallback = cb.checked;
    refreshCats();
    showToast(forceFallback ? "Tryb awaryjny WŁ" : "Tryb awaryjny WYŁ");
}
function admWipe() {
    if (!confirm("Wyczyścić CAŁĄ pamięć lokalną (ustawienia, ulubione, VIP)?")) return;
    localStorage.clear();
    sessionStorage.clear();
    showToast("Wyczyszczono pamięć — odświeżam...");
    setTimeout(() => location.reload(), 1200);
}
function admStats() {
    const el = document.getElementById("adm-stats");
    if (!el) return;
    const s = getSettings();
    const unlock = localStorage.getItem("catnet_rgb_unlock");
    el.innerText =
        `ulubione: ${getFavorites().length}\n` +
        `licznik VIP: ${localStorage.getItem("catnet_rgb_count") || "-"}\n` +
        `VIP aktywny: ${sessionStorage.getItem("catnet_rgb_active") === "true" ? "TAK" : "nie"}\n` +
        `odblokowanie: ${unlock ? new Date(parseInt(unlock)).toLocaleString("pl-PL") : "-"}\n` +
        `motyw: ${s.accent} / ${s.mode} / ${s.density}\n` +
        `kotów/stronę: ${s.perPage} · tryb awaryjny: ${forceFallback ? "WŁ" : "WYŁ"}\n` +
        `własne fakty: ${getCustomFacts().length}`;
}

function admAddFact() {
    const input = document.getElementById("adm-fact");
    if (!input) return;
    const txt = input.value.trim();
    if (!txt) return;
    const facts = getCustomFacts();
    facts.push(txt);
    localStorage.setItem("catnet_custom_facts", JSON.stringify(facts));
    input.value = "";
    factBag = []; // przebuduj pulę losowania
    showToast("Dodano fakt do losowania");
    admStats();
}
function admClearFacts() {
    if (!confirm("Usunąć wszystkie własne fakty admina?")) return;
    localStorage.removeItem("catnet_custom_facts");
    factBag = [];
    showToast("Usunięto własne fakty");
    admStats();
}

/* ===========================================================
   INICJALIZACJA WSPÓLNA
   =========================================================== */
document.addEventListener("DOMContentLoaded", function () {
    buildSettingsDrawer();
    buildLightbox();
    applySettings();

    const toggle = document.getElementById("settings-toggle");
    if (toggle) toggle.addEventListener("click", openSettings);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { closeSettings(); closeLightbox(); }
    });
});
