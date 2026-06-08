/* ===========================================================
   CatNet — wspólna logika dla wszystkich podstron
   =========================================================== */

const API_KEY = "Live_p2Iw0CPRFAh8EIYZqvt3CMJMOqQQFjRdUND82x6c0kHVB5proE1aCebeSRcvJvrT";
let currentLimit = 2;
let currentBreed = "";       // filtr rasy (puste = wszystkie)
let forceFallback = false;   // tryb awaryjny wymuszony przez admina
let autoRefreshTimer = null;  // pokaz slajdów / auto-odświeżanie

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
    if (idx === -1) recordFavorite();
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
        if (!forceFallback) showBlockedNotice(grid);
        for (let i = 0; i < limit; i++) {
            createCatElement(grid, fallbackImages[i % fallbackImages.length]);
        }
    }
}

function createCatElement(grid, url) {
    addToHistory(url);
    if (grid && grid.id === "cat-grid") recordCatViewed();
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

function getAllFacts() {
    return catFacts.slice();
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
    recordFactViewed();
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

        <div class="setting-group">
            <label>Dane i kopia zapasowa</label>
            <button class="btn btn-ghost btn-block" onclick="exportData()">⬇️ Eksportuj ulubione + historię (JSON · Base64)</button>
            <button class="btn btn-ghost btn-block" onclick="copyExport()">📋 Kopiuj kod eksportu</button>
            <button class="btn btn-ghost btn-block" onclick="importData()">⬆️ Importuj z pliku</button>
            <button class="btn btn-ghost btn-block" onclick="importFromText()">📥 Importuj z kodu</button>
            <button class="btn btn-ghost btn-block" onclick="clearHistory()">🧹 Wyczyść historię</button>
            <input type="file" id="import-file" accept=".json,.txt,application/json" style="display:none" onchange="handleImportFile(this)">
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
function admToggleFallback(cb) {
    forceFallback = cb.checked;
    refreshCats();
    showToast(forceFallback ? "Tryb awaryjny WŁ" : "Tryb awaryjny WYŁ");
}
function admWipe() {
    if (!confirm("Wyczyścić CAŁĄ pamięć lokalną (ustawienia, ulubione, postępy)?")) return;
    localStorage.clear();
    sessionStorage.clear();
    showToast("Wyczyszczono pamięć — odświeżam...");
    setTimeout(() => location.reload(), 1200);
}
function admStats() {
    const el = document.getElementById("adm-stats");
    if (!el) return;
    const s = getSettings();
    const g = getGame();
    el.innerText =
        `ulubione: ${getFavorites().length}\n` +
        `obejrzano łącznie: ${g.totalViewed}\n` +
        `poziom: ${levelInfo(g.xp).level} · XP: ${g.xp} · passa: ${g.streak}\n` +
        `motyw: ${s.accent} / ${s.mode} / ${s.density}\n` +
        `kotów/stronę: ${s.perPage} · tryb awaryjny: ${forceFallback ? "WŁ" : "WYŁ"}`;
}

/* ===========================================================
   HISTORIA OGLĄDANYCH KOTÓW
   =========================================================== */
const HISTORY_KEY = "catnet_history";

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
        return [];
    }
}
function addToHistory(url) {
    if (!url) return;
    let h = getHistory().filter((u) => u !== url);
    h.unshift(url);
    if (h.length > 200) h = h.slice(0, 200);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}
function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    showToast("Wyczyszczono historię");
}

/* ===========================================================
   EKSPORT / IMPORT DANYCH (JSON zakodowany w Base64)
   =========================================================== */
function toB64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}
function fromB64(b64) {
    return decodeURIComponent(escape(atob(b64)));
}

function buildExportPayload() {
    return {
        app: "CatNet",
        version: 1,
        exportedAt: new Date().toISOString(),
        favorites: getFavorites(),
        history: getHistory()
    };
}

function exportData() {
    const json = JSON.stringify(buildExportPayload(), null, 2);
    const b64 = toB64(json);
    const blob = new Blob([b64], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "catnet-dane.json";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Wyeksportowano dane (JSON w Base64) ⬇️");
}

async function copyExport() {
    const b64 = toB64(JSON.stringify(buildExportPayload()));
    try {
        await navigator.clipboard.writeText(b64);
        showToast("Skopiowano kod eksportu 📋");
    } catch {
        prompt("Skopiuj kod eksportu (Base64):", b64);
    }
}

function importData() {
    document.getElementById("import-file")?.click();
}
function handleImportFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        applyImport(reader.result);
        input.value = "";
    };
    reader.readAsText(file);
}
function importFromText() {
    const b64 = prompt("Wklej kod eksportu (Base64):");
    if (b64) applyImport(b64);
}
function applyImport(b64) {
    try {
        const data = JSON.parse(fromB64(b64.trim()));
        if (Array.isArray(data.favorites))
            localStorage.setItem("catnet_favorites", JSON.stringify(data.favorites));
        if (Array.isArray(data.history))
            localStorage.setItem(HISTORY_KEY, JSON.stringify(data.history));
        updateFavCounter();
        if (document.getElementById("fav-grid")) renderFavorites("fav-grid");
        showToast("Zaimportowano dane ✅");
    } catch {
        showToast("Nieprawidłowy kod / plik importu ❌");
    }
}

