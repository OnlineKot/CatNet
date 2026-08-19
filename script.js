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

/* ---------- Ulubione koty (zapis w przeglądarce, per konto) ---------- */
function favKey() { return "catnet_favorites"; }
function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(favKey()) || "[]");
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
    localStorage.setItem(favKey(), JSON.stringify(favs));
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
    img.decoding = "async";
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => {
        if (getSettings().meow) playMeow();
        registerCatClick();
        openLightbox(url);
    });

    const fav = document.createElement("button");
    fav.className = "fav-btn" + (isFavorite(url) ? " is-fav" : "");
    fav.type = "button";
    fav.title = "Dodaj do ulubionych";
    fav.innerHTML = isFavorite(url) ? "♥" : "♡";
    fav.addEventListener("click", () => {
        const added = toggleFavorite(url);
        fav.classList.toggle("is-fav", added);
        fav.innerHTML = added ? "♥" : "♡";
        if (added) heartBurst(card);
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
    if (tClicks === 8) openSecretMenu();
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

/* Najsłodszy kot na świecie — prawdziwy Freud */
const FREUD_IMG = "freud.jpeg";
function loadSweetCat() {
    const grid = document.getElementById("sweet-grid");
    if (!grid) return;
    grid.innerHTML = "";
    createCatElement(grid, FREUD_IMG);
}

/* ===========================================================
   USTAWIENIA UŻYTKOWNIKA (motywy, tryb, gęstość, liczba kotów)
   =========================================================== */

const ACCENTS = {
    apple:  { a: "#0a84ff", b: "#0a84ff", grad: "linear-gradient(120deg,#0a84ff,#5ac8fa)" },
    aurora: { a: "#7c5cff", b: "#ff5ca8", grad: "linear-gradient(120deg,#7c5cff 0%,#5cc8ff 50%,#ff5ca8 100%)" },
    ocean:  { a: "#2bb7ff", b: "#5cf0d0", grad: "linear-gradient(120deg,#2bb7ff,#5cf0d0)" },
    sunset: { a: "#ff8a3c", b: "#ff4d6d", grad: "linear-gradient(120deg,#ff8a3c,#ff4d6d)" },
    forest: { a: "#27c46b", b: "#8ef0a0", grad: "linear-gradient(120deg,#27c46b,#8ef0a0)" },
    candy:  { a: "#ff5ca8", b: "#ffd34d", grad: "linear-gradient(120deg,#ff5ca8,#ffd34d)" },
    mono:   { a: "#9aa0c0", b: "#cfd4ec", grad: "linear-gradient(120deg,#9aa0c0,#cfd4ec)" }
};

const SETTINGS_KEY = "catnet_settings";
const defaultSettings = {
    accent: "apple",
    mode: "dark",
    density: "comfortable",
    perPage: 8,
    autoRefresh: false,
    meow: false,
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
        "nav.start": "Start", "nav.gallery": "Galeria", "nav.facts": "Fakty", "nav.quiz": "Quiz", "nav.about": "O nas",
        "quizcta.title": "Czy jesteś kotem?",
        "quizcta.sub": "Sześć pytań o całkiem ludzkie nawyki, a na końcu poznasz, ile procent kota w Tobie siedzi. Wynik aż prosi się, by wysłać go znajomym.",
        "quizcta.btn": "Sprawdź się",
        "footer.made": "Stworzone z miłości do kotów",
        "hero.badge": "🎉 Nowość: Koty BIO i strona Faktów!",
        "marquee.items": "Zatrzymaj się na chwilę i pooglądaj koty.  ·  Każde odświeżenie to nowy pyszczek.  ·  Cieszymy się, że tu zajrzałeś.  ·  ",
        "rm.title": "Co dalej? Mapa mruczeń 🚀",
        "rm.sub": "CatNet dopiero się rozkręca. Oto, nad czym pracujemy — każda aktualizacja będzie większa od poprzedniej.",
        "rm.soon": "WKRÓTCE",
        "rm1t": "Meow Mode", "rm1d": "Kliknij kota i usłysz prawdziwe miau. Tryb, którego nikt nie potrzebował, a każdy chce.",
        "rm2t": "Kot Dnia", "rm2d": "Codziennie o północy nowy wyjątkowy kot. Wpadasz, oglądasz, dzień od razu lepszy.",
        "rm3t": "Quiz: Jakim kotem jesteś?", "rm3d": "Kilka pytań i poznasz swoje kocie alter ego. Wyniki idealne do wysłania znajomym.",
        "rm4t": "Tapety z kotami", "rm4d": "Najlepsze koty w wysokiej jakości — jedno kliknięcie i masz nową tapetę na telefon.",
        "rm5t": "CatNet w kieszeni", "rm5d": "Zainstaluj CatNet jak aplikację i miej koty zawsze przy sobie — nawet bez internetu.",
        "rm6t": "Galeria Freuda", "rm6d": "Więcej zdjęć najsłodszego kota na świecie. Tego chcieliście — to dostaniecie.",
        "hero.h1": 'Najsłodsze <span class="grad">koty</span><br>w całej sieci 🐱',
        "hero.p": "Cześć! 👋 Tu CatNet — miejsce, w którym zawsze czeka na Ciebie świeża porcja mruczących cudaków. Klikasz, oglądasz, uśmiechasz się. Tyle.",
        "greet.morning": "Dzień dobry! ☀️ Idealna pora na pierwszego kota.",
        "greet.day": "Hej! 😺 Przerwa na kota jeszcze nikomu nie zaszkodziła.",
        "greet.evening": "Dobry wieczór! 🌙 Czas na wieczorną porcję mruczenia.",
        "greet.night": "Nie śpisz? 🦉 Koty też nie. Idealnie się składa.",
        "btn.browseGallery": "Przeglądaj galerię", "btn.showNewCats": "Pokaż nowe koty",
        "fact.label": "Ciekawostka o kotach",
        "home.todayTitle": "Koty na dziś", "home.todaySub": "Mały podgląd tego, co czeka na Ciebie w galerii.",
        "gallery.title": "Galeria kotów 🐱",
        "gallery.sub": "Odświeżaj, ile chcesz — kotów nigdy nie zabraknie. Kliknij serduszko, by zapisać ulubione.",
        "btn.newCats": "Nowe koty 🔄", "btn.surprise": "🎁 Niespodzianka", "btn.premium": "👑 Koty premium",
        "btn.pro": "Koty BIO", "toast.pro": "Załadowano koty BIO (naturalne zdjęcia)",
        "gallery.allBreeds": "Wszystkie rasy", "gallery.favCount": "Twoje ulubione:",
        "gallery.favTitle": "Twoje ulubione ♥", "gallery.favSub": "Koty, które zapisałeś. Zapisują się w Twojej przeglądarce.",
        "facts.title": 'Fakty o <span class="grad">kotach</span> 🐾',
        "facts.sub": "Klikaj i odkrywaj — za każdym razem coś nowego o naszych mruczących przyjaciołach.",
        "facts.didYouKnow": "Czy wiesz, że...", "btn.nextFact": "Następny fakt ✨",
        "facts.sweetTitle": "Freud",
        "facts.sweetSub": "Freud to czarny kot o wielkim sercu i jeszcze większym apetycie na drzemki. Mieszka tam, gdzie trawa jest najwyższa, a słońce najcieplejsze, i każdy dzień zaczyna od porządnego przeciągnięcia się oraz obchodu swojego terytorium. Najbardziej lubi spacery po ogrodzie, polowanie na liście niesione wiatrem, wylegiwanie się w nagrzanej trawie i obserwowanie ptaków zza szyby. Ma miękkie, lśniące futro, spokojne spojrzenie i charakter, który topi serca wszystkich dookoła — potrafi być niezależnym łowcą, a chwilę później największym przytulasem pod słońcem. Gdy Freud mruczy, nawet najgorszy dzień robi się od razu znośniejszy. Nie potrzebuje filtrów, studia ani profesjonalnej sesji — jest najsłodszym kotem na świecie w każdych, najzupełniej naturalnych warunkach. I właśnie dlatego trafił tutaj, na honorowe miejsce w CatNet.",
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
        "trust.noAds": "Bez reklam", "trust.noAccounts": "Bez logowania",
        "trust.private": "Ulubione tylko w Twojej przeglądarce", "trust.openApi": "Otwarte API",
        "trust.openSource": "Z pasji, nie dla zysku 💚",
        "cookie.title": "Zanim zaczniemy — pliki cookie 🍪",
        "cookie.accept": "Akceptuję",
        "cookie.reject": "Odrzuć",
        "cookie.footer": "Pliki cookie 🍪",
        "cookie.savedYes": "Dzięki! Anonimowa analityka włączona 🍪",
        "cookie.savedNo": "Zapisano. Analityka wyłączona 🚫",
        "cookie.body": "<p>Ta strona, CatNet, używa plików cookie oraz podobnych technologii (w tym pamięci lokalnej przeglądarki, tzw. localStorage) w celu zapewnienia podstawowego działania serwisu, a także — wyłącznie za Twoją wyraźną zgodą — do anonimowej analityki odwiedzin.</p><p>Pliki cookie to niewielkie pliki tekstowe zapisywane na Twoim urządzeniu. Pozwalają one zapamiętać Twoje preferencje, takie jak wybrany motyw kolorystyczny, tryb jasny lub ciemny, język interfejsu, gęstość siatki, lista ulubionych kotów oraz historia przeglądanych zdjęć. Te dane pozostają w Twojej przeglądarce i nie są wysyłane na serwery reklamowe.</p><p>Do celów statystycznych wykorzystujemy narzędzie Microsoft Clarity, które w sposób zbiorczy i anonimowy rejestruje między innymi liczbę odwiedzin, kliknięcia, ruchy kursora oraz ogólne wzorce korzystania ze strony, aby pomóc nam ją ulepszać. Narzędzie to może zapisywać własne pliki cookie w Twojej przeglądarce.</p><p>Jeżeli klikniesz „Odrzuć”, analityka Microsoft Clarity nie zostanie w ogóle uruchomiona, a ewentualne wcześniej zapisane pliki cookie tego narzędzia zostaną usunięte. Strona będzie działać dokładnie tak samo — po prostu nie zbierzemy żadnych danych statystycznych. Jeżeli klikniesz „Akceptuję”, wyrażasz zgodę na uruchomienie opisanej powyżej, w pełni anonimowej analityki.</p><p>Twój wybór zostanie zapamiętany w Twojej przeglądarce, dzięki czemu nie będziemy pytać ponownie przy każdej wizycie. Możesz go zmienić w dowolnej chwili, klikając odnośnik „Pliki cookie” w stopce strony. Nie sprzedajemy Twoich danych, nie wyświetlamy reklam i nie budujemy profili marketingowych. Dziękujemy za przeczytanie tego celowo długiego i niezbyt porywającego, lecz koniecznego dokumentu. 🐾</p>",
        "foss.title": "Zrobione z pasji 💚",
        "foss.note": "Cześć! 👋 CatNet to mój projekt po godzinach — robię go dla zabawy i z miłości do kotów, w duchu open source: otwarcie i przejrzyście. Bez reklam i bez logowania. Ulubione i historia zostają w Twojej przeglądarce. Do ulepszania strony używam anonimowej analityki (Microsoft Clarity) — tylko za Twoją zgodą. 🐾",
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
        "set.slideshow": "🎞️ Pokaz slajdów (auto)", "set.meow": "🔊 Meow Mode (miau przy kliknięciu)", "set.quickActions": "Szybkie akcje",
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
        "nav.start": "Home", "nav.gallery": "Gallery", "nav.facts": "Facts", "nav.quiz": "Quiz", "nav.about": "About",
        "quizcta.title": "Are you a cat?",
        "quizcta.sub": "Six questions about your very human habits, and in the end you'll learn what percent cat you are. A result made for sharing with friends.",
        "quizcta.btn": "Test yourself",
        "footer.made": "Made with love for cats",
        "hero.badge": "🎉 New: BIO cats & the Facts page!",
        "marquee.items": "Take a moment and just look at some cats.  ·  Every refresh brings a new little face.  ·  We're glad you stopped by.  ·  ",
        "rm.title": "What's next? The purr roadmap 🚀",
        "rm.sub": "CatNet is just getting started. Here's what we're working on — every update will be bigger than the last.",
        "rm.soon": "SOON",
        "rm1t": "Meow Mode", "rm1d": "Click a cat and hear a real meow. The mode nobody needed and everybody wants.",
        "rm2t": "Cat of the Day", "rm2d": "A new special cat every midnight. Drop by, take a look, day instantly better.",
        "rm3t": "Quiz: Which cat are you?", "rm3d": "A few questions and you'll meet your feline alter ego. Results made for sharing.",
        "rm4t": "Cat wallpapers", "rm4d": "The best cats in high quality — one click and you've got a new phone wallpaper.",
        "rm5t": "CatNet in your pocket", "rm5d": "Install CatNet like an app and keep cats with you — even offline.",
        "rm6t": "Freud's gallery", "rm6d": "More photos of the cutest cat in the world. You asked — you'll get it.",
        "hero.h1": 'The cutest <span class="grad">cats</span><br>on the whole web 🐱',
        "hero.p": "Hi! 👋 This is CatNet — a place where a fresh batch of purring cuties is always waiting for you. You click, you look, you smile. That's it.",
        "greet.morning": "Good morning! ☀️ The perfect time for your first cat.",
        "greet.day": "Hey! 😺 A cat break never hurt anybody.",
        "greet.evening": "Good evening! 🌙 Time for your evening dose of purring.",
        "greet.night": "Can't sleep? 🦉 Neither can the cats. Perfect match.",
        "btn.browseGallery": "Browse gallery", "btn.showNewCats": "Show new cats",
        "fact.label": "Cat fact",
        "home.todayTitle": "Cats for today", "home.todaySub": "A little preview of what's waiting for you in the gallery.",
        "gallery.title": "Cat gallery 🐱",
        "gallery.sub": "Refresh as much as you like — there are endless cats. Click the heart to save your favorites.",
        "btn.newCats": "New cats 🔄", "btn.surprise": "🎁 Surprise", "btn.premium": "👑 Premium cats",
        "btn.pro": "BIO cats", "toast.pro": "Loaded BIO cats (natural photos)",
        "gallery.allBreeds": "All breeds", "gallery.favCount": "Your favorites:",
        "gallery.favTitle": "Your favorites ♥", "gallery.favSub": "Cats you've saved. They're stored in your browser.",
        "facts.title": 'Facts about <span class="grad">cats</span> 🐾',
        "facts.sub": "Click and discover — something new about our purring friends every time.",
        "facts.didYouKnow": "Did you know...", "btn.nextFact": "Next fact ✨",
        "facts.sweetTitle": "Freud",
        "facts.sweetSub": "Freud is a black cat with a huge heart and an even bigger appetite for naps. He lives where the grass is tallest and the sun is warmest, and he starts every day with a proper stretch and a patrol of his territory. His favourite things are wandering the garden, hunting leaves carried by the wind, lounging in the warm grass and watching birds through the window. He has soft, glossy fur, a calm gaze and a personality that melts everyone's heart — one moment an independent hunter, the next the biggest cuddler under the sun. When Freud purrs, even the worst day instantly gets better. He needs no filters, no studio and no professional photoshoot — he is the cutest cat in the world in the most natural conditions imaginable. And that's exactly why he earned his place of honour here on CatNet.",
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
        "trust.noAds": "No ads", "trust.noAccounts": "No login",
        "trust.private": "Favorites stay in your browser", "trust.openApi": "Open API",
        "trust.openSource": "Out of passion, not for profit 💚",
        "cookie.title": "Before we start — cookies 🍪",
        "cookie.accept": "Accept",
        "cookie.reject": "Reject",
        "cookie.footer": "Cookies 🍪",
        "cookie.savedYes": "Thanks! Anonymous analytics on 🍪",
        "cookie.savedNo": "Saved. Analytics turned off 🚫",
        "cookie.body": "<p>This website, CatNet, uses cookies and similar technologies (including your browser's local storage, known as localStorage) to provide the site's core functionality and — only with your explicit consent — for anonymous visitor analytics.</p><p>Cookies are small text files stored on your device. They let us remember your preferences, such as the chosen colour theme, light or dark mode, interface language, grid density, your list of favourite cats and your browsing history. This data stays in your browser and is never sent to advertising servers.</p><p>For statistical purposes we use Microsoft Clarity, which records — in an aggregated, anonymous way — things like the number of visits, clicks, cursor movements and general usage patterns, to help us improve the site. This tool may store its own cookies in your browser.</p><p>If you click „Reject”, Microsoft Clarity analytics will not run at all, and any previously stored cookies from that tool will be removed. The site will work exactly the same — we simply won't collect any statistics. If you click „Accept”, you consent to running the fully anonymous analytics described above.</p><p>Your choice is remembered in your browser, so we won't ask again on every visit. You can change it at any time by clicking the „Cookies” link in the page footer. We do not sell your data, show ads, or build marketing profiles. Thank you for reading this deliberately long and not-very-thrilling but necessary document. 🐾</p>",
        "foss.title": "Made with passion 💚",
        "foss.note": "Hi! 👋 CatNet is my after-hours project — built for fun and out of love for cats, in an open-source spirit: open and transparent. No ads and no login. Your favorites and history stay in your browser. I use anonymous analytics (Microsoft Clarity) to improve the site — only with your consent. 🐾",
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
        "set.slideshow": "🎞️ Slideshow (auto)", "set.meow": "🔊 Meow Mode (meow on click)", "set.quickActions": "Quick actions",
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
            <div class="switch-row">
                <span>${t("set.meow")}</span>
                <label class="switch">
                    <input type="checkbox" id="meow-toggle">
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
    drawer.querySelector("#meow-toggle").addEventListener("change", (e) => {
        setSetting("meow", e.target.checked);
        if (e.target.checked) playMeow();
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
    const meow = document.getElementById("meow-toggle");
    if (meow) meow.checked = s.meow;
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
    localStorage.removeItem(favKey());
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
    // Udostępniamy stronę CatNet, NIE bezpośredni link do CDN ze zdjęciem
    const shareUrl = location.origin + location.pathname;
    const text = (LANG === "en"
        ? "🐾 Look at this adorable cat on CatNet!"
        : "🐾 Zobacz tego uroczego kota na CatNet!");
    if (navigator.share) {
        try {
            await navigator.share({ title: "CatNet", text, url: shareUrl });
            return;
        } catch { /* anulowano */ }
    }
    try {
        await navigator.clipboard.writeText(text + " " + shareUrl);
        showToast(t("toast.shareCopied"));
    } catch {
        window.open(shareUrl, "_blank");
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
            localStorage.setItem(favKey(), JSON.stringify(data.favorites));
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

/* ===========================================================
   KREATOR STRONY POWITALNEJ (link z imieniem w b64) + Meow Mode
   =========================================================== */
function welcomeLinkFor(name) {
    const base = location.origin + location.pathname.replace(/[^/]*$/, "") + "index.html";
    return base + "?hi=" + encodeURIComponent(toB64(name));
}
function admMakeWelcome() {
    const name = (document.getElementById("adm-welcome-name")?.value || "").trim();
    if (!name) { showToast("Wpisz imię gościa"); return; }
    const link = welcomeLinkFor(name);
    const out = document.getElementById("adm-welcome-link");
    if (out) out.value = link;
    showToast("Link powitalny gotowy 💌");
}
function admCopyWelcome() {
    const out = document.getElementById("adm-welcome-link");
    if (!out || !out.value) { admMakeWelcome(); return; }
    navigator.clipboard?.writeText(out.value).then(
        () => showToast("Skopiowano link 📋"),
        () => { out.select(); }
    );
}
function admOpenWelcome() {
    const out = document.getElementById("adm-welcome-link");
    if (!out || !out.value) { admMakeWelcome(); }
    if (out && out.value) window.open(out.value, "_blank");
}

/* Spersonalizowane powitanie, gdy w adresie jest ?hi=<b64(imię)> */
function checkWelcomeParam() {
    try {
        const hi = new URLSearchParams(location.search).get("hi");
        if (!hi) return;
        const name = fromB64(decodeURIComponent(hi)).slice(0, 40);
        if (!name) return;
        const el = document.getElementById("hero-greet");
        if (el) el.innerText = (LANG === "en" ? `Hi ${name}! 👋 Welcome to CatNet` : `Cześć ${name}! 👋 Witaj w CatNet`);
        setTimeout(() => showToast(LANG === "en" ? `Welcome, ${name}! 🐾` : `Witaj, ${name}! 🐾`), 500);
    } catch {}
}

/* Meow Mode — klik w kota odtwarza syntezowane „miau” */
let audioCtx = null;
function playMeow() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioCtx;
        if (ctx.state === "suspended") ctx.resume();
        const now = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 2200;
        o.type = "sawtooth";
        o.frequency.setValueAtTime(620, now);
        o.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        o.frequency.exponentialRampToValueAtTime(520, now + 0.42);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.22, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = 16;
        lg.gain.value = 22;
        lfo.connect(lg);
        lg.connect(o.frequency);
        o.connect(lp);
        lp.connect(g);
        g.connect(ctx.destination);
        o.start(now);
        lfo.start(now);
        o.stop(now + 0.52);
        lfo.stop(now + 0.52);
    } catch {}
}

/* ---------- Pasek nawigacji: hamburger (mobile) ---------- */
function buildNavExtras() {
    document.querySelectorAll(".nav-tools").forEach((tools) => {
        if (tools.querySelector(".hamburger")) return;
        const nav = tools.querySelector(".nav-links");
        const burger = document.createElement("button");
        burger.className = "icon-btn hamburger";
        burger.setAttribute("aria-label", "Menu");
        burger.innerHTML = '<span class="bars"></span>';
        burger.addEventListener("click", () => {
            const open = nav.classList.toggle("open");
            burger.classList.toggle("open", open);
        });
        // Zamknij menu po kliknięciu w link
        nav.querySelectorAll("a").forEach((a) =>
            a.addEventListener("click", () => {
                nav.classList.remove("open");
                burger.classList.remove("open");
            })
        );
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

/* Powitanie zależne od pory dnia — bardziej po ludzku */
function heroGreeting() {
    const el = document.getElementById("hero-greet");
    if (!el) return;
    const h = new Date().getHours();
    const key = h < 5 ? "greet.night" : h < 12 ? "greet.morning" : h < 18 ? "greet.day" : "greet.evening";
    el.innerText = t(key);
}

/* Serduszko wystrzeliwuje z karty przy polubieniu */
function heartBurst(card) {
    if (!card) return;
    for (let i = 0; i < 3; i++) {
        const s = document.createElement("span");
        s.className = "heart-burst";
        s.textContent = "♥";
        s.style.left = 35 + Math.random() * 30 + "%";
        s.style.animationDelay = i * 0.08 + "s";
        card.appendChild(s);
        setTimeout(() => s.remove(), 1100);
    }
}

/* Marquee — przewijany pasek haseł (zawartość 2x dla pętli) */
function fillMarquee() {
    const track = document.getElementById("marquee-track");
    if (!track) return;
    const phrase = t("marquee.items");
    track.innerHTML = (phrase.repeat(3) + phrase.repeat(3));
}

/* Scroll reveal usunięty — sekcje są widoczne od razu (bez „odsłaniania”) */
function initReveal() {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
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
   QUIZ: „Jakim kotem jesteś?” — prawdziwa, działająca funkcja
   =========================================================== */
const QUIZ = {
    pl: {
        title: "Czy jesteś kotem?",
        sub: "Sześć pytań o całkiem ludzkie sprawy — a my policzymy, ile procent kota w Tobie siedzi.",
        start: "Sprawdźmy 🐾",
        of: "z",
        again: "Rozwiąż jeszcze raz",
        share: "Udostępnij wynik 🔗",
        copied: "Skopiowano wynik 🔗",
        resultLabel: "Werdykt:",
        scoreLabel: "Jesteś kotem w",
        q: [
            { q: "Jak zwykle zaczynasz dzień?", a: [
                { t: "Zrywam się skoro świt, pełen energii", v: 0 },
                { t: "Powoli — kawa i porządne przeciąganie", v: 2 },
                { t: "Zależy od humoru, różnie bywa", v: 1 },
                { t: "Wyłączam budzik i śpię dalej", v: 3 } ] },
            { q: "Ktoś niezapowiedziany dzwoni do drzwi:", a: [
                { t: "Otwieram od razu, super wizyta!", v: 0 },
                { t: "Sprawdzam, kto to, zanim zdecyduję", v: 1 },
                { t: "Niech chwilę poczekają", v: 2 },
                { t: "Udaję, że mnie nie ma", v: 3 } ] },
            { q: "Twój idealny sposób na popołudnie?", a: [
                { t: "Spotkanie ze znajomymi w mieście", v: 0 },
                { t: "Spacer i trochę ruchu", v: 1 },
                { t: "Kanapa, koc i przekąska", v: 2 },
                { t: "Drzemka w plamie słońca przy oknie", v: 3 } ] },
            { q: "Jak wygląda Twoje jedzenie w ciągu dnia?", a: [
                { t: "Stałe pory, wszystko zaplanowane", v: 0 },
                { t: "Regularnie, ale uwielbiam smakołyki", v: 1 },
                { t: "Jem głównie wtedy, gdy ktoś mi poda", v: 2 },
                { t: "Podjadam cały dzień, kiedy mam ochotę", v: 3 } ] },
            { q: "Widzisz puste pudełko po paczce:", a: [
                { t: "Składam i od razu wyrzucam", v: 0 },
                { t: "Odkładam, może się przyda", v: 1 },
                { t: "Muszę zajrzeć do środka", v: 2 },
                { t: "Mam ogromną ochotę w nim usiąść", v: 3 } ] },
            { q: "Jak okazujesz bliskim uczucia?", a: [
                { t: "Mówię wprost i ściskam na powitanie", v: 0 },
                { t: "Lubię towarzystwo, gdy mam nastrój", v: 1 },
                { t: "Drobnymi gestami, bez wielkich słów", v: 2 },
                { t: "Jestem blisko, ale wyłącznie na swoich zasadach", v: 3 } ] }
        ],
        tiers: [
            { min: 80, e: "🐱", n: "Zdecydowanie kot", d: "Nie ma żadnych wątpliwości — w środku jesteś kotem w niemal stu procentach. Drzemki, niezależność i ciepłe miejsca to Twój żywioł. Brakuje Ci tylko ogona i wąsów." },
            { min: 55, e: "😼", n: "Kot w ludzkim ciele", d: "Ludzka powłoka, kocia dusza. Robisz swoje, komfort cenisz ponad wszystko, a uczucia okazujesz wyłącznie na własnych warunkach. Mruczenie masz w zasięgu ręki." },
            { min: 30, e: "🙂", n: "Pół-kot, pół-człowiek", d: "Piękna równowaga. Lubisz ludzi i odrobinę ruchu, ale dobra drzemka i chwila tylko dla siebie też potrafią Cię uszczęśliwić. Kot w Tobie czasem mruga." },
            { min: 0,  e: "🧍", n: "Człowiek (na razie)", d: "Energiczny, towarzyski, poukładany — bardzo ludzkie cechy. Ale spokojnie: jeszcze kilka drzemek na słońcu i parę pudełek, a dołączysz do kociego klubu." }
        ]
    },
    en: {
        title: "Are you a cat?",
        sub: "Six questions about very human things — and we'll work out what percent cat you really are.",
        start: "Let's find out 🐾",
        of: "of",
        again: "Take it again",
        share: "Share result 🔗",
        copied: "Result copied 🔗",
        resultLabel: "The verdict:",
        scoreLabel: "You are",
        q: [
            { q: "How do you usually start your day?", a: [
                { t: "Up at dawn, full of energy", v: 0 },
                { t: "Slowly — coffee and a proper stretch", v: 2 },
                { t: "Depends on my mood, it varies", v: 1 },
                { t: "Turn off the alarm and sleep on", v: 3 } ] },
            { q: "Someone rings the doorbell unannounced:", a: [
                { t: "I open right away, great visit!", v: 0 },
                { t: "I check who it is before deciding", v: 1 },
                { t: "Let them wait a moment", v: 2 },
                { t: "I pretend I'm not home", v: 3 } ] },
            { q: "Your perfect way to spend an afternoon?", a: [
                { t: "Meeting friends in town", v: 0 },
                { t: "A walk and a bit of movement", v: 1 },
                { t: "Couch, blanket and a snack", v: 2 },
                { t: "A nap in a patch of sun by the window", v: 3 } ] },
            { q: "What does your eating look like during the day?", a: [
                { t: "Fixed times, all planned out", v: 0 },
                { t: "Regular, but I love treats", v: 1 },
                { t: "Mostly when someone serves me", v: 2 },
                { t: "I snack all day, whenever I feel like it", v: 3 } ] },
            { q: "You spot an empty cardboard box:", a: [
                { t: "Flatten it and bin it right away", v: 0 },
                { t: "Keep it, might be useful", v: 1 },
                { t: "I have to look inside", v: 2 },
                { t: "I really want to sit in it", v: 3 } ] },
            { q: "How do you show affection?", a: [
                { t: "I say it outright and hug hello", v: 0 },
                { t: "I enjoy company when I'm in the mood", v: 1 },
                { t: "Small gestures, no big words", v: 2 },
                { t: "I stay close, but strictly on my own terms", v: 3 } ] }
        ],
        tiers: [
            { min: 80, e: "🐱", n: "Definitely a cat", d: "No doubt about it — inside, you're very nearly one hundred percent cat. Naps, independence and warm spots are your element. You're only missing a tail and whiskers." },
            { min: 55, e: "😼", n: "A cat in a human body", d: "Human shell, feline soul. You do your own thing, prize comfort above all, and show affection strictly on your own terms. Purring is well within reach." },
            { min: 30, e: "🙂", n: "Half cat, half human", d: "A lovely balance. You like people and a little activity, but a good nap and a moment to yourself make you just as happy. The cat in you winks now and then." },
            { min: 0,  e: "🧍", n: "Human (for now)", d: "Energetic, sociable, organised — very human traits. But relax: a few more naps in the sun and a couple of boxes and you'll join the cat club." }
        ]
    }
};

let quizState = { step: -1, score: 0 };

function startQuiz() {
    quizState = { step: -1, score: 0 };
    renderQuiz();
}

function quizData() {
    return QUIZ[LANG] || QUIZ.pl;
}

function renderQuiz() {
    const app = document.getElementById("quiz-app");
    if (!app) return;
    const d = quizData();

    if (quizState.step === -1) {
        app.innerHTML = `
            <div class="quiz-card quiz-intro">
                <div class="quiz-emoji">🐱</div>
                <h1>${d.title}</h1>
                <p>${d.sub}</p>
                <button class="btn btn-primary btn-shine" onclick="quizNext()">${d.start}</button>
            </div>`;
        return;
    }

    if (quizState.step < d.q.length) {
        const i = quizState.step;
        const item = d.q[i];
        const pct = Math.round((i / d.q.length) * 100);
        app.innerHTML = `
            <div class="quiz-progress"><i style="width:${pct}%"></i></div>
            <div class="quiz-step">${i + 1} ${d.of} ${d.q.length}</div>
            <div class="quiz-card">
                <h2 class="quiz-q">${item.q}</h2>
                <div class="quiz-options">
                    ${item.a.map((o, idx) => `<button class="quiz-opt" onclick="quizPick(${o.v})" style="animation-delay:${idx * 0.05}s">${o.t}</button>`).join("")}
                </div>
            </div>`;
        return;
    }

    renderQuizResult();
}

function quizNext() {
    quizState.step++;
    renderQuiz();
}

function quizPick(v) {
    quizState.score += Number(v) || 0;
    quizState.step++;
    renderQuiz();
}

function quizCatPercent() {
    const d = quizData();
    const max = d.q.length * 3;
    return Math.max(0, Math.min(100, Math.round((quizState.score / max) * 100)));
}

function quizTier(pct) {
    const d = quizData();
    return d.tiers.find((t) => pct >= t.min) || d.tiers[d.tiers.length - 1];
}

function renderQuizResult() {
    const app = document.getElementById("quiz-app");
    const d = quizData();
    const pct = quizCatPercent();
    const r = quizTier(pct);
    app.innerHTML = `
        <div class="quiz-card quiz-result">
            <div class="quiz-result-emoji">${r.e}</div>
            <div class="quiz-score">${d.scoreLabel} <span class="grad">${pct}%</span></div>
            <div class="quiz-result-label">${d.resultLabel}</div>
            <h1 class="grad">${r.n}</h1>
            <p>${r.d}</p>
            <div id="quiz-cat" class="cat-grid" style="max-width:340px;margin:8px auto 18px;"></div>
            <div class="quiz-result-actions">
                <button class="btn btn-primary btn-shine" onclick="shareQuizResult('${r.e}', \`${r.n}\`, ${pct})">${d.share}</button>
                <button class="btn btn-ghost" onclick="startQuiz()">${d.again}</button>
            </div>
        </div>`;
    confetti();
    loadQuizCat();
}

async function loadQuizCat() {
    const grid = document.getElementById("quiz-cat");
    if (!grid) return;
    let url;
    try {
        const res = await fetch(`https://api.thecatapi.com/v1/images/search?limit=1&api_key=${API_KEY}`);
        url = (await res.json())[0].url;
    } catch {
        url = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    }
    createCatElement(grid, url);
}

async function shareQuizResult(emoji, name, pct) {
    const text = (LANG === "en"
        ? `${emoji} I'm ${pct}% cat on CatNet (${name})! Are you a cat?`
        : `${emoji} Jestem kotem w ${pct}% (${name}) na CatNet! A Ty — jesteś kotem?`);
    const url = location.href;
    if (navigator.share) {
        try { await navigator.share({ title: "CatNet", text, url }); return; } catch {}
    }
    try {
        await navigator.clipboard.writeText(text + " " + url);
        showToast(quizData().copied);
    } catch {
        window.prompt("CatNet", text + " " + url);
    }
}

/* ===========================================================
   ZGODA NA PLIKI COOKIE
   Microsoft Clarity ładuje się WYŁĄCZNIE po akceptacji.
   „Odrzuć" naprawdę wyłącza analitykę i czyści jej pliki cookie.
   Wybór jest zapamiętywany w przeglądarce (localStorage).
   =========================================================== */
const COOKIE_KEY = "catnet_cookie_consent";   // "accepted" | "rejected"
const CLARITY_ID = "x3sqx8dp6j";

function cookieConsent() {
    try { return localStorage.getItem(COOKIE_KEY); } catch { return null; }
}

function loadClarity() {
    if (window.__clarityLoaded) return;
    window.__clarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);
}

function clearClarityCookies() {
    const names = ["_clck", "_clsk", "CLID", "_cltk", "MUID", "ANONCHK", "SM"];
    names.forEach((n) => {
        const exp = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        document.cookie = n + exp;
        document.cookie = n + exp + "; domain=." + location.hostname;
    });
    try {
        Object.keys(localStorage).forEach((k) => {
            if (/^_?cl(ck|sk|id|tk)/i.test(k) || k.toLowerCase().indexOf("clarity") !== -1) {
                localStorage.removeItem(k);
            }
        });
    } catch { /* ignore */ }
}

function buildCookieBanner() {
    if (document.getElementById("cookie-overlay")) return;
    const ov = document.createElement("div");
    ov.className = "cookie-overlay";
    ov.id = "cookie-overlay";
    ov.innerHTML = `
        <div class="cookie-card" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
            <div class="cookie-emoji">🍪</div>
            <h2 id="cookie-title">${t("cookie.title")}</h2>
            <div class="cookie-body">${t("cookie.body")}</div>
            <div class="cookie-actions">
                <button class="btn btn-ghost" type="button" onclick="rejectCookies()">${t("cookie.reject")}</button>
                <button class="btn btn-primary" type="button" onclick="acceptCookies()">${t("cookie.accept")}</button>
            </div>
        </div>`;
    document.body.appendChild(ov);
}

function showCookieBanner() {
    buildCookieBanner();
    requestAnimationFrame(() => {
        document.getElementById("cookie-overlay").classList.add("open");
        document.body.classList.add("cookie-lock");
    });
}
function hideCookieBanner() {
    document.getElementById("cookie-overlay")?.classList.remove("open");
    document.body.classList.remove("cookie-lock");
}

function acceptCookies() {
    try { localStorage.setItem(COOKIE_KEY, "accepted"); } catch { /* ignore */ }
    hideCookieBanner();
    loadClarity();
    showToast(t("cookie.savedYes"));
}
function rejectCookies() {
    const wasLoaded = window.__clarityLoaded;
    try { localStorage.setItem(COOKIE_KEY, "rejected"); } catch { /* ignore */ }
    clearClarityCookies();
    hideCookieBanner();
    showToast(t("cookie.savedNo"));
    // Jeśli Clarity zdążyło się załadować w tej sesji — przeładuj, by naprawdę zniknęło
    if (wasLoaded) setTimeout(() => location.reload(), 500);
}

/* Odnośnik „Pliki cookie” w stopce — pozwala zmienić decyzję w dowolnej chwili */
function openCookieSettings() { showCookieBanner(); }

function initCookieConsent() {
    const c = cookieConsent();
    if (c === "accepted") loadClarity();
    else if (c !== "rejected") showCookieBanner();   // brak decyzji → pytamy raz
    document.querySelectorAll(".cookie-link").forEach((el) =>
        el.addEventListener("click", (e) => { e.preventDefault(); openCookieSettings(); }));
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
    heroGreeting();
    checkWelcomeParam();
    fillMarquee();
    initReveal();
    detectAdblock();
    initCookieConsent();

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
