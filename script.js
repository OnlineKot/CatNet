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
    showSkeletons(grid, limit);

    try {
        if (forceFallback) throw new Error("Wymuszony tryb awaryjny");
        const breedParam = currentBreed ? `&breed_ids=${currentBreed}` : "";
        const response = await fetch(
            `https://api.thecatapi.com/v1/images/search?limit=${limit}${breedParam}&api_key=${API_KEY}`
        );
        if (!response.ok) throw new Error("API Błąd");
        const data = await response.json();
        if (!data || data.length === 0) throw new Error("Pusta odpowiedź API");

        grid.innerHTML = "";
        data.forEach((cat) => createCatElement(grid, cat.url));
    } catch (err) {
        console.warn("Zabezpieczenie aktywne: TheCatAPI nie odpowiada, ładuję rezerwę.", err);
        grid.innerHTML = "";
        if (!forceFallback) showBlockedNotice(grid);
        for (let i = 0; i < limit; i++) {
            createCatElement(grid, fallbackImages[i % fallbackImages.length]);
        }
    }
}

function createCatElement(grid, url) {
    addToHistory(url);
    const card = document.createElement("div");
    card.className = "cat-card";

    const img = document.createElement("img");
    img.src = url;
    img.alt = "Losowy kot z CatNet";
    img.loading = "lazy";
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => { registerCatClick(); openLightbox(url); });

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
        grid.innerHTML = `<p class="empty-hint">${t("empty.favs")}</p>`;
        return;
    }
    favs.forEach((url) => createCatElement(grid, url));
}

/* ---------- Ukryty panel admina ---------- */
let tClicks = 0;
function triggerAdmin() {
    tClicks++;
    if (tClicks === 5) openSecretMenu();
}

/* Otwiera sekretne menu (panel admina). Jeśli go nie ma na tej stronie,
   przechodzi na stronę główną i otwiera je tam. */
function openSecretMenu() {
    tClicks = 0;
    catClicks = 0;
    const panel = document.getElementById("adm-panel");
    if (panel) {
        panel.style.display = "block";
        admStats();
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
        sessionStorage.setItem("catnet_open_secret", "1");
        location.href = "index.html";
    }
}

/* Ukryte wejścia: wpisz „cats" albo kliknij 15 kotów */
let catClicks = 0;
let keyBuffer = "";
function registerCatClick() {
    catClicks++;
    if (catClicks >= 8) openSecretMenu();
}
function handleSecretKey(e) {
    if (e.key && e.key.length === 1) {
        keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-8);
        if (keyBuffer.endsWith("cats") || keyBuffer.endsWith("koty")) openSecretMenu();
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
    "Freud to oficjalnie najsłodszy kot na świecie — i nikt nie ma odwagi się z tym kłócić. 🐱",
    "Ulubione zajęcia Freuda: drzemka w plamie słońca i patrzenie przez okno.",
    "Kiedy Freud mruczy, cały dzień od razu robi się lepszy.",
    "A Freud — kot, którego właśnie oglądasz — jest po prostu najsłodszym kotem na świecie. 🐱💖"
];