/* ===========================================================
   BLOKADA STRONY / ADBLOCK
   =========================================================== */
function showBlockedNotice(grid) {
    if (!grid || grid.querySelector(".blocked-notice")) return;
    const note = document.createElement("div");
    note.className = "blocked-notice";
    note.innerHTML = `
        <div class="blocked-emoji">🙀</div>
        <h3>Nie można wyświetlić kotów</h3>
        <p>Wygląda na to, że Twoja przeglądarka lub <strong>AdBlock</strong> blokuje połączenie.
           Wyłącz blokowanie reklam i odśwież stronę — w przeciwnym razie koty się nie załadują.</p>
        <button class="btn btn-primary" onclick="loadCats('cat-grid', currentLimit)">Spróbuj ponownie 🔄</button>
    `;
    grid.appendChild(note);
}

function showAdblockBanner() {
    if (document.getElementById("adblock-banner")) return;
    const b = document.createElement("div");
    b.id = "adblock-banner";
    b.className = "adblock-banner";
    b.innerHTML = `🚫 Wygląda na to, że masz włączony <strong>AdBlock</strong> — przez to koty mogą się nie wyświetlać. Wyłącz blokowanie i odśwież stronę.
        <button title="Zamknij" onclick="this.parentElement.remove()">✕</button>`;
    document.body.prepend(b);
}

function detectAdblock() {
    const bait = document.createElement("div");
    bait.className = "adsbox ad-banner ads ad-placement pub_300x250 adsbygoogle";
    bait.style.cssText = "position:absolute;left:-9999px;top:-9999px;height:10px;width:10px;";
    bait.innerHTML = "&nbsp;";
    document.body.appendChild(bait);
    setTimeout(() => {
        const blocked =
            bait.offsetHeight === 0 ||
            bait.clientHeight === 0 ||
            getComputedStyle(bait).display === "none" ||
            getComputedStyle(bait).visibility === "hidden";
        bait.remove();
        if (blocked) showAdblockBanner();
    }, 300);
}

/* „Odblokuj IP” — w stopce */
function unblockIP() {
    showToast("🔄 Trwa odblokowywanie adresu IP...");
    setTimeout(() => {
        showToast("✅ Twój adres IP został pomyślnie odblokowany!");
        if (document.getElementById("cat-grid")) loadCats("cat-grid", currentLimit);
    }, 1800);
}

/* ===========================================================
   GRYWALIZACJA: passa 🔥, XP, poziomy, cel dzienny
   =========================================================== */
const GAME_KEY = "catnet_game";
const defaultGame = {
    xp: 0,
    streak: 0,
    lastVisit: null,
    todayDate: null,
    todayCount: 0,
    dailyGoal: 10,
    dailyBonusGiven: false,
    totalViewed: 0,
    factsViewed: 0,
    seenOnboarding: false
};

