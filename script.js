/* OBSIDIA — progressive enhancement. Every primary link works without JS. */
(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("#site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const menuLabel = toggle?.querySelector(".nav-label");
  const progress = document.querySelector("[data-progress]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 800px)");

  function closeMenu(restoreFocus = false) {
    nav?.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    if (menuLabel) menuLabel.textContent = "Menu";
    if (restoreFocus) toggle?.focus();
  }

  if (nav && toggle) {
    toggle.hidden = false;
    nav.classList.add("is-enhanced");
    document.body.classList.add("js-ready");
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      if (menuLabel) menuLabel.textContent = open ? "Close" : "Menu";
    });
    nav.addEventListener("click", event => {
      if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) closeMenu(true);
    });
    document.addEventListener("click", event => {
      if (nav.classList.contains("is-open") && header && !header.contains(event.target)) closeMenu();
    });
    document.addEventListener("focusin", event => {
      if (mobile.matches && nav.classList.contains("is-open") && header && !header.contains(event.target)) closeMenu();
    });
    if (mobile.addEventListener) mobile.addEventListener("change", () => closeMenu());
    else mobile.addListener(() => closeMenu());
  }

  // Native scrolling: the site never takes over the wheel or touch gestures.
  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    const y = Math.max(0, window.scrollY);
    header?.classList.toggle("is-scrolled", y > 24);
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = "scaleX(" + (total > 0 ? Math.min(1, y / total) : 0) + ")";
  }
  function scheduleScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }
  window.addEventListener("scroll", scheduleScroll, { passive: true });
  window.addEventListener("resize", scheduleScroll, { passive: true });
  window.addEventListener("load", updateScroll, { once: true });
  updateScroll();

  // Each accordion group is independent. Opening an FAQ never closes a service.
  document.querySelectorAll("[data-accordion-group]").forEach(group => {
    const details = Array.from(group.querySelectorAll("details"));
    details.forEach(item => {
      item.addEventListener("toggle", () => {
        if (item.open) details.forEach(other => {
          if (other !== item && other.open) other.open = false;
        });
        scheduleScroll();
      });
    });
  });

  function revealHashTarget() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    target.classList.remove("will-reveal");
    target.classList.add("is-visible");
    if (target.tagName === "DETAILS") {
      const group = target.closest("[data-accordion-group]");
      group?.querySelectorAll("details[open]").forEach(other => { if (other !== target) other.open = false; });
      target.open = true;
      requestAnimationFrame(() => target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" }));
    }
  }
  window.addEventListener("hashchange", revealHashTarget);
  // Also handle repeated clicks on the current service hash.
  document.querySelectorAll('.capabilities a[href^="#"]').forEach(link => {
    link.addEventListener("click", () => {
      const target = document.getElementById(link.getAttribute("href").slice(1));
      if (target?.tagName === "DETAILS") {
        const group = target.closest("[data-accordion-group]");
        group?.querySelectorAll("details[open]").forEach(other => { if (other !== target) other.open = false; });
        target.open = true;
        target.classList.remove("will-reveal");
      }
      if (location.hash === link.getAttribute("href")) requestAnimationFrame(revealHashTarget);
    });
  });

  // Hide only off-screen content, after observers are ready; no invisible page
  // if scripts, images, fonts or optional browser APIs fail to load.
  let revealObserver;
  const pendingReveals = new Set();
  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        entry.target.classList.remove("will-reveal");
        pendingReveals.delete(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.025, rootMargin: "0px 0px 24px 0px" });
    document.querySelectorAll(".reveal").forEach(item => {
      if (item.getBoundingClientRect().top > window.innerHeight + 40) {
        pendingReveals.add(item);
        revealObserver.observe(item);
        item.classList.add("will-reveal");
      }
    });
  }

  // Mark the relevant section in the main navigation without reading fake state.
  if ("IntersectionObserver" in window) {
    const visibleSections = new Set();
    const ids = ["services", "approach", "plans"];
    const activeObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleSections.add(entry.target.id);
        else visibleSections.delete(entry.target.id);
      });
      const active = ids.find(id => visibleSections.has(id));
      document.querySelectorAll("[data-nav-section]").forEach(link => {
        if (link.dataset.navSection === active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-20% 0px -45% 0px", threshold: 0 });
    ids.forEach(id => { const el = document.getElementById(id); if (el) activeObserver.observe(el); });
  }

  // Small, pointer-led movement on the artwork only; no cursor replacement.
  const art = document.querySelector("[data-art]");
  const surface = document.querySelector("[data-art-surface]");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let artFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  function resetArt() {
    if (artFrame) cancelAnimationFrame(artFrame);
    artFrame = 0;
    surface?.style.removeProperty("--art-x");
    surface?.style.removeProperty("--art-y");
    surface?.style.removeProperty("--art-r");
  }
  if (art && surface) {
    art.addEventListener("pointermove", event => {
      if (!finePointer.matches || reducedMotion.matches || mobile.matches || document.hidden) return;
      const rect = art.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width - .5;
      pointerY = (event.clientY - rect.top) / rect.height - .5;
      if (!artFrame) artFrame = requestAnimationFrame(() => {
        surface.style.setProperty("--art-x", (pointerX * 12).toFixed(2) + "px");
        surface.style.setProperty("--art-y", (pointerY * 10).toFixed(2) + "px");
        surface.style.setProperty("--art-r", (pointerX * 1.2).toFixed(2) + "deg");
        artFrame = 0;
      });
    }, { passive: true });
    art.addEventListener("pointerleave", resetArt);
    document.addEventListener("visibilitychange", resetArt);
  }

  const onMotionChange = () => {
    if (!reducedMotion.matches) return;
    resetArt();
    revealObserver?.disconnect();
    pendingReveals.forEach(item => {
      item.classList.remove("will-reveal");
      item.classList.add("is-visible");
    });
    pendingReveals.clear();
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", onMotionChange);
  else reducedMotion.addListener(onMotionChange);

  document.addEventListener("focusin", event => {
    const item = event.target.closest?.(".will-reveal");
    if (item) {
      item.classList.remove("will-reveal");
      item.classList.add("is-visible");
      pendingReveals.delete(item);
      revealObserver?.unobserve(item);
    }
  });
  document.querySelectorAll("[data-year]").forEach(el => {
    el.textContent = String(new Date().getFullYear());
  });
  revealHashTarget();
})();
