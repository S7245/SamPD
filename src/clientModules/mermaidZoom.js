/**
 * Mermaid 图表点击放大预览（全屏 lightbox + 滚轮缩放 + 拖拽平移）。
 *
 * 背景：Docusaurus 的 Mermaid 渲染成内联 <svg>，而 docusaurus-plugin-image-zoom
 * 只匹配 <img>，所以 Mermaid 不会被它的缩放接管，这里单独处理。
 *
 * 用法：在 docusaurus.config.ts 里加 clientModules: ['./src/clientModules/mermaidZoom.js']
 */

// 仅在浏览器端执行（SSR 时 ExecutionEnvironment.canUseDOM 为 false）。
import ExecutionEnvironment from "@docusaurus/ExecutionEnvironment";

if (ExecutionEnvironment.canUseDOM) {
  let overlay;
  let stage; // 承载 svg 克隆的可变换容器
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 12;
  const DEBUG_PREFIX = "[DEBUG-mermaidZoom]";

  function debugLog(...args) {
    console.log(DEBUG_PREFIX, ...args);
  }

  function getState() {
    const containers = document.querySelectorAll(".docusaurus-mermaid-container");
    const svgs = document.querySelectorAll(".docusaurus-mermaid-container svg");

    return {
      containers: containers.length,
      svgs: svgs.length,
      overlayExists: Boolean(overlay),
      overlayOpen: isOverlayOpen(),
      scale,
      tx,
      ty,
    };
  }

  function isOverlayOpen() {
    return Boolean(overlay && overlay.classList.contains("is-open"));
  }

  function findMermaidContainer(event) {
    const path =
      typeof event.composedPath === "function" ? event.composedPath() : [];

    for (const node of path) {
      if (!(node instanceof Element)) continue;
      const container = node.closest(".docusaurus-mermaid-container");
      if (container) return container;
    }

    const fallbackTarget =
      event.target instanceof Element ? event.target : event.target?.parentElement;

    return fallbackTarget?.closest(".docusaurus-mermaid-container") ?? null;
  }

  function applyTransform() {
    if (stage) {
      stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }
  }

  function ensureOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "mermaid-zoom-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "图表放大预览");

    stage = document.createElement("div");
    stage.className = "mermaid-zoom-stage";
    overlay.appendChild(stage);

    const hint = document.createElement("div");
    hint.className = "mermaid-zoom-hint";
    hint.textContent = "滚轮缩放 · 拖拽平移 · Esc / 点击空白关闭";
    overlay.appendChild(hint);

    const closeBtn = document.createElement("button");
    closeBtn.className = "mermaid-zoom-close";
    closeBtn.setAttribute("aria-label", "关闭");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", close);
    overlay.appendChild(closeBtn);

    // 点击空白（非图表本体）关闭
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) {
        startX = e.clientX;
        startY = e.clientY;
      }
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    // 滚轮缩放（以光标为中心）
    overlay.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = stage.getBoundingClientRect();
        const cx = e.clientX - (rect.left + rect.width / 2);
        const cy = e.clientY - (rect.top + rect.height / 2);
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
        const ratio = next / scale;
        // 让缩放围绕鼠标位置
        tx -= cx * (ratio - 1);
        ty -= cy * (ratio - 1);
        scale = next;
        applyTransform();
      },
      { passive: false }
    );

    // 拖拽平移
    stage.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX - tx;
      startY = e.clientY - ty;
      stage.style.cursor = "grabbing";
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      tx = e.clientX - startX;
      ty = e.clientY - startY;
      applyTransform();
    });
    window.addEventListener("mouseup", () => {
      dragging = false;
      if (stage) stage.style.cursor = "grab";
    });

    document.body.appendChild(overlay);
    debugLog("overlay-created", getState());
    return overlay;
  }

  function open(svg) {
    debugLog("open-start", {
      viewBox: svg.getAttribute("viewBox"),
      width: svg.getAttribute("width"),
      height: svg.getAttribute("height"),
    });
    ensureOverlay();
    scale = 1;
    tx = 0;
    ty = 0;
    stage.innerHTML = "";

    const clone = svg.cloneNode(true);
    // 不要删除 id：Mermaid 把样式以 `#mermaid-svg-xxx{...}` 的形式注入到 svg 内部的
    // <style> 里，删掉 id 会让这些作用域样式全部失效，图表会退化成无样式的黑块。
    // 同一 id 在页面里重复出现对 CSS 匹配无害（两者都会被选中）。

    // Mermaid 的 svg 只有 width="100%"、没有 height，尺寸靠 viewBox 比例推导。
    // 克隆到收缩包裹内容的 flex stage 里后，width:auto + height:auto 没有可解析的
    // 容器宽度，会塌缩成 0×0。这里用 viewBox 计算一个适配视口的显式像素尺寸。
    const viewBox = (svg.getAttribute("viewBox") || "")
      .split(/[\s,]+/)
      .map(Number);
    let baseWidth = viewBox[2];
    let baseHeight = viewBox[3];
    if (!baseWidth || !baseHeight) {
      const rect = svg.getBoundingClientRect();
      baseWidth = rect.width || 800;
      baseHeight = rect.height || 600;
    }
    // 留出白色卡片的内边距(约 48px)和顶部关闭按钮/底部提示的空间，
    // 用视口的一部分减去固定留白来计算适配比例，避免图表贴边或被裁切。
    const PADDING = 120;
    const fit = Math.min(
      (window.innerWidth - PADDING) / baseWidth,
      (window.innerHeight - PADDING) / baseHeight
    );
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.style.maxWidth = "none";
    clone.style.maxHeight = "none";
    clone.style.width = `${baseWidth * fit}px`;
    clone.style.height = `${baseHeight * fit}px`;
    stage.appendChild(clone);

    applyTransform();
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    debugLog("open-success", getState());
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    debugLog("close", getState());
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  // 用捕获阶段兜住 Mermaid / SVG 内部可能吞掉的点击事件。
  document.addEventListener(
    "click",
    (e) => {
      if (isOverlayOpen()) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        return;
      }

      try {
        const container = findMermaidContainer(e);
        if (!container) return;

        const svg = container.querySelector("svg");
        debugLog("click-detected", {
          targetTag: e.target?.tagName ?? null,
          containerClass: container.className,
          hasSvg: Boolean(svg),
        });
        if (!svg) return;

        e.preventDefault();
        open(svg);
      } catch (error) {
        console.error(DEBUG_PREFIX, "click-handler-error", error);
      }
    },
    true
  );

  window.__mermaidZoomDebug = {
    close,
    getState,
    openFirst() {
      const svg = document.querySelector(".docusaurus-mermaid-container svg");
      if (!svg) {
        debugLog("openFirst-no-svg", getState());
        return false;
      }
      open(svg);
      return true;
    },
    scan() {
      const state = getState();
      debugLog("scan", state);
      return state;
    },
  };

  debugLog("module-ready", getState());

  // Mermaid 是异步/路由切换后渲染的，这里只保留点击逻辑；
  // 光标统一交给全局 CSS 处理，避免再依赖 MutationObserver。
}
