(function () {
  const root = document.getElementById("root");
  const lang = "en";

  function t(obj) {
    if (!obj) return "";
    return obj[lang] ?? obj.en ?? "";
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function render(cfg) {
    const repo = cfg.repository?.url || "#";
    const yt = (id) => `https://www.youtube.com/embed/${id}?rel=0`;

    const docs = (cfg.documents || [])
      .map((d) => `<li><a href="${esc(d.path)}">${esc(t(d.label))}</a></li>`)
      .join("");

    const showcase = cfg.youtube?.showcase;
    const full = cfg.youtube?.full;

    root.innerHTML = `
      <section class="wc-hero">
        <div class="wc-glow wc-glow-a"></div>
        <div class="wc-glow wc-glow-b"></div>
        <p class="wc-badge">${esc(cfg.project?.name || "WiseChoice")}</p>
        <h1>${esc(t(cfg.project?.tagline))}</h1>
        <p class="wc-lead">${esc(t(cfg.project?.description))}</p>
        <div class="wc-actions">
          <a class="wc-btn wc-btn-primary" href="${esc(repo)}" target="_blank" rel="noopener">GitHub Repository</a>
          <a class="wc-btn" href="${esc(cfg.repository?.readme_zh || "README.zh-CN.md")}">Chinese README</a>
          <a class="wc-btn" href="${esc(cfg.repository?.readme_en || "README.md")}">English README</a>
        </div>
        ${cfg.media?.hero ? `<figure class="wc-hero-fig"><img src="${esc(cfg.media.hero)}" alt="" width="1080" loading="lazy" /></figure>` : ""}
      </section>

      <section class="wc-section wc-card" aria-labelledby="videos-title">
        <h2 id="videos-title">${lang === "zh" ? "观看演示" : "Watch Demo"}</h2>
        <p class="wc-note">Watch both the short showcase and full walkthrough directly below.</p>
        <div class="wc-video-grid">
          ${showcase ? `<article class="wc-video-card"><h3>${esc(t(showcase.label))}</h3><div class="wc-embed"><iframe src="${esc(yt(showcase.videoId))}" title="${esc(t(showcase.label))}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div></article>` : ""}
          ${full ? `<article class="wc-video-card"><h3>${esc(t(full.label))}</h3><div class="wc-embed"><iframe src="${esc(yt(full.videoId))}" title="${esc(t(full.label))}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div></article>` : ""}
        </div>
      </section>

      <section class="wc-section wc-card" aria-labelledby="docs-title">
        <h2 id="docs-title">Slide Deck</h2>
        ${(() => {
          const docsList = cfg.documents || [];
          const slideDoc = docsList.find((d) => /slide/i.test(d.path || "")) || docsList[0];
          if (!slideDoc) return "";
          return `
            <ul class="wc-docs">
              <li><a href="${esc(slideDoc.path)}">${esc(t(slideDoc.label) || "Slide deck (PDF)")}</a></li>
            </ul>
            <div class="wc-pdf" aria-label="Slide deck preview">
              <iframe src="${esc(slideDoc.path)}#view=FitH" title="Slide deck" loading="lazy"></iframe>
            </div>
          `;
        })()}
      </section>

      <section class="wc-section wc-card" aria-labelledby="fig-title">
        <h2 id="fig-title">Product Screens</h2>
        <p class="wc-note">From left to right in the user journey: system architecture for trust and transparency, then the side panel experience for fast shortlist-to-decision flow.</p>
        <div class="wc-figure-grid">
          ${
            cfg.media?.systemDesign
              ? `<figure>
                  <figcaption>System design</figcaption>
                  <img src="${esc(cfg.media.systemDesign)}" alt="WiseChoice system design" loading="lazy" />
                  <p class="wc-fig-desc">A local-first pipeline: browser capture -> local API orchestration -> structured LLM decision output. This keeps product context close to the user while preserving clarity in the decision chain.</p>
                </figure>`
              : ""
          }
          ${
            cfg.media?.dualMode
              ? `<figure>
                  <figcaption>List mode / Report mode</figcaption>
                  <img src="${esc(cfg.media.dualMode)}" alt="WiseChoice list mode and report mode" loading="lazy" />
                  <p class="wc-fig-desc">List mode focuses on quick candidate collection and selection; Report mode converts selected products into a concise, structured recommendation with TL;DR, strategy, and trade-offs.</p>
                </figure>`
              : ""
          }
        </div>
      </section>

      <footer class="wc-footer">
        <p>© ${new Date().getFullYear()} ${esc(cfg.project?.name || "WiseChoice")} · <a href="${esc(cfg.license?.file || "LICENSE")}">${esc(cfg.license?.name || "MIT")}</a></p>
      </footer>
    `;
  }

  async function load() {
    try {
      const res = await fetch("project.config.json", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      render(await res.json());
    } catch (_e) {
      root.innerHTML = `
        <div class="wc-error">
          <h1>WiseChoice</h1>
          <p>This page is temporarily unavailable. Please refresh and try again.</p>
        </div>
      `;
    }
  }

  load();
})();
