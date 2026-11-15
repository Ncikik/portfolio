/* =========================================================================
   EDITOR.JS — โหมดแก้ไขข้อมูลเว็บไซต์
   -------------------------------------------------------------------------
   ไฟล์นี้จะถูกโหลดเฉพาะเมื่อเปิดเว็บในเครื่อง (localhost / ไฟล์ในเครื่อง)
   หรือเมื่อเติม ?edit=1 ท้าย URL เท่านั้น

   ความสามารถ:
   1) สร้างปุ่ม "แก้ไขข้อมูล" และแผงฟอร์มแก้ข้อความทั้งหมด
   2) อัปโหลดรูปโปรไฟล์ / รูปผลงาน แล้วย่อขนาดให้อัตโนมัติ
   3) บันทึกข้อมูลลง localStorage ของเบราว์เซอร์เจ้าของเว็บ
   4) ดาวน์โหลด index.html ที่ฝังข้อมูลล่าสุดแล้ว เพื่อนำไปอัปโหลดทับบน GitHub

   หมายเหตุ: การแก้ไขในหน้านี้เห็นเฉพาะในเบราว์เซอร์นี้
   ผู้ชมเว็บจะเห็นข้อมูลใหม่หลังเจ้าของอัปโหลดไฟล์ index.html ที่ดาวน์โหลดไปแล้ว
   ========================================================================= */

