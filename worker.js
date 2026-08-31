export default {
  async fetch(request, env) {
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