const catFactsEn = [
    "Cats sleep between 12 and 16 hours a day.",
    "A cat can make over 100 different sounds, while a dog makes only about 10.",
    "Every cat's nose has a unique pattern — like a human fingerprint.",
    "Cats can't taste sweetness at all.",
    "A cat's purr is in a frequency range that helps bones regenerate.",
    "A cat can run up to 48 km/h.",
    "A group of cats is called \"a clowder\".",
    "A cat has five toes on each front paw, but only four on the back ones.",
    "There are 32 muscles in each cat's ear.",
    "Cats can rotate their ears almost 180 degrees.",
    "A cat sees in low light several times better than a human.",
    "A cat's whiskers sense the slightest movement of air.",
    "A cat has a third eyelid, called the nictitating membrane.",
    "A cat's heart beats about 140–220 times per minute.",
    "Cats sweat only through the pads of their paws.",
    "A cat can jump several times its own length.",
    "Cats spend up to half their day grooming.",
    "A cat's tongue is covered with tiny keratin hooks.",
    "A cat flicking its tail side to side is often annoyed.",
    "A slow blink from a cat is a \"cat kiss\" and a sign of trust.",
    "Cats rub against people to leave their scent.",
    "The oldest known cat lived to 38 years.",
    "A cat can recognize its owner's voice but often ignores it.",
    "An adult cat has 30 teeth, a kitten only 26.",
    "Cats have no collarbone, so they fit through narrow gaps.",
    "If a cat's head fits, the rest of its body will too.",
    "Cats mostly meow at humans, rarely at other cats.",
    "Cats usually have 12 whiskers on each side of the muzzle.",
    "A cat drinks by curling the tip of its tongue into a J shape.",
    "A cat experiences the world mostly through smell — millions of scent receptors.",
    "A cat rolls onto its back when it fully trusts you.",
    "House cats and tigers share over 95% of their DNA.",
    "Kittens are born blind and deaf.",
    "Cats start purring in their first days of life.",
    "The heaviest cat on record weighed over 20 kg.",
    "Cats can dream — they twitch their whiskers and paws in their sleep.",
    "A cat lands on its paws thanks to the \"righting reflex\".",
    "Many cats can't stand the smell of citrus.",
    "In ancient Egypt cats were worshipped as sacred animals.",
    "Cats can sense an approaching storm.",
    "A cat moves by stepping with both right legs, then both left.",
    "A cat's claws curve, so it climbs up more easily than down.",
    "Cats scratch objects to sharpen claws and mark territory.",
    "A cat's whiskers are roughly as wide as its body.",
    "Cats see shades of blue and green better than red.",
    "Most cats dislike getting their fur wet — but there are exceptions.",
    "The Turkish Van breed is famous for loving to swim.",
    "Cats can chirp at the sight of birds outside the window.",
    "A cat's eyes glow in the dark thanks to a light-reflecting layer.",
    "Cats are most active at dawn and dusk.",
    "A cat's purr can lower its owner's blood pressure.",
    "Some cats are \"right-pawed\", others \"left-pawed\".",
    "A cat can outrun the fastest human over a short distance.",
    "A cat can jump and land almost silently.",
    "Cats also have whiskers on the back of their front legs.",
    "A raised tail with a curled tip is a friendly greeting.",
    "A cat \"kneading\" you with its paws feels safe with you.",
    "Cats can learn to open doors and drawers.",
    "Kittens from one litter can have different fathers.",
    "A cat sees at a wider angle than a human.",
    "Cats see poorly right in front of their own nose.",
    "A cat's hearing reaches much higher than a human's — into ultrasound.",
    "That's why a cat hears a mouse we can't hear at all.",
    "A cat can recognize its name, though it doesn't always react.",
    "Cats sleep more when it's cold or cloudy.",
    "Many cats are lactose intolerant, despite loving milk.",
    "Cats are carnivores — meat is the best snack for them.",
    "A cat needs taurine, which it must get from food.",
    "Whiskers help a cat \"see\" in the dark by touch.",
    "A cat often returns to the same spot it considers safe.",
    "A cat's purr is sometimes used in relaxation therapy.",
    "Every cat has its own unique scent.",
    "Cats love warm, elevated spots with a good view.",
    "A box is a cat's best hideout and a source of security.",
    "Cats feel comfortable in small, enclosed spaces.",
    "Some cats fetch toys like dogs.",
    "A cat's play is training for its hunting instinct.",
    "A cat \"pretend-hunts\" even when it's well fed.",
    "Cats can recognize their owner's emotions from tone of voice.",
    "A cat communicates with its tail, ears and whole body.",
    "A female cat more often uses her right paw, a male his left.",
    "A cat has an excellent sense of balance thanks to its inner ear.",
    "Cats can survive a fall by spreading their body like a parachute.",
    "A cat can sleep through most of the day, and an older one even more.",
    "A cat switches mood in a second — from cuddles to wild play.",
    "A cat's tail helps it keep balance during jumps.",
    "Cats recognize familiar people also by the way they walk.",
    "A cat can remember where its favorite toy was hidden.",
    "Purring is also a cat's way to soothe its own stress.",
    "Cats greet each other by touching noses.",
    "A cat showing its belly is showing you huge trust.",
    "Every cat's coat pattern is unique.",
    "Cats can mimic the tone of a human voice to get attention.",
    "A cat can be surprisingly agile even in tight nooks.",
    "Cats often pick the warmest spot in the whole house.",
    "A cat squinting at you is saying \"I like you\".",
    "Cats can learn simple tricks with the help of rewards.",
    "Friendship with a cat builds slowly, but it's exceptionally lasting.",
    "A cat can sense when you're sad and come over for a cuddle.",
    "Freud is officially the cutest cat in the world — and nobody dares to argue. 🐱",
    "Freud's favourite things: napping in a sunbeam and staring out the window.",
    "When Freud purrs, the whole day instantly gets better.",
    "And Freud — the cat you're looking at right now — is simply the cutest cat in the world. 🐱💖"
];

function getAllFacts() {
    return (LANG === "en" ? catFactsEn : catFacts).slice();
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
    autoRefresh: false,
    lang: "auto"
};

/* ===========================================================
   i18n — wersja polska / angielska (auto-wykrywanie)
   =========================================================== */
let LANG = "pl";

function detectLang() {
    const s = getSettings();
    if (s.lang === "pl" || s.lang === "en") return s.lang;
    const langs = (navigator.languages || [navigator.language || "en"]).join(",").toLowerCase();
    let tz = "";
    try { tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "").toLowerCase(); } catch {}
    // Z Polski → polski, w przeciwnym razie angielski
    if (langs.includes("pl") || tz === "europe/warsaw") return "pl";
    return "en";
}

function t(key) {
    const d = translations[LANG] || translations.pl;
    if (d && d[key] != null) return d[key];
    return translations.pl[key] != null ? translations.pl[key] : key;
}

function applyI18n() {
    document.documentElement.lang = LANG;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        el.innerHTML = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
        el.placeholder = t(el.getAttribute("data-i18n-ph"));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
        el.title = t(el.getAttribute("data-i18n-title"));
    });
}

function setLang(v) {
    const s = getSettings();
    s.lang = v;
    saveSettings(s);
    location.reload();
}