(() => {
  "use strict";

  const PROFILE = window.PortfolioProfile || null;
  const PROFILE_SLUG = PROFILE ? PROFILE.slug : "me";
  const STORAGE_KEY = PROFILE ? PROFILE.storageKey : "portfolio-content-v1";

  /** ลิงก์หน้าจริงของโปรไฟล์ที่กำลังแก้ (ตัด ?edit ออก) */
  function profileUrl() {
    const url = new URL(location.href);
    url.search = "?u=" + PROFILE_SLUG;
    url.hash = "";
    return url.href;
  }

  /** ตำแหน่งไฟล์ข้อมูลบน GitHub */
  function dataPath() {
    return `people/${PROFILE_SLUG}/data.json`;
  }

  /* คำสั่งซ้าย = ชื่อคีย์ใน data-bind ของ index.html */
  const BIND_KEYS = [
    "name",
    "greeting",
    "eyebrow",
    "role",
    "profileTagline",
    "heroLead",
    "about1",
    "about2",
    "about3",
    "education",
    "location",
    "goal",
    "interests",
    "footerTagline",
    "contactLead"
  ];

  const LIST_KEYS = ["skillsFrontend", "skillsBackend", "skillsTools"];
  const SOCIAL_KEYS = ["github", "facebook", "line"];

  /* โครงสร้างฟอร์ม (เรียงตามลำดับที่แสดงในแผงแก้ไข) */
  const SECTIONS = [
    {
      title: "ข้อมูลหลัก",
      open: true,
      fields: [
        { key: "name", label: "ชื่อ-นามสกุล", hint: "ชื่อนี้จะแสดงบนโลโก้ หัวเว็บ และท้ายเว็บ" },
        { key: "greeting", label: "คำทักทาย", placeholder: "สวัสดีครับ ผมชื่อ" },
        { key: "eyebrow", label: "ข้อความสถานะ", hint: "ข้อความสั้น ๆ เหนือชื่อ เช่น เปิดรับงาน" },
        { key: "role", label: "ตำแหน่ง / สาขา", placeholder: "นักศึกษา ปวส. สาขาเทคโนโลยีสารสนเทศ" },
        { key: "profileTagline", label: "คำอธิบายใต้ชื่อ (การ์ดโปรไฟล์)", placeholder: "IT Student · Web Developer" },
        { key: "heroLead", label: "แนะนำตัวสั้น ๆ", type: "textarea", rows: 4, hint: "2–3 ประโยคก็พอ" }
      ]
    },
    {
      title: "เกี่ยวกับฉัน",
      fields: [
        { key: "about1", label: "ย่อหน้าที่ 1", type: "textarea", rows: 3 },
        { key: "about2", label: "ย่อหน้าที่ 2", type: "textarea", rows: 4 },
        { key: "about3", label: "ย่อหน้าที่ 3", type: "textarea", rows: 4 },
        { key: "education", label: "การศึกษา", placeholder: "ปวส. เทคโนโลยีสารสนเทศ" },
        { key: "location", label: "ที่ตั้ง", placeholder: "ประเทศไทย" },
        { key: "goal", label: "เป้าหมาย", placeholder: "Junior Web Developer" },
        { key: "interests", label: "ความสนใจ", placeholder: "Web App · UI/UX · API" },
        { key: "footerTagline", label: "ข้อความท้ายเว็บ (footer)", type: "textarea", rows: 3, hint: "ขึ้นบรรทัดใหม่ได้" }
      ]
    },
    {
      title: "ทักษะ",
      fields: [
        { key: "skillsFrontend", label: "Frontend", type: "list" },
        { key: "skillsBackend", label: "Backend", type: "list" },
        { key: "skillsTools", label: "Tools & Workflow", type: "list" }
      ]
    }
  ];

  let panel = null;
  let backdrop = null;
  let toastEl = null;
  let form = null;
  let lastFocus = null;
  let toastTimer = null;

  /* ค่ารูปที่ผู้ใช้เพิ่งเลือก (data URL) แยกจาก DOM เพื่อให้กดยกเลิกได้ */
  const imageState = { profile: "", projects: [] };

  /* -----------------------------------------------------------------------
     เครื่องมือช่วยเหลือทั่วไป
     ----------------------------------------------------------------------- */
  const $ = (selector, context) => (context || document).querySelector(selector);
  const $$ = (selector, context) => Array.from((context || document).querySelectorAll(selector));

  /** รวมช่องว่างและตัดหัวท้ายข้อความ */
  function collapse(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  /** แยกข้อความแบบคั่นด้วยจุลภาคหรือขึ้นบรรทัดใหม่เป็นรายการ */
  function splitList(value) {
    return String(value || "")
      .split(/[,\n]/)
      .map((item) => collapse(item))
      .filter(Boolean);
  }

  /** เติม https:// ให้ลิงก์ที่ผู้ใช้พิมพ์มาแบบไม่มีโปรโตคอล */
  function normalizeUrl(value) {
    const url = collapse(value);
    if (!url) return "";
    if (/^(https?:|mailto:|tel:|data:|blob:|\/|\.\/|#)/i.test(url)) return url;
    return "https://" + url.replace(/^\/+/, "");
  }

  /** แปลงไอดีหรือลิงก์โซเชียลให้เป็น URL ที่ใช้งานได้ */
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

  /** ข้อความที่แสดงบนการ์ดติดต่อ (ตัดโดเมนออกให้อ่านง่าย) */
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

  /** อักษรย่อสำหรับกล่องรูปโปรไฟล์ เมื่อยังไม่มีรูป */
  function deriveInitials(name) {
    const parts = collapse(name).split(" ").filter(Boolean);
    if (parts.length === 0) return "CN";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  /* -----------------------------------------------------------------------
     อ่านข้อมูลจากหน้าเว็บ
     ----------------------------------------------------------------------- */
  function readBind(key) {
    const el = $(`[data-bind="${key}"]`);
    if (!el) return "";

    if (key === "footerTagline") {
      return el.innerHTML
        .split(/<br\s*\/?>/i)
        .map((part) => collapse(part.replace(/<[^>]*>/g, " ")))
        .join("\n")
        .trim();
    }

    return collapse(el.textContent);
  }

  function readList(key) {
    return $$(`[data-list="${key}"] li`)
      .map((li) => collapse(li.textContent))
      .filter(Boolean);
  }

  function readContacts() {
    const contacts = { email: "" };
    const emailLink = $("[data-email-link]");

    if (emailLink) {
      contacts.email = (emailLink.getAttribute("href") || "").replace(/^mailto:/i, "");
      if (!contacts.email) contacts.email = collapse(emailLink.textContent);
    }

    SOCIAL_KEYS.forEach((key) => {
      const link = $(`[data-contact="${key}"]`);
      contacts[key] = link ? link.getAttribute("href") || "" : "";
    });

    return contacts;
  }

  function readProjects() {
    return $$("[data-project]").map((card) => {
      const thumb = $("[data-project-thumb]", card);
      const image = thumb ? $("img", thumb) : null;
      const links = $$(".project-links a", card);
      const demo = links.find((link) => link.classList.contains("btn-primary")) || links[0];
      const repo = links.find((link) => link.classList.contains("btn-ghost")) || links[1];

      return {
        type: collapse(($(".project-type", card) || {}).textContent),
        year: collapse(($(".project-year", card) || {}).textContent),
        title: collapse(($("h3", card) || {}).textContent),
        desc: collapse(($(".project-body p", card) || {}).textContent),
        tags: $$(".tag-list li", card).map((li) => collapse(li.textContent)).filter(Boolean),
        demoUrl: demo ? demo.getAttribute("href") || "" : "",
        repoUrl: repo ? repo.getAttribute("href") || "" : "",
        image: image ? image.getAttribute("src") || "" : ""
      };
    });
  }

  function readProfileImage() {
    const image = $("[data-profile-photo] img");
    return image ? image.getAttribute("src") || "" : "";
  }

  function readDOM() {
    const data = {
      version: 1,
      bind: {},
      lists: {},
      contacts: {},
      projects: [],
      profileImage: ""
    };

    BIND_KEYS.forEach((key) => {
      data.bind[key] = readBind(key);
    });

    LIST_KEYS.forEach((key) => {
      data.lists[key] = readList(key);
    });

    data.contacts = readContacts();
    data.projects = readProjects();
    data.profileImage = readProfileImage();
    return data;
  }

  /* -----------------------------------------------------------------------
     เขียนข้อมูลลงหน้าเว็บ
     ----------------------------------------------------------------------- */
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

  function renderList(key, items) {
    const list = $(`[data-list="${key}"]`);
    if (!list) return;

    list.textContent = "";
    (Array.isArray(items) ? items : []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = collapse(item);
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

    SOCIAL_KEYS.forEach((key) => {
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

      renderListElements($(".tag-list", card), data.tags);

      const links = $$(".project-links a", card);
      const demo = links.find((link) => link.classList.contains("btn-primary")) || links[0];
      const repo = links.find((link) => link.classList.contains("btn-ghost")) || links[1];

      setProjectLink(demo, data.demoUrl);
      setProjectLink(repo, data.repoUrl);
      applyProjectImage($("[data-project-thumb]", card), data.image, data.title);
    });
  }

  /** เหมือน renderList แต่รับ element โดยตรง (ใช้กับ list ในการ์ดผลงาน) */
  function renderListElements(list, items) {
    if (!list) return;
    list.textContent = "";
    (Array.isArray(items) ? items : []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = collapse(item);
      list.appendChild(li);
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
    Object.keys(lists).forEach((key) => renderList(key, lists[key]));

    if (data.contacts) applyContacts(data.contacts);
    if (Array.isArray(data.projects)) applyProjects(data.projects);

    const name = "name" in bind ? bind.name : readBind("name");
    setBind("initials", deriveInitials(name));

    if (data.profileImage !== undefined) {
      applyProfileImage(data.profileImage, name);
    }

    applySeo(name);
  }

  /* -----------------------------------------------------------------------
     อ่านค่าจากฟอร์ม
     ----------------------------------------------------------------------- */
  function collectFromForm() {
    const data = {
      version: 1,
      bind: {},
      lists: {},
      contacts: {},
      projects: [],
      profileImage: imageState.profile || ""
    };

    $$("[data-field]", form).forEach((input) => {
      data.bind[input.getAttribute("data-field")] = input.value;
    });

    $$("[data-list-field]", form).forEach((input) => {
      data.lists[input.getAttribute("data-list-field")] = splitList(input.value);
    });

    $$("[data-contact-field]", form).forEach((input) => {
      data.contacts[input.getAttribute("data-contact-field")] = input.value.trim();
    });

    data.projects = $$("[data-project-form]", form).map((block, index) => {
      const project = { tags: [], image: imageState.projects[index] || "" };

      $$("[data-pfield]", block).forEach((input) => {
        project[input.getAttribute("data-pfield")] = input.value.trim();
      });

      project.tags = splitList(project.tags);
      return project;
    });

    return data;
  }

  /* -----------------------------------------------------------------------
     บันทึก / โหลดข้อมูลจาก localStorage
     ----------------------------------------------------------------------- */
  function readSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : null;
    } catch (error) {
      return null;
    }
  }

  function persist(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      showToast("บันทึกไม่สำเร็จ: พื้นที่เก็บข้อมูลของเบราว์เซอร์เต็ม ลองใช้รูปเล็กลงหรือเอารูปบางรูปออก");
      return false;
    }
  }

  /* -----------------------------------------------------------------------
     ย่อรูปภาพก่อนบันทึก (ลดขนาดไฟล์ให้ localStorage รับไหว)
     ----------------------------------------------------------------------- */
  function compressImage(file, maxSize) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith("image/")) {
        reject(new Error("กรุณาเลือกไฟล์รูปภาพ"));
        return;
      }

      if (file.size > 12 * 1024 * 1024) {
        reject(new Error("ไฟล์ใหญ่เกิน 12 MB กรุณาเลือกรูปที่เล็กลง"));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("เปิดรูปไม่สำเร็จ ลองใช้ไฟล์อื่น"));
        image.onload = () => {
          try {
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d");
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);

            resolve(canvas.toDataURL("image/jpeg", 0.85));
          } catch (error) {
            reject(new Error("ย่อรูปไม่สำเร็จ"));
          }
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  /* -----------------------------------------------------------------------
     สร้างหน้าตาแผงแก้ไข
     ----------------------------------------------------------------------- */
  function fieldHTML(field) {
    const id = "ed-" + field.key;
    let control;

    if (field.type === "textarea") {
      control = `<textarea id="${id}" rows="${field.rows || 4}" data-field="${field.key}"></textarea>`;
    } else if (field.type === "list") {
      control = `<input id="${id}" type="text" data-list-field="${field.key}" placeholder="HTML, CSS, JavaScript">`;
    } else {
      control = `<input id="${id}" type="text" data-field="${field.key}" placeholder="${field.placeholder || ""}">`;
    }

    const hint = field.hint
      ? `<small>${field.hint}</small>`
      : field.type === "list"
        ? "<small>คั่นแต่ละรายการด้วยเครื่องหมายจุลภาค ( , )</small>"
        : "";

    return `<label class="editor-field" for="${id}"><span>${field.label}</span>${control}${hint}</label>`;
  }

  function sectionHTML(section) {
    return `<details class="editor-section"${section.open ? " open" : ""}>
      <summary>${section.title}</summary>
      <div class="editor-section-body">${section.fields.map(fieldHTML).join("")}</div>
    </details>`;
  }

  function imageRowHTML(kind, index) {
    const isProfile = kind === "profile";
    const attr = isProfile ? "profile" : `project-${index}`;
    const label = isProfile ? "รูปโปรไฟล์" : "รูปภาพผลงาน";
    const hint = isProfile
      ? "แนะนำรูปสี่เหลี่ยมจัตุรัส ระบบจะย่อขนาดให้อัตโนมัติ"
      : "แนะนำขนาด 1200×675 px (อัตราส่วน 16:9) ระบบจะย่อขนาดให้อัตโนมัติ";

    return `<div class="editor-field" data-image="${attr}">
      <span>${label}</span>
      <div class="editor-image-row">
        <span class="editor-image-preview" data-image-preview>ไม่มีรูป</span>
        <label class="editor-file-label">เลือกรูป<input type="file" accept="image/*" data-image-input></label>
        <button class="editor-clear-image" type="button" data-image-clear>เอารูปออก</button>
      </div>
      <input type="text" data-image-url placeholder="หรือวางลิงก์รูป https://...">
      <small>${hint}</small>
    </div>`;
  }

  function projectFormHTML(index) {
    return `<div class="editor-project" data-project-form="${index}">
      <div class="editor-project-head">
        <strong>ผลงานที่ ${index + 1}</strong>
        <span>CARD ${String(index + 1).padStart(2, "0")}</span>
      </div>
      <label class="editor-field"><span>ชื่อผลงาน</span><input type="text" data-pfield="title"></label>
      <div class="editor-project-grid">
        <label class="editor-field"><span>ประเภท</span><input type="text" data-pfield="type" placeholder="เว็บแอป"></label>
        <label class="editor-field"><span>ปี</span><input type="text" data-pfield="year" placeholder="2026"></label>
      </div>
      <label class="editor-field"><span>คำอธิบาย</span><textarea rows="3" data-pfield="desc"></textarea></label>
      <label class="editor-field"><span>เทคโนโลยีที่ใช้</span><input type="text" data-pfield="tags"><small>คั่นด้วยเครื่องหมายจุลภาค ( , )</small></label>
      <div class="editor-project-grid">
        <label class="editor-field"><span>ลิงก์ดูตัวอย่าง</span><input type="text" data-pfield="demoUrl" placeholder="https://..."></label>
        <label class="editor-field"><span>ลิงก์ซอร์สโค้ด</span><input type="text" data-pfield="repoUrl" placeholder="https://github.com/..."></label>
      </div>
      <small>เว้นลิงก์ใดว่างไว้ = ซ่อนปุ่มนั้น</small>
      ${imageRowHTML("project", index)}
    </div>`;
  }

  function contactFieldsHTML() {
    return `<label class="editor-field">
        <span>อีเมล</span>
        <input type="email" data-contact-field="email" placeholder="you@example.com">
        <small>แสดงในส่วนติดต่อและท้ายเว็บ</small>
      </label>
      <label class="editor-field">
        <span>GitHub</span>
        <input type="text" data-contact-field="github" placeholder="https://github.com/username">
        <small>ใส่ชื่อผู้ใช้หรือลิงก์เต็มก็ได้ / เว้นว่างเพื่อซ่อน</small>
      </label>
      <label class="editor-field">
        <span>Facebook</span>
        <input type="text" data-contact-field="facebook" placeholder="https://facebook.com/username">
        <small>เว้นว่างเพื่อซ่อนช่องทางนี้</small>
      </label>
      <label class="editor-field">
        <span>LINE</span>
        <input type="text" data-contact-field="line" placeholder="https://line.me/ti/p/~yourlineid">
        <small>ใส่ไอดี เช่น @yourlineid หรือลิงก์เต็ม</small>
      </label>
      <label class="editor-field">
        <span>ข้อความชวนติดต่อ</span>
        <textarea rows="4" data-field="contactLead"></textarea>
      </label>`;
  }

  function buildLauncher() {
    const launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "editor-launcher";
    launcher.setAttribute("data-editor-launcher", "");
    launcher.innerHTML =
      '<svg class="icon" aria-hidden="true"><use href="#i-edit"></use></svg><span>แก้ไขข้อมูล</span>';
    launcher.addEventListener("click", openPanel);
    document.body.appendChild(launcher);
  }

  function buildPanel() {
    const projectCount = $$("[data-project]").length;

    backdrop = document.createElement("div");
    backdrop.className = "editor-backdrop";
    backdrop.setAttribute("data-editor-backdrop", "");
    backdrop.addEventListener("click", closePanel);

    panel = document.createElement("aside");
    panel.className = "editor-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "editor-title");
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("tabindex", "-1");
    panel.innerHTML = `
      <header class="editor-header">
        <div>
          <h2 id="editor-title">แก้ไขข้อมูลเว็บไซต์</h2>
          <p class="editor-profile">โปรไฟล์: <strong data-editor-slug>${PROFILE_SLUG}</strong>
            <span>· <a href="${profileUrl()}" data-editor-link>เปิดหน้าจริง</a></span></p>
          <p>แก้ข้อความแล้วกด “บันทึก” ข้อมูลจะถูกเก็บในเบราว์เซอร์นี้</p>
        </div>
        <button class="editor-close" type="button" data-editor-close aria-label="ปิดหน้าต่างแก้ไข">
          <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-close"></use></svg>
        </button>
      </header>
      <form class="editor-form" data-editor-form novalidate>
        <div class="editor-scroll">
          ${SECTIONS.map(sectionHTML).join("")}
          <details class="editor-section">
            <summary>ผลงาน (${projectCount} การ์ด)</summary>
            <div class="editor-section-body">
              ${Array.from({ length: projectCount }, (_, index) => projectFormHTML(index)).join("")}
            </div>
          </details>
          <details class="editor-section">
            <summary>ช่องทางติดต่อ</summary>
            <div class="editor-section-body">${contactFieldsHTML()}</div>
          </details>
          <details class="editor-section">
            <summary>รูปโปรไฟล์</summary>
            <div class="editor-section-body">${imageRowHTML("profile")}</div>
          </details>
        </div>
        <footer class="editor-footer">
          <div class="editor-actions">
            <button class="editor-btn editor-btn-primary" type="submit">
              <svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg>
              บันทึกการแก้ไข
            </button>
            <button class="editor-btn" type="button" data-editor-download>
              <svg class="icon" aria-hidden="true"><use href="#i-download"></use></svg>
              ดาวน์โหลด data.json
            </button>
            <button class="editor-btn editor-btn-danger" type="button" data-editor-reset>
              ล้างข้อมูลที่บันทึก
            </button>
          </div>
          <p class="editor-footer-note">
            ข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น · ดาวน์โหลด <code>data.json</code> แล้วอัปโหลดทับ
            <code data-editor-path></code> บน GitHub เพื่อให้ทุกคนเห็นข้อมูลใหม่
          </p>
        </footer>
      </form>
    `;

    form = $("[data-editor-form]", panel);

    toastEl = document.createElement("div");
    toastEl.className = "editor-toast";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    toastEl.setAttribute("data-editor-toast", "");

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    document.body.appendChild(toastEl);

    bindPanelEvents();
  }

  /* -----------------------------------------------------------------------
     ซิงก์ค่าในฟอร์มกับหน้าเว็บ
     ----------------------------------------------------------------------- */
  function updatePreview(el, src) {
    if (!el) return;

    if (src) {
      el.textContent = "";
      const image = document.createElement("img");
      image.setAttribute("src", src);
      image.setAttribute("alt", "");
      el.appendChild(image);
      return;
    }

    el.textContent = "ไม่มีรูป";
  }

  function updatePreviews() {
    if (!form) return;

    const profileRow = $('[data-image="profile"]', form);
    if (profileRow) updatePreview($("[data-image-preview]", profileRow), imageState.profile);

    imageState.projects.forEach((src, index) => {
      const row = $(`[data-image="project-${index}"]`, form);
      if (row) updatePreview($("[data-image-preview]", row), src);
    });
  }

  function syncFormFromDOM() {
    if (!form) return;
    const data = readDOM();

    Object.keys(data.bind).forEach((key) => {
      const input = $(`[data-field="${key}"]`, form);
      if (input) input.value = data.bind[key];
    });

    Object.keys(data.lists).forEach((key) => {
      const input = $(`[data-list-field="${key}"]`, form);
      if (input) input.value = data.lists[key].join(", ");
    });

    Object.keys(data.contacts).forEach((key) => {
      const input = $(`[data-contact-field="${key}"]`, form);
      if (input) input.value = data.contacts[key];
    });

    data.projects.forEach((project, index) => {
      const block = $(`[data-project-form="${index}"]`, form);
      if (!block) return;

      ["title", "type", "year", "desc", "demoUrl", "repoUrl"].forEach((field) => {
        const input = $(`[data-pfield="${field}"]`, block);
        if (input) input.value = project[field] || "";
      });

      const tags = $(`[data-pfield="tags"]`, block);
      if (tags) tags.value = project.tags.join(", ");
    });

    imageState.profile = data.profileImage;
    imageState.projects = data.projects.map((project) => project.image || "");
    updatePreviews();
  }

  /* -----------------------------------------------------------------------
     เปิด / ปิดแผงแก้ไข
     ----------------------------------------------------------------------- */
  function openPanel() {
    if (!panel) return;

    syncFormFromDOM();
    lastFocus = document.activeElement;

    panel.classList.add("is-open");
    backdrop.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("editor-open");

    const firstInput = $("input, textarea", panel);
    window.requestAnimationFrame(() => {
      if (firstInput) firstInput.focus({ preventScroll: true });
      else panel.focus({ preventScroll: true });
    });
  }

  function closePanel() {
    if (!panel || !panel.classList.contains("is-open")) return;

    panel.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("editor-open");

    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function showToast(message) {
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove("is-visible");
    }, 3800);
  }

  /* -----------------------------------------------------------------------
     จัดการรูปภาพในฟอร์ม
     ----------------------------------------------------------------------- */
  function storeImage(key, value) {
    if (key === "profile") {
      imageState.profile = value;
      return;
    }

    if (key.startsWith("project-")) {
      const index = Number(key.split("-")[1]);
      if (Number.isInteger(index) && index >= 0) imageState.projects[index] = value;
    }
  }

  async function handleImageFile(input) {
    const row = input.closest("[data-image]");
    if (!row) return;

    const file = input.files && input.files[0];
    if (!file) return;

    const key = row.getAttribute("data-image") || "";
    const maxSize = key === "profile" ? 900 : 1200;

    try {
      const dataUrl = await compressImage(file, maxSize);
      storeImage(key, dataUrl);

      const urlInput = $("[data-image-url]", row);
      if (urlInput) urlInput.value = "";

      updatePreview($("[data-image-preview]", row), dataUrl);
      showToast("เพิ่มรูปแล้ว — อย่าลืมกดบันทึก");
    } catch (error) {
      showToast(error.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      input.value = "";
    }
  }

  function handleImageUrl(input) {
    const row = input.closest("[data-image]");
    if (!row) return;

    const key = row.getAttribute("data-image") || "";
    const src = normalizeUrl(input.value);

    storeImage(key, src);
    updatePreview($("[data-image-preview]", row), src);
  }

  function handleImageClear(button) {
    const row = button.closest("[data-image]");
    if (!row) return;

    const key = row.getAttribute("data-image") || "";
    storeImage(key, "");

    const urlInput = $("[data-image-url]", row);
    if (urlInput) urlInput.value = "";

    updatePreview($("[data-image-preview]", row), "");
    showToast("เอารูปออกแล้ว — กดบันทึกเพื่อยืนยัน");
  }

  /* -----------------------------------------------------------------------
     ดาวน์โหลดข้อมูลของโปรไฟล์นี้ (data.json) เพื่อนำไปอัปโหลดทับบน GitHub
     ----------------------------------------------------------------------- */
  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime || "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function handleDownload() {
    const data = collectFromForm();

    applyData(data);
    const saved = persist(data);

    downloadFile(JSON.stringify(data, null, 2), "data.json", "application/json;charset=utf-8");
    showToast(
      saved
        ? "ดาวน์โหลด data.json แล้ว — นำไปอัปโหลดทับ " + dataPath() + " บน GitHub"
        : "ดาวน์โหลด data.json แล้ว แต่บันทึกในเบราว์เซอร์ไม่สำเร็จ (ไฟล์ที่ดาวน์โหลดยังมีข้อมูลครบ)"
    );
  }

  /* -----------------------------------------------------------------------
     ผูกเหตุการณ์ทั้งหมดของแผงแก้ไข
     ----------------------------------------------------------------------- */
  function bindPanelEvents() {
    $("[data-editor-close]", panel).addEventListener("click", closePanel);

    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = $$(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]',
        panel
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const data = collectFromForm();
      applyData(data);

      if (persist(data)) {
        syncFormFromDOM();
        showToast("บันทึกแล้ว — ปิดหน้าต่างนี้เพื่อดูผลบนหน้าเว็บ");
      }
    });

    $("[data-editor-download]", panel).addEventListener("click", handleDownload);

    $("[data-editor-reset]", panel).addEventListener("click", () => {
      const confirmed = window.confirm(
        "ล้างข้อมูลที่แก้ไขทั้งหมดในเบราว์เซอร์นี้?\nหน้าเว็บจะกลับไปใช้ข้อมูลตั้งต้นในไฟล์ index.html"
      );
      if (!confirmed) return;

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        /* ถ้าลบไม่ได้ก็แค่โหลดหน้าใหม่ */
      }

      window.location.reload();
    });

    // อัปโหลดรูป / เปลี่ยนลิงก์รูป / เอารูปออก
    form.addEventListener("change", (event) => {
      const target = event.target;

      if (target.matches("[data-image-input]")) {
        handleImageFile(target);
        return;
      }

      if (target.matches("[data-image-url]")) {
        handleImageUrl(target);
      }
    });

    form.addEventListener("click", (event) => {
      const clearButton = event.target.closest("[data-image-clear]");
      if (clearButton) handleImageClear(clearButton);
    });
  }

  /* -----------------------------------------------------------------------
     เริ่มทำงาน
     ----------------------------------------------------------------------- */
  function init() {
    const saved = readSaved();
    if (saved) applyData(saved);

    buildLauncher();
    buildPanel();

    const pathEl = $("[data-editor-path]", panel);
    if (pathEl) pathEl.textContent = dataPath();

    syncFormFromDOM();
  }

  /* รอให้ profile.js โหลดข้อมูลโปรไฟล์เสร็จก่อน แล้วค่อยอ่านค่าจากหน้าเว็บ */
  function start() {
    if (PROFILE && PROFILE.ready && typeof PROFILE.ready.then === "function") {
      PROFILE.ready.then(init, init);
    } else {
      init();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
