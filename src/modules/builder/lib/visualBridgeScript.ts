/**
 * Script injectado no iframe do editor visual.
 * Faz bridge entre cliques/edições no DOM e o React via postMessage.
 *
 * Mensagens enviadas para o pai:
 *  - { kind: "ready" }
 *  - { kind: "select", bid, tag, computed: {...}, attrs: { src, alt, href } }
 *  - { kind: "patch", patch: BuilderPatch }
 *
 * Mensagens recebidas do pai:
 *  - { kind: "selectBid", bid }
 *  - { kind: "clearSelection" }
 */
export const VISUAL_BRIDGE_SCRIPT = `
(function(){
  const BID = "data-bid";
  let selectedEl = null;
  let overlay = null;

  function send(msg){ parent.postMessage({ __builder: true, ...msg }, "*"); }

  function ensureOverlay(){
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.setAttribute("data-builder-overlay","");
    Object.assign(overlay.style, {
      position: "absolute",
      pointerEvents: "none",
      border: "2px solid #3b82f6",
      borderRadius: "2px",
      zIndex: 2147483647,
      transition: "all 80ms ease-out",
      boxShadow: "0 0 0 1px rgba(59,130,246,.25)",
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function positionOverlay(el){
    const o = ensureOverlay();
    if (!el || !el.getBoundingClientRect){ o.style.display = "none"; return; }
    const r = el.getBoundingClientRect();
    o.style.display = "block";
    o.style.top = (r.top + window.scrollY - 2) + "px";
    o.style.left = (r.left + window.scrollX - 2) + "px";
    o.style.width = (r.width + 4) + "px";
    o.style.height = (r.height + 4) + "px";
  }

  function pickAttrs(el){
    const out = {};
    ["src","alt","href","title","placeholder"].forEach((k) => {
      if (el.hasAttribute(k)) out[k] = el.getAttribute(k);
    });
    return out;
  }

  function pickComputed(el){
    const cs = getComputedStyle(el);
    const inline = el.style;
    function val(prop){ return inline.getPropertyValue(prop) || cs.getPropertyValue(prop); }
    return {
      color: rgbToHex(cs.color),
      backgroundColor: rgbToHex(cs.backgroundColor),
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      textAlign: cs.textAlign,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      paddingTop: cs.paddingTop,
      paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      marginTop: cs.marginTop,
      marginRight: cs.marginRight,
      marginBottom: cs.marginBottom,
      marginLeft: cs.marginLeft,
      borderRadius: cs.borderRadius,
    };
  }

  function rgbToHex(rgb){
    if (!rgb) return "";
    const m = rgb.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return rgb;
    const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
    if (parts.length >= 3){
      const a = parts[3];
      if (a !== undefined && a < 1) return rgb; // mantém rgba
      const hex = "#" + parts.slice(0,3).map((n) => Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0")).join("");
      return hex;
    }
    return rgb;
  }

  function selectEl(el){
    if (!el || !el.getAttribute) return;
    const bid = el.getAttribute(BID);
    if (!bid) return;
    selectedEl = el;
    positionOverlay(el);
    send({
      kind: "select",
      bid,
      tag: el.tagName.toLowerCase(),
      attrs: pickAttrs(el),
      computed: pickComputed(el),
      text: (el.children.length === 0 ? (el.textContent || "") : null),
    });
  }

  function clearSel(){
    selectedEl = null;
    if (overlay) overlay.style.display = "none";
  }

  document.addEventListener("click", function(e){
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    e.preventDefault();
    e.stopPropagation();
    selectEl(t.closest("[" + BID + "]") || t);
  }, true);

  document.addEventListener("dblclick", function(e){
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const el = t.closest("[" + BID + "]");
    if (!el) return;
    if (el.children.length === 0){
      el.setAttribute("contenteditable","true");
      el.focus();
      el.addEventListener("blur", function onBlur(){
        el.removeAttribute("contenteditable");
        el.removeEventListener("blur", onBlur);
        const bid = el.getAttribute(BID);
        if (bid) send({ kind: "patch", patch: { type: "text", bid: bid, value: el.textContent || "" } });
      });
      const r = document.createRange();
      r.selectNodeContents(el);
      const s = window.getSelection();
      s.removeAllRanges(); s.addRange(r);
    }
  }, true);

  // Bloquear navegação por links durante edição
  document.addEventListener("submit", function(e){ e.preventDefault(); }, true);

  // hover preview
  let hoverOverlay = null;
  function ensureHover(){
    if (hoverOverlay) return hoverOverlay;
    hoverOverlay = document.createElement("div");
    Object.assign(hoverOverlay.style, {
      position: "absolute",
      pointerEvents: "none",
      border: "1px dashed #94a3b8",
      borderRadius: "2px",
      zIndex: 2147483646,
      display: "none",
    });
    document.body.appendChild(hoverOverlay);
    return hoverOverlay;
  }
  document.addEventListener("mouseover", function(e){
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const el = t.closest("[" + BID + "]");
    if (!el || el === selectedEl){ if (hoverOverlay) hoverOverlay.style.display = "none"; return; }
    const o = ensureHover();
    const r = el.getBoundingClientRect();
    o.style.display = "block";
    o.style.top = (r.top + window.scrollY - 1) + "px";
    o.style.left = (r.left + window.scrollX - 1) + "px";
    o.style.width = (r.width + 2) + "px";
    o.style.height = (r.height + 2) + "px";
  }, true);
  document.addEventListener("mouseout", function(){
    if (hoverOverlay) hoverOverlay.style.display = "none";
  }, true);

  // ============ Barra de acções da secção ============
  function sectionOf(el){
    let cur = el;
    while (cur && cur.parentElement && cur.parentElement !== document.body){
      cur = cur.parentElement;
    }
    return (cur && cur.parentElement === document.body && cur.getAttribute && cur.getAttribute(BID)) ? cur : null;
  }

  let toolbar = null;
  function ensureToolbar(){
    if (toolbar) return toolbar;
    toolbar = document.createElement("div");
    toolbar.setAttribute("data-builder-toolbar","");
    Object.assign(toolbar.style, {
      position: "absolute",
      display: "none",
      zIndex: 2147483647,
      background: "#0f172a",
      color: "#fff",
      borderRadius: "8px",
      padding: "4px",
      gap: "2px",
      alignItems: "center",
      boxShadow: "0 6px 20px rgba(15,23,42,.28)",
      font: "500 12px system-ui, sans-serif",
    });
    const actions = [
      ["moveUp", "\\u2191", "Mover para cima"],
      ["moveDown", "\\u2193", "Mover para baixo"],
      ["duplicate", "\\u29c9", "Duplicar secção"],
      ["saveBlock", "\\u2605", "Guardar como bloco"],
      ["delete", "\\u2715", "Eliminar secção"],
    ];
    actions.forEach(function(a){
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = a[1];
      b.title = a[2];
      b.setAttribute("aria-label", a[2]);
      Object.assign(b.style, {
        all: "unset",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: "6px",
        lineHeight: "1",
        color: a[0] === "delete" ? "#fca5a5" : "#fff",
      });
      b.addEventListener("mouseenter", function(){ b.style.background = "rgba(255,255,255,.14)"; });
      b.addEventListener("mouseleave", function(){ b.style.background = "transparent"; });
      b.addEventListener("click", function(ev){
        ev.preventDefault(); ev.stopPropagation();
        const sec = selectedEl ? sectionOf(selectedEl) : null;
        if (sec) send({ kind: "action", action: a[0], bid: sec.getAttribute(BID) });
      }, true);
      toolbar.appendChild(b);
    });
    document.body.appendChild(toolbar);
    return toolbar;
  }

  function syncToolbar(){
    const t = ensureToolbar();
    const sec = selectedEl ? sectionOf(selectedEl) : null;
    if (!sec){ t.style.display = "none"; return; }
    const r = sec.getBoundingClientRect();
    t.style.display = "flex";
    t.style.top = Math.max(4, r.top + window.scrollY - 40) + "px";
    t.style.left = (r.left + window.scrollX + 4) + "px";
  }

  // ============ Drop de blocos ============
  let dropLine = null;
  function ensureDropLine(){
    if (dropLine) return dropLine;
    dropLine = document.createElement("div");
    Object.assign(dropLine.style, {
      position: "absolute",
      display: "none",
      height: "4px",
      background: "#3b82f6",
      borderRadius: "999px",
      zIndex: 2147483647,
      pointerEvents: "none",
      boxShadow: "0 0 0 3px rgba(59,130,246,.25)",
    });
    document.body.appendChild(dropLine);
    return dropLine;
  }

  let dropTarget = { bid: null, position: "append" };

  function updateDropIndicator(clientY){
    const sections = Array.from(document.body.children).filter(function(el){
      return el.getAttribute && el.getAttribute(BID);
    });
    const line = ensureDropLine();
    if (sections.length === 0){
      dropTarget = { bid: null, position: "append" };
      line.style.display = "block";
      line.style.top = (window.scrollY + 8) + "px";
      line.style.left = "8px";
      line.style.width = (document.documentElement.clientWidth - 16) + "px";
      return;
    }
    let target = sections[sections.length - 1];
    let position = "after";
    for (let i = 0; i < sections.length; i++){
      const r = sections[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2){ target = sections[i]; position = "before"; break; }
      if (clientY <= r.bottom){ target = sections[i]; position = "after"; break; }
    }
    dropTarget = { bid: target.getAttribute(BID), position: position };
    const r = target.getBoundingClientRect();
    line.style.display = "block";
    line.style.left = (r.left + window.scrollX) + "px";
    line.style.width = r.width + "px";
    line.style.top = ((position === "before" ? r.top : r.bottom) + window.scrollY - 2) + "px";
  }

  function hideDropLine(){ if (dropLine) dropLine.style.display = "none"; }

  document.addEventListener("dragover", function(e){
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    updateDropIndicator(e.clientY);
  });
  document.addEventListener("dragleave", function(e){
    if (e.relatedTarget) return;
    hideDropLine();
  });
  document.addEventListener("drop", function(e){
    e.preventDefault();
    updateDropIndicator(e.clientY);
    hideDropLine();
    send({ kind: "drop", bid: dropTarget.bid, position: dropTarget.position });
  });

  window.addEventListener("message", function(e){
    const data = e.data;
    if (!data || !data.__builderCmd) return;
    if (data.kind === "selectBid"){
      const el = document.querySelector("[" + BID + "='" + data.bid + "']");
      if (el) { selectEl(el); }
    } else if (data.kind === "clearSelection"){
      clearSel();
      syncToolbar();
    } else if (data.kind === "reposition"){
      if (selectedEl) positionOverlay(selectedEl);
      syncToolbar();
    } else if (data.kind === "dragEnd"){
      hideDropLine();
    }
  });

  const _origSelectEl = selectEl;
  selectEl = function(el){ _origSelectEl(el); syncToolbar(); };

  window.addEventListener("scroll", function(){ if (selectedEl) { positionOverlay(selectedEl); syncToolbar(); } }, true);
  window.addEventListener("resize", function(){ if (selectedEl) { positionOverlay(selectedEl); syncToolbar(); } });

  send({ kind: "ready" });
})();
`;
