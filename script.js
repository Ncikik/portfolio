/* =========================================================================
   PORTFOLIO — script.js
   -------------------------------------------------------------------------
   ไฟล์นี้ดูแล 6 อย่าง:
   1) สลับโหมดสว่าง/มืด + จำค่าไว้ใน localStorage
   2) เมนูมือถือ
   3) เงา navbar ตอนเลื่อนหน้า
   4) แอนิเมชัน reveal ตอนเลื่อนมาถึงแต่ละส่วน
   5) ไฮไลต์เมนูตามส่วนที่กำลังดูอยู่
   6) คัดลอกอีเมล + ปุ่มกลับขึ้นด้านบน + ปีลิขสิทธิ์
   ========================================================================= */

(() => {
  "use strict";

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const themeKey = "portfolio-theme";

  /* -----------------------------------------------------------------------
     1. โหมดสว่าง / โหมดมืด
     ----------------------------------------------------------------------- */
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const themeColors = { light: "#f6f8fc", dark: "#07101f" };

  function getSavedTheme() {
    try {
      return localStorage.getItem(themeKey);
    } catch (error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(themeKey, theme);
    } catch (error) {
      /* ถ้าเบราว์เซอร์ปิด localStorage ไว้ ก็ยังสลับโหมดได้ในหน้านี้ */
    }
  }

  function applyTheme(theme, persist) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", nextTheme);

    if (persist) saveTheme(nextTheme);

    if (themeToggle) {
      const isDark = nextTheme === "dark";
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด");
    }

    if (themeMeta) {
      themeMeta.setAttribute("content", themeColors[nextTheme]);
    }
  }

  // ตั้งค่าปุ่มให้ตรงกับธีมที่สคริปต์ใน <head> เลือกไว้แล้ว
  applyTheme(root.getAttribute("data-theme"), false);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(nextTheme, true);
    });
  }

  // ถ้าผู้ใช้ยังไม่เคยเลือกธีมเอง ให้ตามการตั้งค่าระบบ
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  if (typeof systemTheme.addEventListener === "function") {
    systemTheme.addEventListener("change", (event) => {
      if (!getSavedTheme()) {
        applyTheme(event.matches ? "dark" : "light", false);
      }
    });
  }

  /* -----------------------------------------------------------------------
     2. เมนูมือถือ
     ----------------------------------------------------------------------- */
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const navMenu = document.getElementById("primary-nav");
  const mobileQuery = window.matchMedia("(max-width: 900px)");

  function setMenu(open) {
    if (!menuToggle || !navMenu) return;

    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "ปิดเมนู" : "เปิดเมนู");
    navMenu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open && mobileQuery.matches);
  }

  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
      setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
    });

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("click", (event) => {
      if (
        menuToggle.getAttribute("aria-expanded") === "true" &&
        !navMenu.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        setMenu(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenu(false);
    });

    const handleBreakpointChange = (event) => {
      if (!event.matches) setMenu(false);
    };

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", handleBreakpointChange);
    } else {
      mobileQuery.addListener(handleBreakpointChange);
    }
  }

  /* -----------------------------------------------------------------------
     3. เงา navbar + ปุ่มกลับขึ้นด้านบน
     ----------------------------------------------------------------------- */
  const header = document.querySelector(".site-header");
  const backToTop = document.querySelector("[data-back-to-top]");

  function handleScroll() {
    const scrolled = window.scrollY > 10;

    if (header) header.classList.toggle("is-scrolled", scrolled);
    if (backToTop) backToTop.classList.toggle("is-visible", window.scrollY > 650);
  }

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
    });
  }

  /* -----------------------------------------------------------------------
     4. แอนิเมชัน reveal เมื่อเลื่อนมาถึง
     ----------------------------------------------------------------------- */
  const revealItems = document.querySelectorAll(".reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -7% 0px" }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* -----------------------------------------------------------------------
     5. ไฮไลต์เมนูตามส่วนที่กำลังดูอยู่ (scroll spy)
     ----------------------------------------------------------------------- */
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const sectionLinks = new Map(
    navLinks
      .map((link) => {
        const href = link.getAttribute("href") || "";
        const id = href.startsWith("#") ? href.slice(1) : "";
        return id ? [id, link] : null;
      })
      .filter(Boolean)
  );

  function setActiveLink(id) {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if ("IntersectionObserver" in window && sectionLinks.size > 0) {
    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveLink(entry.target.id);
        });
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );

    sectionLinks.forEach((link, id) => {
      const section = document.getElementById(id);
      if (section) spyObserver.observe(section);
    });
  }

  /* -----------------------------------------------------------------------
     6. เลื่อนแบบนุ่มนวล + คัดลอกอีเมล + ปีลิขสิทธิ์
     ----------------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      if (href === "#top") {
        event.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? "auto" : "smooth"
        });
        return;
      }

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start"
      });

      try {
        history.pushState(null, "", href);
      } catch (error) {
        /* บางเบราว์เซอร์ไม่อนุญาตให้เปลี่ยน URL ตอนเปิดไฟล์ในเครื่อง */
      }

      if (sectionLinks.has(href.slice(1))) setActiveLink(href.slice(1));
    });
  });

  const liveRegion = document.querySelector("[data-live-region]");

  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // วิธีสำรองสำหรับการเปิดไฟล์ผ่าน file://
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) throw new Error("copy failed");
  }

  document.querySelectorAll("[data-copy]").forEach((button) => {
    const label = button.querySelector("[data-copy-label]");
    let resetTimer = null;

    button.addEventListener("click", async () => {
      const value = button.getAttribute("data-copy");
      if (!value) return;

      try {
        await copyToClipboard(value);

        button.classList.add("is-copied");
        button.setAttribute("aria-label", "คัดลอกอีเมลแล้ว");
        if (label) label.textContent = "คัดลอกแล้ว";
        if (liveRegion) liveRegion.textContent = "คัดลอกอีเมลแล้ว";

        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
          button.setAttribute("aria-label", `คัดลอกอีเมล ${value}`);
          if (label) label.textContent = "คัดลอก";
          if (liveRegion) liveRegion.textContent = "";
        }, 2200);
      } catch (error) {
        if (liveRegion) liveRegion.textContent = "คัดลอกไม่สำเร็จ กรุณาเลือกอีเมลด้วยตัวเอง";
      }
    });
  });

  const yearElement = document.getElementById("year");
  if (yearElement) yearElement.textContent = String(new Date().getFullYear());
})();