const translations = {
    pl: {
        "nav.start": "Start", "nav.gallery": "Galeria", "nav.facts": "Fakty", "nav.about": "O nas",
        "footer.made": "Stworzone z miłości do kotów",
        "hero.h1": 'Najsłodsze <span class="grad">koty</span><br>w całej sieci 🐱',
        "hero.p": "Witaj w CatNet! Odśwież galerię, by odkrywać nowe urocze koty, polub swoje ulubione i wracaj po codzienną dawkę mruczenia.",
        "btn.browseGallery": "Przeglądaj galerię", "btn.showNewCats": "Pokaż nowe koty",
        "fact.label": "Ciekawostka o kotach",
        "home.todayTitle": "Koty na dziś", "home.todaySub": "Mały podgląd tego, co czeka na Ciebie w galerii.",
        "gallery.title": "Galeria kotów 🐱",
        "gallery.sub": "Odświeżaj, ile chcesz — kotów nigdy nie zabraknie. Kliknij serduszko, by zapisać ulubione.",
        "btn.newCats": "Nowe koty 🔄", "btn.surprise": "🎁 Niespodzianka", "btn.premium": "👑 Koty premium",
        "btn.pro": "🐱 Koty PRO (za darmo)", "toast.pro": "Załadowano koty PRO 🐱✨",
        "gallery.allBreeds": "Wszystkie rasy", "gallery.favCount": "Twoje ulubione:",
        "gallery.favTitle": "Twoje ulubione ♥", "gallery.favSub": "Koty, które zapisałeś. Zapisują się w Twojej przeglądarce.",
        "facts.title": 'Fakty o <span class="grad">kotach</span> 🐾',
        "facts.sub": "Klikaj i odkrywaj — za każdym razem coś nowego o naszych mruczących przyjaciołach.",
        "facts.didYouKnow": "Czy wiesz, że...", "btn.nextFact": "Następny fakt ✨",
        "facts.sweetTitle": "Freud — najsłodszy kot na świecie 🐱💖",
        "facts.sweetSub": "Poznaj Freuda. To on jest, przy okazji, po prostu najsłodszym kotem na świecie.",
        "btn.anotherSweet": "Pokaż innego uroczego kota 🐾", "loading": "Wczytywanie...",
        "about.title": "O CatNet 🐾",
        "about.p1": "CatNet powstał z prostego przekonania: świat jest piękniejszy, gdy jest w nim więcej kotów. To miejsce, w którym jednym kliknięciem odkryjesz nieskończoną galerię uroczych pyszczków — bez logowania, bez opłat, bez końca.",
        "about.p2": "Zdjęcia pochodzą z otwartych API <strong>TheCatAPI</strong> oraz <strong>Cataas</strong>, dzięki czemu za każdym odświeżeniem czeka na Ciebie zupełnie nowa porcja mruczących bohaterów.",
        "stat.infinite": "Kotów do odkrycia", "stat.free": "Zawsze za darmo", "stat.joy": "Czystej radości",
        "about.whyTitle": "Dlaczego CatNet?",
        "feat1.t": "Nigdy się nie kończy", "feat1.p": "Tysiące losowych zdjęć kotów. Odświeżaj, ile tylko chcesz.",
        "feat2.t": "Twoje ulubione", "feat2.p": "Zapisuj najsłodsze koty jednym kliknięciem — zostaną w Twojej przeglądarce.",
        "feat3.t": "Szybko i lekko", "feat3.p": "Bez kont, bez reklam, bez bałaganu. Tylko Ty i koty.",
        "feat4.t": "Na każdym ekranie", "feat4.p": "Wygodne na telefonie, tablecie i komputerze.",
        "btn.goGallery": "Przejdź do galerii", "btn.backHome": "Wróć na start",
        "trust.noAds": "Bez reklam", "trust.noAccounts": "Bez kont",
        "trust.private": "Ulubione tylko w Twojej przeglądarce", "trust.openApi": "Otwarte API",
        "trust.openSource": "Z pasji, nie dla zysku 💚",
        "foss.title": "Zrobione z pasji 💚",
        "foss.note": "Cześć! 👋 CatNet to mój projekt po godzinach — robię go po prostu dla zabawy i z miłości do kotów, w duchu open source: otwarcie i przejrzyście. Bez reklam, bez kont, a ulubione i historia są zapisywane tylko w Twojej przeglądarce. Po prostu koty i dobry humor. 🐾",
        "trusted.title": "Zaufali nam ❤️",
        "trusted.sub": "Dołącz do tysięcy miłośników kotów, którzy codziennie wracają po uśmiech.",
        "trusted.s1n": "12 000+", "trusted.s1l": "zadowolonych użytkowników",
        "trusted.s2n": "1 000 000+", "trusted.s2l": "pokazanych kotów",
        "trusted.s3n": "4,9/5", "trusted.s3l": "średnia ocen",
        "trusted.q1": "„Najlepsze miejsce na chwilę relaksu w ciągu dnia.”", "trusted.q1a": "— Ania",
        "trusted.q2": "„Wracam tu codziennie — koty zawsze poprawiają mi humor!”", "trusted.q2a": "— Marek",
        "trusted.q3": "„Prosto, ładnie i bez reklam. Tak ma być.”", "trusted.q3a": "— Kasia",
        "set.title": "⚙️ Ustawienia", "set.themeColor": "Kolor motywu", "set.mode": "Tryb",
        "set.dark": "🌙 Ciemny", "set.light": "☀️ Jasny", "set.density": "Gęstość siatki",
        "set.comfortable": "Komfortowa", "set.dense": "Gęsta", "set.perPage": "Kotów na stronę (galeria)",
        "set.slideshow": "🎞️ Pokaz slajdów (auto)", "set.quickActions": "Szybkie akcje",
        "set.surprise": "🎁 Niespodzianka — losowy kot", "set.clearFavs": "🗑️ Wyczyść ulubione",
        "set.reset": "↺ Przywróć domyślne", "set.backup": "Dane i kopia zapasowa",
        "set.export": "⬇️ Eksportuj ulubione + historię (JSON · Base64)", "set.copyExport": "📋 Kopiuj kod eksportu",
        "set.importFile": "⬆️ Importuj z pliku", "set.importCode": "📥 Importuj z kodu",
        "set.clearHistory": "🧹 Wyczyść historię", "set.language": "Język",
        "set.premium": "Premium i polecenia", "set.premiumBtn": "👑 Koty premium",
        "set.referralBtn": "🎁 Kod polecający",
        "pg.title": "🐾 Twoje postępy", "pg.level": "Poziom", "pg.dailyGoal": "Cel dzienny",
        "pg.catsToday": "kotów dziś", "pg.streakHint": "Twoja passa — wróć jutro, by ją przedłużyć!",
        "pg.days": "dni", "pg.showTutorial": "▶️ Pokaż samouczek",
        "onb.s1t": "Witaj w CatNet!", "onb.s1p": "Najsłodsze koty w sieci już czekają. Pokażemy Ci w kilka sekund, jak to działa.",
        "onb.s2t": "Odkrywaj koty", "onb.s2p": "Odświeżaj galerię i oglądaj nowe koty bez końca — każdy klik to nowa porcja mruczenia.",
        "onb.s3t": "Zbieraj ulubione", "onb.s3p": "Kliknij serduszko na zdjęciu, aby zapisać najsłodsze koty do swojej kolekcji.",
        "onb.s4t": "Koty premium 👑", "onb.s4p": "Zdobądź kod polecający od znajomego i odblokuj wyjątkowe koty premium z Cataas!",
        "onb.goalCalm": "Spokojnie", "onb.goalCalmD": "3 koty dziennie",
        "onb.goalStd": "Standard", "onb.goalStdD": "10 kotów dziennie",
        "onb.goalHard": "Hardcore", "onb.goalHardD": "20 kotów dziennie",
        "onb.next": "Dalej", "onb.back": "Wstecz", "onb.start": "Zaczynamy! 🚀",
        "toast.resetSettings": "Przywrócono ustawienia domyślne", "toast.noFavs": "Brak ulubionych do usunięcia",
        "toast.favsCleared": "Usunięto ulubione koty", "toast.downloaded": "Pobrano zdjęcie 🐾",
        "toast.shareCopied": "Skopiowano link do zdjęcia 🔗", "toast.exported": "Wyeksportowano dane (JSON w Base64) ⬇️",
        "toast.copied": "Skopiowano kod eksportu 📋", "toast.imported": "Zaimportowano dane ✅",
        "toast.importErr": "Nieprawidłowy kod / plik importu ❌", "toast.historyCleared": "Wyczyszczono historię",
        "toast.ipStart": "🔄 Trwa odblokowywanie adresu IP...", "toast.ipDone": "✅ Twój adres IP został pomyślnie odblokowany!",
        "toast.goalDone": "🎯 Cel dzienny osiągnięty! +50 XP 🎉", "toast.levelUp": "🎉 Poziom {n}! Tak trzymaj!",
        "toast.streak1": "🔥 Passa: {n} dzień! +15 XP", "toast.streak": "🔥 Passa: {n} dni! +15 XP",
        "toast.onbDone": "Miłej zabawy w CatNet! 🐾 +20 XP", "toast.premiumOn": "👑 Tryb premium odblokowany!",
        "blocked.title": "Nie można wyświetlić kotów",
        "blocked.text": "Wygląda na to, że Twoja przeglądarka lub <strong>AdBlock</strong> blokuje połączenie. Wyłącz blokowanie reklam i odśwież stronę — w przeciwnym razie koty się nie załadują.",
        "blocked.retry": "Spróbuj ponownie 🔄",
        "adblock.banner": "🚫 Wygląda na to, że masz włączony <strong>AdBlock</strong> — przez to koty mogą się nie wyświetlać. Wyłącz blokowanie i odśwież stronę.",
        "lightbox.fav": "♡ Ulubione", "lightbox.favOn": "♥ W ulubionych", "lightbox.download": "⬇️ Pobierz", "lightbox.share": "🔗 Udostępnij",
        "empty.favs": "Nie masz jeszcze ulubionych kotów. Kliknij serduszko na zdjęciu, aby je tu zapisać. 🐾",
        "premium.title": "👑 Koty premium", "premium.locked": "Koty premium z serwisu Cataas są zablokowane. Odblokuj je, wpisując kod polecający od znajomego!",
        "premium.unlocked": "Masz dostęp do kotów premium! 👑", "premium.show": "Pokaż koty premium 👑",
        "ref.title": "🎁 Kod polecający", "ref.yourCode": "Twój kod polecający:",
        "ref.share": "Udostępnij ten kod znajomym. Gdy ktoś go wpisze, oboje dostajecie bonus!",
        "ref.enterLabel": "Masz kod od znajomego? Wpisz go:", "ref.redeem": "Odbierz bonus",
        "ref.copy": "📋 Kopiuj mój kod",
        "toast.refCopied": "Skopiowano Twój kod 📋", "toast.refOwn": "To Twój własny kod 🙂",
        "toast.refUsed": "Ten kod został już wykorzystany", "toast.refInvalid": "Nieprawidłowy kod polecający",
        "toast.refOk": "🎉 Bonus odebrany! +150 XP i koty premium odblokowane 👑"
    },
    en: {
        "nav.start": "Home", "nav.gallery": "Gallery", "nav.facts": "Facts", "nav.about": "About",
        "footer.made": "Made with love for cats",
        "hero.h1": 'The cutest <span class="grad">cats</span><br>on the whole web 🐱',
        "hero.p": "Welcome to CatNet! Refresh the gallery to discover new adorable cats, like your favorites and come back for your daily dose of purring.",
        "btn.browseGallery": "Browse gallery", "btn.showNewCats": "Show new cats",
        "fact.label": "Cat fact",
        "home.todayTitle": "Cats for today", "home.todaySub": "A little preview of what's waiting for you in the gallery.",
        "gallery.title": "Cat gallery 🐱",
        "gallery.sub": "Refresh as much as you like — there are endless cats. Click the heart to save your favorites.",
        "btn.newCats": "New cats 🔄", "btn.surprise": "🎁 Surprise", "btn.premium": "👑 Premium cats",
        "btn.pro": "🐱 PRO cats (free)", "toast.pro": "PRO cats loaded 🐱✨",
        "gallery.allBreeds": "All breeds", "gallery.favCount": "Your favorites:",
        "gallery.favTitle": "Your favorites ♥", "gallery.favSub": "Cats you've saved. They're stored in your browser.",
        "facts.title": 'Facts about <span class="grad">cats</span> 🐾',
        "facts.sub": "Click and discover — something new about our purring friends every time.",
        "facts.didYouKnow": "Did you know...", "btn.nextFact": "Next fact ✨",
        "facts.sweetTitle": "Freud — the cutest cat in the world 🐱💖",
        "facts.sweetSub": "Meet Freud. He is, by the way, simply the cutest cat in the world.",
        "btn.anotherSweet": "Show another adorable cat 🐾", "loading": "Loading...",
        "about.title": "About CatNet 🐾",
        "about.p1": "CatNet was born from a simple belief: the world is more beautiful with more cats in it. It's a place where one click reveals an endless gallery of adorable faces — no login, no fees, no end.",
        "about.p2": "The photos come from the open <strong>TheCatAPI</strong> and <strong>Cataas</strong> APIs, so every refresh brings a brand-new batch of purring heroes.",
        "stat.infinite": "Cats to discover", "stat.free": "Always free", "stat.joy": "Pure joy",
        "about.whyTitle": "Why CatNet?",
        "feat1.t": "Never ends", "feat1.p": "Thousands of random cat photos. Refresh as much as you want.",
        "feat2.t": "Your favorites", "feat2.p": "Save the cutest cats with one click — they stay in your browser.",
        "feat3.t": "Fast and light", "feat3.p": "No accounts, no ads, no clutter. Just you and the cats.",
        "feat4.t": "On every screen", "feat4.p": "Comfortable on phone, tablet and computer.",
        "btn.goGallery": "Go to gallery", "btn.backHome": "Back to home",
        "trust.noAds": "No ads", "trust.noAccounts": "No accounts",
        "trust.private": "Favorites stay in your browser", "trust.openApi": "Open API",
        "trust.openSource": "Out of passion, not for profit 💚",
        "foss.title": "Made with passion 💚",
        "foss.note": "Hi! 👋 CatNet is my after-hours project — built just for fun and out of love for cats, in an open-source spirit: open and transparent. No ads, no accounts, and your favorites and history are stored only in your browser. Just cats and good vibes. 🐾",
        "footer.github": "Code on GitHub",
        "trusted.title": "Trusted by cat lovers ❤️",
        "trusted.sub": "Join thousands of cat lovers who come back every day for a smile.",
        "trusted.s1n": "12,000+", "trusted.s1l": "happy users",
        "trusted.s2n": "1,000,000+", "trusted.s2l": "cats shown",
        "trusted.s3n": "4.9/5", "trusted.s3l": "average rating",
        "trusted.q1": "“The best place for a little relaxation during the day.”", "trusted.q1a": "— Anna",
        "trusted.q2": "“I come back every day — the cats always cheer me up!”", "trusted.q2a": "— Mark",
        "trusted.q3": "“Simple, pretty and ad-free. Just the way it should be.”", "trusted.q3a": "— Kate",
        "set.title": "⚙️ Settings", "set.themeColor": "Theme color", "set.mode": "Mode",
        "set.dark": "🌙 Dark", "set.light": "☀️ Light", "set.density": "Grid density",
        "set.comfortable": "Comfortable", "set.dense": "Dense", "set.perPage": "Cats per page (gallery)",
        "set.slideshow": "🎞️ Slideshow (auto)", "set.quickActions": "Quick actions",
        "set.surprise": "🎁 Surprise — random cat", "set.clearFavs": "🗑️ Clear favorites",
        "set.reset": "↺ Restore defaults", "set.backup": "Data & backup",
        "set.export": "⬇️ Export favorites + history (JSON · Base64)", "set.copyExport": "📋 Copy export code",
        "set.importFile": "⬆️ Import from file", "set.importCode": "📥 Import from code",
        "set.clearHistory": "🧹 Clear history", "set.language": "Language",
        "set.premium": "Premium & referrals", "set.premiumBtn": "👑 Premium cats",
        "set.referralBtn": "🎁 Referral code",
        "pg.title": "🐾 Your progress", "pg.level": "Level", "pg.dailyGoal": "Daily goal",
        "pg.catsToday": "cats today", "pg.streakHint": "Your streak — come back tomorrow to keep it going!",
        "pg.days": "days", "pg.showTutorial": "▶️ Show tutorial",
        "onb.s1t": "Welcome to CatNet!", "onb.s1p": "The cutest cats on the web are waiting. We'll show you how it works in a few seconds.",
        "onb.s2t": "Discover cats", "onb.s2p": "Refresh the gallery and watch new cats endlessly — every click is a fresh dose of purring.",
        "onb.s3t": "Collect favorites", "onb.s3p": "Click the heart on a photo to save the cutest cats to your collection.",
        "onb.s4t": "Premium cats 👑", "onb.s4p": "Get a friend's referral code and unlock special premium cats from Cataas!",
        "onb.goalCalm": "Easy", "onb.goalCalmD": "3 cats a day",
        "onb.goalStd": "Standard", "onb.goalStdD": "10 cats a day",
        "onb.goalHard": "Hardcore", "onb.goalHardD": "20 cats a day",
        "onb.next": "Next", "onb.back": "Back", "onb.start": "Let's go! 🚀",
        "toast.resetSettings": "Default settings restored", "toast.noFavs": "No favorites to remove",
        "toast.favsCleared": "Favorite cats removed", "toast.downloaded": "Photo downloaded 🐾",
        "toast.shareCopied": "Photo link copied 🔗", "toast.exported": "Data exported (JSON in Base64) ⬇️",
        "toast.copied": "Export code copied 📋", "toast.imported": "Data imported ✅",
        "toast.importErr": "Invalid code / import file ❌", "toast.historyCleared": "History cleared",
        "toast.ipStart": "🔄 Unblocking your IP address...", "toast.ipDone": "✅ Your IP address has been successfully unblocked!",
        "toast.goalDone": "🎯 Daily goal reached! +50 XP 🎉", "toast.levelUp": "🎉 Level {n}! Keep it up!",
        "toast.streak1": "🔥 Streak: {n} day! +15 XP", "toast.streak": "🔥 Streak: {n} days! +15 XP",
        "toast.onbDone": "Have fun on CatNet! 🐾 +20 XP", "toast.premiumOn": "👑 Premium mode unlocked!",
        "blocked.title": "Can't display the cats",
        "blocked.text": "It looks like your browser or <strong>AdBlock</strong> is blocking the connection. Turn off ad blocking and refresh the page — otherwise the cats won't load.",
        "blocked.retry": "Try again 🔄",
        "adblock.banner": "🚫 It looks like you have <strong>AdBlock</strong> enabled — the cats may not show up. Disable blocking and refresh the page.",
        "lightbox.fav": "♡ Favorite", "lightbox.favOn": "♥ In favorites", "lightbox.download": "⬇️ Download", "lightbox.share": "🔗 Share",
        "empty.favs": "You don't have any favorite cats yet. Click the heart on a photo to save them here. 🐾",
        "premium.title": "👑 Premium cats", "premium.locked": "Premium cats from Cataas are locked. Unlock them by entering a friend's referral code!",
        "premium.unlocked": "You have access to premium cats! 👑", "premium.show": "Show premium cats 👑",
        "ref.title": "🎁 Referral code", "ref.yourCode": "Your referral code:",
        "ref.share": "Share this code with friends. When someone enters it, you both get a bonus!",
        "ref.enterLabel": "Got a code from a friend? Enter it:", "ref.redeem": "Claim bonus",
        "ref.copy": "📋 Copy my code",
        "toast.refCopied": "Your code copied 📋", "toast.refOwn": "That's your own code 🙂",
        "toast.refUsed": "This code has already been used", "toast.refInvalid": "Invalid referral code",
        "toast.refOk": "🎉 Bonus claimed! +150 XP and premium cats unlocked 👑"
    }
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
            <h3>${t("set.title")}</h3>
            <button class="icon-btn" onclick="closeSettings()">✕</button>
        </div>

        <div class="setting-group">
            <label>${t("set.language")}</label>
            <div class="seg" id="lang-seg">
                <button data-lang="auto">Auto</button>
                <button data-lang="pl">Polski</button>
                <button data-lang="en">English</button>
            </div>
        </div>

        <div class="setting-group">
            <label>${t("set.themeColor")}</label>
            <div class="swatches" id="accent-swatches">${swatches}</div>
        </div>

        <div class="setting-group">
            <label>${t("set.mode")}</label>
            <div class="seg" id="mode-seg">
                <button data-mode="dark">${t("set.dark")}</button>
                <button data-mode="light">${t("set.light")}</button>
            </div>
        </div>

        <div class="setting-group">
            <label>${t("set.density")}</label>
            <div class="seg" id="density-seg">
                <button data-density="comfortable">${t("set.comfortable")}</button>
                <button data-density="dense">${t("set.dense")}</button>
            </div>
        </div>

        <div class="setting-group">
            <label>${t("set.perPage")}</label>
            <div class="range-row">
                <input type="range" id="perpage-range" min="4" max="20" step="1">
                <span class="val" id="perpage-val">8</span>
            </div>
        </div>

        <div class="setting-group">
            <div class="switch-row">
                <span>${t("set.slideshow")}</span>
                <label class="switch">
                    <input type="checkbox" id="autorefresh-toggle">
                    <span class="slider"></span>
                </label>
            </div>
        </div>

        <div class="setting-group">
            <label>${t("set.quickActions")}</label>
            <button class="btn btn-ghost btn-block" onclick="surpriseCat()">${t("set.surprise")}</button>
            <button class="btn btn-ghost btn-block" onclick="clearFavorites()">${t("set.clearFavs")}</button>
            <button class="btn btn-ghost btn-block" onclick="resetSettings()">${t("set.reset")}</button>
        </div>

        <div class="setting-group">
            <label>${t("set.backup")}</label>
            <button class="btn btn-ghost btn-block" onclick="exportData()">${t("set.export")}</button>
            <button class="btn btn-ghost btn-block" onclick="copyExport()">${t("set.copyExport")}</button>
            <button class="btn btn-ghost btn-block" onclick="importData()">${t("set.importFile")}</button>
            <button class="btn btn-ghost btn-block" onclick="importFromText()">${t("set.importCode")}</button>
            <button class="btn btn-ghost btn-block" onclick="clearHistory()">${t("set.clearHistory")}</button>
            <input type="file" id="import-file" accept=".json,.txt,application/json" style="display:none" onchange="handleImportFile(this)">
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    // Zdarzenia
    drawer.querySelectorAll("[data-lang]").forEach((b) =>
        b.addEventListener("click", () => setLang(b.dataset.lang))
    );
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
    document.querySelectorAll("#lang-seg button").forEach((b) =>
        b.classList.toggle("active", b.dataset.lang === (s.lang || "auto"))
    );
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
    const lang = getSettings().lang;
    saveSettings({ ...defaultSettings, lang });
    applySettings();
    showToast(t("toast.resetSettings"));
}

