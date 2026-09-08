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
