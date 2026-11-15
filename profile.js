/* =========================================================================
   PROFILE.JS — โหลดข้อมูลพอร์ตโฟลิโอของแต่ละคน
   -------------------------------------------------------------------------
   เว็บชุดเดียวรองรับหลายคน แต่ละคนมีไฟล์ข้อมูลของตัวเองที่
       people/<ชื่อผู้ใช้>/data.json

   วิธีเลือกว่าจะดูของใคร: เติม ?u=ชื่อผู้ใช้ ท้าย URL
       https://ncikik.github.io/portfolio/?u=alice
       https://ncikik.github.io/portfolio/?u=alice&edit=1   (โหมดแก้ไข)

   ถ้าไม่ระบุ จะใช้โปรไฟล์ชื่อ "me" (คนแรก/เจ้าของเว็บ)
   ถ้ายังไม่มีไฟล์ข้อมูล เว็บจะแสดงข้อความตัวอย่างใน index.html ตามเดิม

   ไฟล์นี้ทำงานทุกครั้งที่เปิดเว็บ (ไม่เกี่ยวกับโหมดแก้ไข)
   ========================================================================= */

(() => {
  "use strict";

  const BASE_KEY = "portfolio-content-v1";
  const DEFAULT_SLUG = "me";
  const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,31})$/;

  /* ค่าที่ถูกต้องของชื่อผู้ใช้: a-z 0-9 และขีดกลาง */
  const rawSlug = new URLSearchParams(location.search).get("u");
  const slug = rawSlug && SLUG_PATTERN.test(rawSlug.toLowerCase())
    ? rawSlug.toLowerCase()
    : DEFAULT_SLUG;

  const storageKey = `${BASE_KEY}::${slug}`;

  const $ = (selector, context) => (context || document).querySelector(selector);
  const $$ = (selector, context) => Array.from((context || document).querySelectorAll(selector));

  function collapse(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function normalizeUrl(value) {
    const url = collapse(value);
    if (!url) return "";
    if (/^(https?:|mailto:|tel:|data:|blob:|\/|\.\/|#)/i.test(url)) return url;
    return "https://" + url.replace(/^\/+/, "");
  }

  function normalizeContactUrl(key, value) {
    let url = collapse(value);
    if (!url) return "";
    if (/^(https?:|mailto:|tel:)/i.test(url)) return url;

    url = url.replace(/^@/, "").replace(/^~/, "").replace(/^\/+/, "");
    if (key === "github") return "https://github.com/" + url;
    if (key === "facebook") return "https://facebook.com/" + url;
    if (key === "line") return "https://line.me/ti/p/~" + url;
    return url;
  }

  function contactLabel(key, value) {
    const raw = collapse(value);
    if (!raw) return "";

    if (key === "email") return raw.replace(/^mailto:/i, "");

    const clean = raw
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/[?#].*$/, "")
      .replace(/\/+$/, "");

    if (key === "github") {
      const path = clean.replace(/^github\.com\//i, "");
      return path ? "@" + path.split("/")[0] : clean;
    }

    if (key === "line") {
      const id = clean.replace(/^line\.me\/(ti\/p\/)?/i, "").replace(/^~/, "").replace(/^@/, "");
      return id ? "@" + id : clean;
    }

    return clean;
  }

  function deriveInitials(name) {
    const parts = collapse(name).split(" ").filter(Boolean);
    if (parts.length === 0) return "CN";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  /* ---------------------------- เขียนข้อมูลลงหน้าเว็บ ---------------------------- */

  function setBind(key, value) {
    const text = String(value == null ? "" : value);
    const nodes = $$(`[data-bind="${key}"]`);
    if (nodes.length === 0) return;

    nodes.forEach((el) => {
      if (key === "footerTagline") {
        el.textContent = "";
        const lines = text.split(/\n+/).map(collapse).filter(Boolean);
        lines.forEach((line, index) => {
          if (index > 0) el.appendChild(document.createElement("br"));
          el.appendChild(document.createTextNode(line));
        });
        return;
      }

      el.textContent = collapse(text);
    });
  }

  function renderList(list, items) {
    if (!list) return;
    list.textContent = "";
    (Array.isArray(items) ? items : []).forEach((item) => {
      const text = collapse(item);
      if (!text) return;
      const li = document.createElement("li");
      li.textContent = text;
      list.appendChild(li);
    });
  }

  function setMeta(attrName, attrValue, content) {
    const el = $(`meta[${attrName}="${attrValue}"]`);
    if (el) el.setAttribute("content", content);
  }

  function applySeo(name) {
    const safeName = collapse(name) || "ชื่อ-นามสกุล";
    const title = `${safeName} | Portfolio`;
    const description = `พอร์ตโฟลิโอส่วนตัวของ ${safeName} — นักศึกษาเทคโนโลยีสารสนเทศและนักพัฒนาเว็บ`;

    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
  }

  function applyContacts(contacts) {
    if (!contacts) return;

    const email = collapse(contacts.email).replace(/^mailto:/i, "").replace(/\s+/g, "");
    const hasEmail = Boolean(email);

    $$('[data-contact="email"]').forEach((link) => {
      link.hidden = !hasEmail;
      if (hasEmail) link.setAttribute("href", "mailto:" + email);
    });

    $$("[data-email-link]").forEach((link) => {
      link.hidden = !hasEmail;
      if (hasEmail) link.setAttribute("href", "mailto:" + email);
    });

    $$("[data-email-display]").forEach((el) => {
      el.textContent = email;
    });

    const emailBox = $(".email-box");
    if (emailBox) emailBox.hidden = !hasEmail;

    const copyButton = $("[data-copy]");
    if (copyButton && hasEmail) {
      copyButton.setAttribute("data-copy", email);
      copyButton.setAttribute("aria-label", `คัดลอกอีเมล ${email}`);
    }

    const emailLabel = $('[data-contact-label="email"]');
    if (emailLabel) emailLabel.textContent = email;

    ["github", "facebook", "line"].forEach((key) => {
      const value = collapse(contacts[key]);
      const url = normalizeContactUrl(key, value);
      const hasLink = Boolean(url);

      $$(`[data-contact="${key}"]`).forEach((link) => {
        link.hidden = !hasLink;
        if (hasLink) link.setAttribute("href", url);
      });

      const label = $(`[data-contact-label="${key}"]`);
      if (label) label.textContent = contactLabel(key, value);
    });
  }

  function setProjectLink(link, value) {
    if (!link) return;
    const url = normalizeUrl(value);
    link.hidden = !url;
    if (url) link.setAttribute("href", url);
  }

  function applyProjectImage(thumb, src, title) {
    if (!thumb) return;

    const existing = $("img", thumb);
    const alt = title ? `ภาพตัวอย่างโปรเจกต์ ${title}` : "ภาพตัวอย่างโปรเจกต์";

    if (src) {
      let image = existing;
      if (!image) {
        image = document.createElement("img");
        image.loading = "lazy";
        thumb.appendChild(image);
      }
      image.setAttribute("src", src);
      image.setAttribute("alt", alt);
      thumb.classList.add("has-photo");
    } else if (existing) {
      existing.remove();
      thumb.classList.remove("has-photo");
    }

    thumb.setAttribute("aria-label", alt);
  }

  function applyProjects(projects) {
    if (!Array.isArray(projects)) return;

    $$("[data-project]").forEach((card, index) => {
      const data = projects[index];
      if (!data) return;

      const type = $(".project-type", card);
      if (type) type.textContent = collapse(data.type);

      const year = $(".project-year", card);
      if (year) year.textContent = collapse(data.year);

      const title = $("h3", card);
      if (title) title.textContent = collapse(data.title);

      const desc = $(".project-body p", card);
      if (desc) desc.textContent = collapse(data.desc);

      renderList($(".tag-list", card), data.tags);

      const links = $$(".project-links a", card);
      const demo = links.find((link) => link.classList.contains("btn-primary")) || links[0];
      const repo = links.find((link) => link.classList.contains("btn-ghost")) || links[1];

      setProjectLink(demo, data.demoUrl);
      setProjectLink(repo, data.repoUrl);
      applyProjectImage($("[data-project-thumb]", card), data.image, data.title);
    });
  }

  function applyProfileImage(src, name) {
    const holder = $("[data-profile-photo]");
    if (!holder) return;

    const existing = $("img", holder);

    if (src) {
      let image = existing;
      if (!image) {
        image = document.createElement("img");
        holder.insertBefore(image, holder.firstChild);
      }
      image.setAttribute("src", src);
      image.setAttribute("alt", `รูปโปรไฟล์ของ ${collapse(name) || "เจ้าของเว็บ"}`);
      holder.classList.add("has-photo");
    } else if (existing) {
      existing.remove();
      holder.classList.remove("has-photo");
    }
  }

  function applyData(data) {
    if (!data || typeof data !== "object") return;

    const bind = data.bind || {};
    Object.keys(bind).forEach((key) => setBind(key, bind[key]));

    const lists = data.lists || {};
    Object.keys(lists).forEach((key) => renderList($(`[data-list="${key}"]`), lists[key]));

    applyContacts(data.contacts);
    applyProjects(data.projects);

    const name = "name" in bind ? bind.name : "";
    setBind("initials", deriveInitials(name));

    if (data.profileImage !== undefined) applyProfileImage(data.profileImage, name);

    applySeo(name);
  }

  /* ---------------------------- โหลดข้อมูล ---------------------------- */

  function readSaved() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : null;
    } catch (error) {
      return null;
    }
  }

  async function fetchProfile() {
    if (location.protocol === "file:") return null;

    try {
      const response = await fetch(`people/${slug}/data.json`, { cache: "no-store" });
      if (!response.ok) return null;
      const data = await response.json();
      return data && typeof data === "object" ? data : null;
    } catch (error) {
      return null;
    }
  }

  async function loadProfile() {
    document.documentElement.setAttribute("data-profile", slug);

    const remote = await fetchProfile();
    if (remote) applyData(remote);

    /* ค่าที่เจ้าของแก้ไว้ในเบราว์เซอร์นี้ทับข้อมูลจากไฟล์เสมอ */
    const saved = readSaved();
    if (saved) applyData(saved);

    if (!remote && !saved) applySeo(readName());

    return { slug, remote: Boolean(remote), saved: Boolean(saved) };
  }

  function readName() {
    const el = $('[data-bind="name"]');
    return el ? collapse(el.textContent) : "";
  }

  window.PortfolioProfile = {
    slug,
    storageKey,
    applyData,
    readName,
    ready: null
  };

  /* ให้ editor.js รอผลการโหลดก่อนอ่านค่าจากหน้าเว็บ */
  window.PortfolioProfile.ready = loadProfile();
})();
