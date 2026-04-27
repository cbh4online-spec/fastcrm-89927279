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

  window.addEventListener("message", function(e){
    const data = e.data;
    if (!data || !data.__builderCmd) return;
    if (data.kind === "selectBid"){
      const el = document.querySelector("[" + BID + "='" + data.bid + "']");
      if (el) selectEl(el);
    } else if (data.kind === "clearSelection"){
      clearSel();
    } else if (data.kind === "reposition"){
      if (selectedEl) positionOverlay(selectedEl);
    }
  });

  window.addEventListener("scroll", function(){ if (selectedEl) positionOverlay(selectedEl); }, true);
  window.addEventListener("resize", function(){ if (selectedEl) positionOverlay(selectedEl); });

  send({ kind: "ready" });
})();
`;
