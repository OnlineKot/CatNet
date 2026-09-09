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
            { url: WM_URL, width: 170, bottom: 14, right: 14 }
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
  let upstream;
  try {
    upstream = await fetch(t.toString(), { redirect: "follow", cf: { cacheTtl: 3600, cacheEverything: true } });
  } catch (e) {
    return new Response("upstream error", { status: 502 });
  }
  if (!upstream.ok) return new Response("upstream " + upstream.status, { status: 502 });
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "public, max-age=3600");
  return new Response(upstream.body, { status: 200, headers });
}

export default {
  async fetch(request, env) {
    let earlyUrl;
    try { earlyUrl = new URL(request.url); } catch (e) { return env.ASSETS.fetch(request); }
    if (earlyUrl.pathname === "/api") return randomCatImage(request, env, earlyUrl);
    if (earlyUrl.pathname === "/img") return proxyImage(earlyUrl);

    const resp = await env.ASSETS.fetch(request);

    try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    const isQuiz = path === "/quiz" || path === "/quiz.html";
    const kRaw = url.searchParams.get("k");
    const k = kRaw === null ? NaN : parseInt(kRaw, 10);
    const ct = resp.headers.get("content-type") || "";

    if (!isQuiz || !Number.isFinite(k) || !ct.includes("text/html")) {
      return resp;
    }

    const pct = Math.max(0, Math.min(100, k));
    const en = url.searchParams.get("l") === "en";
    const title = en ? `I'm ${pct}% cat!` : `Jestem w ${pct}% kotem!`;
    const desc = en ? "See if you're a cat too!" : "Zobacz czy jesteś kotem!";

    return new HTMLRewriter()
      .on("title", new SetText(`${title} — CatNet`))
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
