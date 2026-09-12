const CAT_FALLBACK = "https://cataas.com/cat";
const WM_URL = "https://catnet.teodorteo.com/wm.png";
const WM_HIDDEN_URL = "https://catnet.teodorteo.com/wm-hidden.png";
const CAT_KEY = "bS2OVK5ERRACTMTKnt1epj9AnQXU1b2v";

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function denied(reason) {
  return new Response("NO ACCESS\n", {
    status: 403,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-deny": reason || "?"
    }
  });
}

async function randomCatImage(request, env, url) {
  const key = (env && env.CAT_KEY) || CAT_KEY;
  if (!safeEqual(url.searchParams.get("k") || "", key)) return denied("key");
  if (!safeEqual(request.headers.get("x-cat-key") || "", key)) return denied("header");

  let target = CAT_FALLBACK;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch("https://api.thecatapi.com/v1/images/search?_=" + Date.now(), {
      headers: { accept: "application/json" },
      signal: ctrl.signal,
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    clearTimeout(t);
    if (r.ok) {
      const d = await r.json();
      if (d && d[0] && d[0].url) target = d[0].url;
    }
  } catch (e) {}

  // ?raw=1 -> czysty obrazek bez znaku (tylko dla Ciebie: klucz + naglowek juz sprawdzone)
  const raw = url.searchParams.get("raw") === "1";

  let up = null;
  if (raw) {
    try {
      up = await fetch(target, { cf: { cacheTtl: 0, cacheEverything: false } });
      if (!up.ok) up = null;
    } catch (e) { up = null; }
  }
  if (!up && !raw) try {
    up = await fetch(target, {
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
        image: {
          width: 1200,
          fit: "contain",
          format: "jpeg",
          quality: 88,
          draw: [
            { url: WM_HIDDEN_URL },
            { url: WM_URL, width: 225, bottom: 16, right: 16 }
          ]
        }
      }
    });
    if (!up.ok) up = null;
  } catch (e) {
    up = null;
  }

  const watermarked = !!(up && up.headers.get("cf-resized"));

  if (!up) {
    try {
      up = await fetch(target, { cf: { cacheTtl: 0, cacheEverything: false } });
    } catch (e) {
      return new Response("upstream error", { status: 502, headers: { "cache-control": "no-store" } });
    }
  }
  if (!up.ok) return new Response("upstream " + up.status, { status: 502, headers: { "cache-control": "no-store" } });

  const h = new Headers();
  h.set("Content-Type", up.headers.get("content-type") || "image/jpeg");
  h.set("X-Watermark", watermarked ? "on" : "off");
  h.set("Content-Disposition", 'inline; filename="cat.jpg"');
  h.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  h.set("Referrer-Policy", "no-referrer");
  return new Response(up.body, { status: 200, headers: h });
}

const CATAPI_KEY = "Live_p2Iw0CPRFAh8EIYZqvt3CMJMOqQQFjRdUND82x6c0kHVB5proE1aCebeSRcvJvrT";
const FALLBACK_IMAGES = [
  "https://cdn2.thecatapi.com/images/MTY3ODIyMQ.jpg",
  "https://cdn2.thecatapi.com/images/1g.jpg",
  "https://cdn2.thecatapi.com/images/3f1.jpg",
  "https://cdn2.thecatapi.com/images/a5j.jpg"
];

function jsonResponse(body, maxAge) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": maxAge ? "public, max-age=" + maxAge : "no-store"
    }
  });
}