function getGame() {
    try {
        return { ...defaultGame, ...JSON.parse(localStorage.getItem(GAME_KEY) || "{}") };
    } catch {
        return { ...defaultGame };
    }
}
function saveGame(g) {
    localStorage.setItem(GAME_KEY, JSON.stringify(g));
}
function dateStr(d = new Date()) {
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

function levelInfo(xp) {
    let level = 1, need = 100, acc = 0;
    while (xp >= acc + need) {
        acc += need;
        level++;
        need = Math.round(need * 1.35);
    }
    return { level, into: xp - acc, need, progress: Math.round(((xp - acc) / need) * 100) };
}

function awardXp(amount) {
    const g = getGame();
    const before = levelInfo(g.xp).level;
    g.xp += amount;
    const after = levelInfo(g.xp).level;
    saveGame(g);
    if (after > before) setTimeout(() => showToast(`🎉 Poziom ${after}! Tak trzymaj!`), 400);
    updateGameUI();
}

function recordCatViewed() {
    const g = getGame();
    g.totalViewed += 1;
    g.todayCount += 1;
    let bonus = false;
    if (!g.dailyBonusGiven && g.todayCount >= g.dailyGoal) {
        g.dailyBonusGiven = true;
        bonus = true;
    }
    saveGame(g);
    awardXp(2 + (bonus ? 50 : 0));
    if (bonus) setTimeout(() => showToast("🎯 Cel dzienny osiągnięty! +50 XP 🎉"), 300);
}
function recordFavorite() {
    awardXp(10);
}
function recordFactViewed() {
    const g = getGame();
    g.factsViewed += 1;
    saveGame(g);
    awardXp(3);
}

function initGamification() {
    const g = getGame();
    const today = dateStr();
    if (g.todayDate !== today) {
        g.todayDate = today;
        g.todayCount = 0;
        g.dailyBonusGiven = false;
    }
    if (g.lastVisit !== today) {
        const y = dateStr(new Date(Date.now() - 86400000));
        g.streak = g.lastVisit === y ? (g.streak || 0) + 1 : 1;
        g.lastVisit = today;
        saveGame(g);
        const s = g.streak;
        setTimeout(() => showToast(`🔥 Passa: ${s} ${s === 1 ? "dzień" : "dni"}! +15 XP`), 900);
        awardXp(15);
    } else {
        saveGame(g);
    }
    updateGameUI();
    if (!g.seenOnboarding) setTimeout(showOnboarding, 600);
}

function updateGameUI() {
    const g = getGame();
    const li = levelInfo(g.xp);
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set("hud-streak", g.streak);
    set("hud-level", li.level);
    set("pg-level", li.level);
    set("pg-xp", `${li.into} / ${li.need} XP`);
    set("pg-streak", g.streak);
    const bar = document.getElementById("pg-xpbar");
    if (bar) bar.style.width = li.progress + "%";
    const ring = document.getElementById("pg-ring");
    if (ring) {
        const pct = Math.min(100, Math.round((g.todayCount / g.dailyGoal) * 100));
        ring.style.setProperty("--p", pct);
        set("pg-ring-count", `${Math.min(g.todayCount, g.dailyGoal)}/${g.dailyGoal}`);
    }
}

/* ---------- Pasek nawigacji: HUD + hamburger ---------- */
function buildNavExtras() {
    document.querySelectorAll(".nav-tools").forEach((tools) => {
        if (tools.querySelector(".hud")) return;
        const nav = tools.querySelector(".nav-links");

        const hud = document.createElement("button");
        hud.className = "hud";
        hud.title = "Twoje postępy";
        hud.innerHTML =
            `<span class="hud-chip streak">🔥<b id="hud-streak">0</b></span>` +
            `<span class="hud-chip level">⭐<b id="hud-level">1</b></span>`;
        hud.addEventListener("click", openProgress);
        tools.insertBefore(hud, nav);

        const burger = document.createElement("button");
        burger.className = "icon-btn hamburger";
        burger.title = "Menu";
        burger.innerHTML = "☰";
        burger.addEventListener("click", () => nav.classList.toggle("open"));
        tools.appendChild(burger);
    });
}

/* ---------- Szuflada postępów ---------- */
function buildProgressDrawer() {
    if (document.getElementById("progress-drawer")) return;
    const overlay = document.createElement("div");
    overlay.className = "drawer-overlay";
    overlay.id = "progress-overlay";
    overlay.addEventListener("click", closeProgress);

    const drawer = document.createElement("aside");
    drawer.className = "drawer left";
    drawer.id = "progress-drawer";
    drawer.innerHTML = `
        <div class="drawer-head">
            <h3>🐾 Twoje postępy</h3>
            <button class="icon-btn" onclick="closeProgress()">✕</button>
        </div>
        <div class="level-card">
            <div class="level-top">
                <span class="lv">Poziom <span id="pg-level">1</span></span>
                <span class="xp" id="pg-xp">0 / 100 XP</span>
            </div>
            <div class="xp-bar"><i id="pg-xpbar"></i></div>
        </div>
        <div class="streak-card">
            <span class="flame">🔥</span>
            <div>
                <div class="big"><span id="pg-streak">0</span> dni</div>
                <div class="lbl">Twoja passa — wróć jutro, by ją przedłużyć!</div>
            </div>
        </div>
        <div class="setting-group">
            <label>Cel dzienny</label>
            <div class="goal-ring" id="pg-ring">
                <div class="ring-inner">
                    <div class="rc" id="pg-ring-count">0/10</div>
                    <div class="rl">kotów dziś</div>
                </div>
            </div>
        </div>
        <button class="btn btn-ghost btn-block" onclick="showOnboarding()">▶️ Pokaż samouczek</button>
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
}
function openProgress() {
    updateGameUI();
    document.getElementById("progress-overlay")?.classList.add("open");
    document.getElementById("progress-drawer")?.classList.add("open");
}
function closeProgress() {
    document.getElementById("progress-overlay")?.classList.remove("open");
    document.getElementById("progress-drawer")?.classList.remove("open");
}

/* ===========================================================
   ONBOARDING (jak w Duolingo)
   =========================================================== */
const onbSlides = [
    { m: "🐱", h: "Witaj w CatNet!", p: "Najsłodsze koty w sieci już czekają. Pokażemy Ci w kilka sekund, jak to działa." },
    { m: "🔄", h: "Odkrywaj koty", p: "Odświeżaj galerię i oglądaj nowe koty bez końca — każdy klik to nowa porcja mruczenia." },
    { m: "❤️", h: "Zbieraj ulubione", p: "Kliknij serduszko na zdjęciu, aby zapisać najsłodsze koty do swojej kolekcji." },
    { m: "🔥", h: "Buduj passę", p: "Wracaj codziennie, zdobywaj XP i podbijaj kolejne poziomy!" },
    { m: "🎯", h: "Twój cel dzienny", p: "Ile kotów chcesz oglądać każdego dnia?", goal: true }
];
let onbIndex = 0;
let onbGoal = 10;

function buildOnboarding() {
    if (document.getElementById("onboarding")) return;
    const ov = document.createElement("div");
    ov.className = "onb-overlay";
    ov.id = "onboarding";
    ov.innerHTML = `<div class="onb-card" id="onb-card"></div>`;
    document.body.appendChild(ov);
}
function renderOnb() {
    const s = onbSlides[onbIndex];
    const dots = onbSlides.map((_, i) => `<i class="${i === onbIndex ? "on" : ""}"></i>`).join("");
    const last = onbIndex === onbSlides.length - 1;
    let goalHtml = "";
    if (s.goal) {
        const opts = [
            { v: 3, n: "Spokojnie", d: "3 koty dziennie" },
            { v: 10, n: "Standard", d: "10 kotów dziennie" },
            { v: 20, n: "Hardcore", d: "20 kotów dziennie" }
        ];
        goalHtml =
            `<div class="goal-options">` +
            opts.map((o) => `<button class="goal-opt ${o.v === onbGoal ? "sel" : ""}" onclick="setOnbGoal(${o.v})">${o.n} <small>${o.d}</small></button>`).join("") +
            `</div>`;
    }
    document.getElementById("onb-card").innerHTML = `
        <div class="onb-mascot">${s.m}</div>
        <h2>${s.h}</h2>
        <p>${s.p}</p>
        ${goalHtml}
        <div class="onb-dots">${dots}</div>
        <div class="onb-actions">
            ${onbIndex > 0 ? `<button class="btn btn-ghost" onclick="onbPrev()">Wstecz</button>` : ``}
            <button class="btn btn-primary" onclick="onbNext()">${last ? "Zaczynamy! 🚀" : "Dalej"}</button>
        </div>
    `;
}
function setOnbGoal(v) { onbGoal = v; renderOnb(); }
function onbNext() {
    if (onbIndex < onbSlides.length - 1) { onbIndex++; renderOnb(); }
    else finishOnboarding();
}
function onbPrev() {
    if (onbIndex > 0) { onbIndex--; renderOnb(); }
}
function showOnboarding() {
    buildOnboarding();
    onbIndex = 0;
    onbGoal = getGame().dailyGoal || 10;
    renderOnb();
    document.getElementById("onboarding").classList.add("open");
}
function finishOnboarding() {
    const g = getGame();
    const first = !g.seenOnboarding;
    g.seenOnboarding = true;
    g.dailyGoal = onbGoal;
    saveGame(g);
    document.getElementById("onboarding").classList.remove("open");
    updateGameUI();
    if (first) {
        awardXp(20);
        setTimeout(() => showToast("Miłej zabawy w CatNet! 🐾 +20 XP"), 300);
    }
}

/* Admin: grywalizacja */
function admResetGame() {
    if (!confirm("Zresetować postępy (XP, poziom, passa)?")) return;
    localStorage.removeItem(GAME_KEY);
    initGamification();
    showToast("Zresetowano postępy");
    admStats();
}

/* ===========================================================
   INICJALIZACJA WSPÓLNA
   =========================================================== */
document.addEventListener("DOMContentLoaded", function () {
    buildSettingsDrawer();
    buildLightbox();
    buildProgressDrawer();
    buildOnboarding();
    buildNavExtras();
    applySettings();
    detectAdblock();
    initGamification();

    const toggle = document.getElementById("settings-toggle");
    if (toggle) toggle.addEventListener("click", openSettings);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeSettings();
            closeLightbox();
            closeProgress();
        }
    });
});