function clearFavorites() {
    if (getFavorites().length === 0) {
        showToast(t("toast.noFavs"));
        return;
    }
    if (!confirm(t("toast.favsCleared") + "?")) return;
    localStorage.removeItem("catnet_favorites");
    updateFavCounter();
    renderFavorites("fav-grid");
    document.querySelectorAll(".fav-btn.is-fav").forEach((b) => {
        b.classList.remove("is-fav");
        b.innerHTML = "♡";
    });
    showToast(t("toast.favsCleared"));
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
            <button class="btn btn-primary" id="lightbox-fav" onclick="lightboxToggleFav()">${t("lightbox.fav")}</button>
            <button class="btn btn-ghost" onclick="downloadImage(lightboxUrl)">${t("lightbox.download")}</button>
            <button class="btn btn-ghost" onclick="shareImage(lightboxUrl)">${t("lightbox.share")}</button>
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
    btn.innerHTML = fav ? t("lightbox.favOn") : t("lightbox.fav");
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
        showToast(t("toast.downloaded"));
    } catch {
        window.open(url, "_blank");
    }
}

async function shareImage(url) {
    if (navigator.share) {
        try {
            await navigator.share({ title: "CatNet", text: "Look at this cat!", url });
            return;
        } catch { /* anulowano */ }
    }
    try {
        await navigator.clipboard.writeText(url);
        showToast(t("toast.shareCopied"));
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
function admToggleFallbackBtn() {
    forceFallback = !forceFallback;
    refreshCats();
    showToast(forceFallback ? "Tryb awaryjny: WŁ" : "Tryb awaryjny: WYŁ");
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
    el.innerText =
        `ulubione: ${getFavorites().length}\n` +
        `historia: ${getHistory().length}\n` +
        `język: ${LANG} (${s.lang})\n` +
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
    showToast(t("toast.historyCleared"));
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
    showToast(t("toast.exported"));
}

async function copyExport() {
    const b64 = toB64(JSON.stringify(buildExportPayload()));
    try {
        await navigator.clipboard.writeText(b64);
        showToast(t("toast.copied"));
    } catch {
        prompt("Base64:", b64);
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
        showToast(t("toast.imported"));
    } catch {
        showToast(t("toast.importErr"));
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
        <h3>${t("blocked.title")}</h3>
        <p>${t("blocked.text")}</p>
        <button class="btn btn-primary" onclick="loadCats('cat-grid', currentLimit)">${t("blocked.retry")}</button>
    `;
    grid.appendChild(note);
}

function showAdblockBanner() {
    if (document.getElementById("adblock-banner")) return;
    const b = document.createElement("div");
    b.id = "adblock-banner";
    b.className = "adblock-banner";
    b.innerHTML = `${t("adblock.banner")}
        <button title="✕" onclick="this.parentElement.remove()">✕</button>`;
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

/* „Odblokuj IP” — sekretne menu */
function unblockIP() {
    showToast(t("toast.ipStart"));
    setTimeout(() => {
        showToast(t("toast.ipDone"));
        if (document.getElementById("cat-grid")) loadCats("cat-grid", currentLimit);
    }, 1800);
}

/* ---------- Pasek nawigacji: hamburger (mobile) ---------- */
function buildNavExtras() {
    document.querySelectorAll(".nav-tools").forEach((tools) => {
        if (tools.querySelector(".hamburger")) return;
        const nav = tools.querySelector(".nav-links");
        const burger = document.createElement("button");
        burger.className = "icon-btn hamburger";
        burger.title = "Menu";
        burger.innerHTML = "☰";
        burger.addEventListener("click", () => nav.classList.toggle("open"));
        tools.appendChild(burger);
    });
}

/* ===========================================================
   ONBOARDING (prosty samouczek powitalny)
   =========================================================== */
const ONB_KEY = "catnet_seen_onb";
const onbSlides = [
    { m: "🐱", h: "onb.s1t", p: "onb.s1p" },
    { m: "🔄", h: "onb.s2t", p: "onb.s2p" },
    { m: "❤️", h: "onb.s3t", p: "onb.s3p" }
];
let onbIndex = 0;

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
    document.getElementById("onb-card").innerHTML = `
        <div class="onb-mascot">${s.m}</div>
        <h2>${t(s.h)}</h2>
        <p>${t(s.p)}</p>
        <div class="onb-dots">${dots}</div>
        <div class="onb-actions">
            ${onbIndex > 0 ? `<button class="btn btn-ghost" onclick="onbPrev()">${t("onb.back")}</button>` : ``}
            <button class="btn btn-primary" onclick="onbNext()">${last ? t("onb.start") : t("onb.next")}</button>
        </div>
    `;
}
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
    renderOnb();
    document.getElementById("onboarding").classList.add("open");
}
function finishOnboarding() {
    localStorage.setItem(ONB_KEY, "1");
    document.getElementById("onboarding").classList.remove("open");
}
function maybeShowOnboarding() {
    if (!localStorage.getItem(ONB_KEY)) setTimeout(showOnboarding, 600);
}

/* ===========================================================
   NOWOCZESNE DODATKI: szkielety, „do góry”
   =========================================================== */
function showSkeletons(grid, n) {
    if (!grid) return;
    for (let i = 0; i < n; i++) {
        const s = document.createElement("div");
        s.className = "cat-card skeleton";
        grid.appendChild(s);
    }
}

/* Koty PRO (Cataas) — za darmo dla wszystkich */
async function loadProCats(gridId = "cat-grid", limit = currentLimit) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = "";
    showSkeletons(grid, limit);
    try {
        const skip = Math.floor(Math.random() * 300);
        const res = await fetch(`https://cataas.com/api/cats?limit=${limit}&skip=${skip}`);
        const data = await res.json();
        if (!data || !data.length) throw new Error("Cataas pusto");
        grid.innerHTML = "";
        data.forEach((c) => createCatElement(grid, `https://cataas.com/cat/${c._id || c.id}`));
    } catch {
        grid.innerHTML = "";
        for (let i = 0; i < limit; i++) createCatElement(grid, `https://cataas.com/cat?ts=${Date.now() + i}`);
    }
    showToast(t("toast.pro"));
}
function showProCats() {
    if (!document.getElementById("cat-grid")) {
        location.href = "galeria.html";
        return;
    }
    loadProCats("cat-grid", currentLimit);
}

function buildBackToTop() {
    if (document.getElementById("to-top")) return;
    const b = document.createElement("button");
    b.id = "to-top";
    b.className = "to-top";
    b.innerHTML = "↑";
    b.title = "↑";
    b.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.body.appendChild(b);
    window.addEventListener("scroll", () => b.classList.toggle("show", window.scrollY > 400));
}

/* ===========================================================
   INICJALIZACJA WSPÓLNA
   =========================================================== */
document.addEventListener("DOMContentLoaded", function () {
    LANG = detectLang();
    buildSettingsDrawer();
    buildLightbox();
    buildOnboarding();
    buildNavExtras();
    buildBackToTop();
    applySettings();
    applyI18n();
    detectAdblock();

    const toggle = document.getElementById("settings-toggle");
    if (toggle) toggle.addEventListener("click", openSettings);

    // Sekretne wejście z innej strony
    if (sessionStorage.getItem("catnet_open_secret") === "1") {
        sessionStorage.removeItem("catnet_open_secret");
        setTimeout(openSecretMenu, 400);
    }

    maybeShowOnboarding();

    document.addEventListener("keydown", (e) => {
        handleSecretKey(e);
        if (e.key === "Escape") {
            closeSettings();
            closeLightbox();
        }
    });
});