async function getJson(target, ms, extraHeaders) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || 6000);
  const headers = { accept: "application/json" };
  if (extraHeaders) for (const k in extraHeaders) headers[k] = extraHeaders[k];
  try {
    const r = await fetch(target, {
      headers: headers,
      signal: ctrl.signal,
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getJsonRetry(target, ms, extraHeaders) {
  const first = await getJson(target, ms, extraHeaders);
  if (first) return first;
  return await getJson(target, ms, extraHeaders);
}

function proxied(origin, target) {
  return origin + "/img?u=" + encodeURIComponent(target);
}

async function fromTheCatApi(limit, breed) {
  const q = "https://api.thecatapi.com/v1/images/search?limit=" + limit +
            (breed ? "&breed_ids=" + encodeURIComponent(breed) : "") +
            "&_=" + Date.now();
  const d = await getJsonRetry(q, 6000, { "x-api-key": CATAPI_KEY });
  if (!Array.isArray(d)) return [];
  return d.map((c) => c && c.url).filter(Boolean);
}

async function fromCataas(limit, kitten) {
  const skip = Math.floor(Math.random() * 400);
  const q = "https://cataas.com/api/cats?limit=" + limit + "&skip=" + skip +
            (kitten ? "&tags=kitten" : "");
  const d = await getJson(q);
  if (Array.isArray(d) && d.length) {
    return d.map((c) => c && (c._id || c.id)).filter(Boolean)
            .map((id) => "https://cataas.com/cat/" + id);
  }
  const out = [];
  for (let i = 0; i < limit; i++) {
    out.push("https://cataas.com/cat" + (kitten ? "/kitten" : "") + "?ts=" + (Date.now() + i));
  }
  return out;
}

async function catList(url) {
  const origin = url.origin;
  let n = parseInt(url.searchParams.get("n"), 10);
  if (!Number.isFinite(n)) n = 10;
  n = Math.max(1, Math.min(30, n));
  const src = url.searchParams.get("src") || "standard";
  const breed = (url.searchParams.get("breed") || "").slice(0, 40);

  let urls = [];
  let served = src;
  try {
    if (src === "community") {
      urls = await fromCataas(n, false);
    } else if (src === "kitten") {
      urls = await fromCataas(n, true);
    } else if (src === "deluxe") {
      const half = Math.ceil(n / 2);
      const both = await Promise.all([fromTheCatApi(half, ""), fromCataas(n - half, false)]);
      urls = both[0].concat(both[1]);
      for (let i = urls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = urls[i]; urls[i] = urls[j]; urls[j] = tmp;
      }
    } else {
      urls = await fromTheCatApi(n, breed);
    }
  } catch (e) {
    urls = [];
  }

  // deluxe: jesli jedno ze zrodel oddalo mniej, dopelnij z drugiego
  if (src === "deluxe" && urls.length && urls.length < n) {
    try {
      const more = await fromCataas(n - urls.length, false);
      urls = urls.concat(more);
    } catch (e) {}
  }

  // jedno zrodlo padlo: bierz z drugiego, zamiast pokazywac te same cztery zdjecia
  if (!urls.length && src !== "community" && src !== "kitten") {
    try {
      urls = await fromCataas(n, false);
      if (urls.length) served = "community";
    } catch (e) {}
  }
  if (!urls.length && (src === "community" || src === "kitten")) {
    try {
      urls = await fromTheCatApi(n, "");
      if (urls.length) served = "standard";
    } catch (e) {}
  }

  let fallback = false;
  if (!urls.length) {
    fallback = true;
    served = "builtin";
    for (let i = 0; i < n; i++) urls.push(FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]);
  }

  return jsonResponse({
    requested: src,
    source: served,
    fallback: fallback,
    images: urls.slice(0, n).map((u) => proxied(origin, u))
  });
}

async function catBreeds() {
  const d = await getJsonRetry("https://api.thecatapi.com/v1/breeds", 6000, { "x-api-key": CATAPI_KEY });
  if (!Array.isArray(d)) return jsonResponse({ breeds: [] });
  return jsonResponse({
    breeds: d.map((b) => ({ id: b && b.id, name: b && b.name })).filter((b) => b.id && b.name)
  }, 86400);
}

function isAllowedImageHost(h) {
  return h === "cataas.com" || h === "thecatapi.com" || h.endsWith(".thecatapi.com");
}

async function proxyImage(url) {
  const target = url.searchParams.get("u");
  let t;
  try { t = new URL(target); } catch (e) { return new Response("bad request", { status: 400 }); }
  if (t.protocol !== "https:" || !isAllowedImageHost(t.hostname)) {
    return new Response("forbidden", { status: 403 });
  }
  const preview = url.searchParams.get("pv") === "1";
  let upstream = null;
  if (preview) {
    try {
      upstream = await fetch(t.toString(), {
        redirect: "follow",
        cf: {
          cacheTtl: 3600,
          cacheEverything: true,
          image: {
            width: 1200,
            height: 1200,
            fit: "cover",
            format: "jpeg",
            quality: 88,
            draw: [
              { url: WM_HIDDEN_URL },
              { url: WM_URL, width: 225, bottom: 16, right: 16 }
            ]
          }
        }
      });
      if (!upstream.ok) upstream = null;
    } catch (e) { upstream = null; }
  }
  if (!upstream) {
    try {
      upstream = await fetch(t.toString(), { redirect: "follow", cf: { cacheTtl: 3600, cacheEverything: true } });
    } catch (e) {
      return new Response("upstream error", { status: 502 });
    }
  }
  if (!upstream.ok) return new Response("upstream " + upstream.status, { status: 502 });
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "public, max-age=3600");
  return new Response(upstream.body, { status: 200, headers });
}

function decodeB64Url(v) {
  if (!v || v.length > 2048) return null;
  let b = v.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  let out;
  try { out = atob(b); } catch (e) { return null; }
  try { out = decodeURIComponent(escape(out)); } catch (e) {}
  let t;
  try { t = new URL(out); } catch (e) { return null; }
  if (t.protocol !== "https:" || !isAllowedImageHost(t.hostname)) return null;
  return t.toString();
}

export default {
  async fetch(request, env) {
    let earlyUrl;
    try { earlyUrl = new URL(request.url); } catch (e) { return env.ASSETS.fetch(request); }
    if (earlyUrl.pathname === "/api") {
      if (earlyUrl.searchParams.has("breeds")) return catBreeds();
      if (earlyUrl.searchParams.has("n") || earlyUrl.searchParams.has("src")) return catList(earlyUrl);
      return randomCatImage(request, env, earlyUrl);
    }
    if (earlyUrl.pathname === "/img") return proxyImage(earlyUrl);

    const resp = await env.ASSETS.fetch(request);

    try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    const isQuiz = path === "/quiz" || path === "/quiz.html";
    const kRaw = url.searchParams.get("k");
    const k = kRaw === null ? NaN : parseInt(kRaw, 10);
    const ct = resp.headers.get("content-type") || "";

    if (!ct.includes("text/html")) return resp;

    const photo = decodeB64Url(url.searchParams.get("base64photos") || "");
    if (photo) {
      const en = url.searchParams.get("l") === "en";
      const pTitle = en ? "Look at this cat on CatNet" : "Zobacz tego kota na CatNet";
      const pDesc = en
        ? "The cutest cat pictures in the world. Tap to see more."
        : "Najsłodsze obrazki kotów na świecie. Wejdź i zobacz więcej.";
      const pImg = url.origin + "/img?u=" + encodeURIComponent(photo) + "&pv=1";
      return new HTMLRewriter()
        .on("title", new SetText(pTitle + " | CatNet"))
        .on('meta[name="description"]', new SetAttr("content", pDesc))
        .on('meta[property="og:title"]', new SetAttr("content", pTitle))
        .on('meta[property="og:description"]', new SetAttr("content", pDesc))
        .on('meta[property="og:image"]', new SetAttr("content", pImg))
        .on('meta[property="og:image:alt"]', new SetAttr("content", pTitle))
        .on('meta[property="og:image:width"]', new SetAttr("content", "1200"))
        .on('meta[property="og:image:height"]', new SetAttr("content", "1200"))
        .on('meta[name="twitter:title"]', new SetAttr("content", pTitle))
        .on('meta[name="twitter:description"]', new SetAttr("content", pDesc))
        .on('meta[name="twitter:image"]', new SetAttr("content", pImg))
        .on('meta[name="twitter:image:alt"]', new SetAttr("content", pTitle))
        .transform(resp);
    }

    if (!isQuiz || !Number.isFinite(k)) {
      return resp;
    }

    const pct = Math.max(0, Math.min(100, k));
    const en = url.searchParams.get("l") === "en";
    const title = en ? `I'm ${pct}% cat!` : `Jestem w ${pct}% kotem!`;
    const desc = en ? "See if you're a cat too!" : "Zobacz czy jesteś kotem!";

    return new HTMLRewriter()
      .on("title", new SetText(`${title} | CatNet`))
      .on('meta[name="description"]', new SetAttr("content", `${title} ${desc}`))
      .on('meta[property="og:title"]', new SetAttr("content", title))
      .on('meta[property="og:description"]', new SetAttr("content", desc))
      .on('meta[name="twitter:title"]', new SetAttr("content", title))
      .on('meta[name="twitter:description"]', new SetAttr("content", desc))
      .transform(resp);
    } catch (e) {
      return resp;
    }
  },
};

class SetAttr {
  constructor(attr, value) {
    this.attr = attr;
    this.value = value;
  }
  element(el) {
    el.setAttribute(this.attr, this.value);
  }
}

class SetText {
  constructor(text) {
    this.text = text;
  }
  element(el) {
    el.setInnerContent(this.text);
  }
}
