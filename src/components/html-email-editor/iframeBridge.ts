/**
 * Script injected into the iframe to detect and handle editable elements.
 * This runs inside the iframe context.
 */
export function getIframeScript(): string {
  return `
(function() {
  const TYPE_LABELS = {
    cta: 'Botão CTA',
    text: 'Texto',
    heading: 'Título',
    image: 'Imagem',
    link: 'Link',
    divider: 'Divisor',
    container: 'Contentor'
  };

  let idCounter = 0;
  let selectedId = null;
  let hoverLabel = null;

  function generateId() {
    return 'editable-' + (++idCounter);
  }

  function classifyElement(el) {
    const tag = el.tagName.toLowerCase();
    const cls = (el.className || '').toLowerCase();
    const style = window.getComputedStyle(el);

    // Headings
    if (['h1','h2','h3','h4','h5','h6'].includes(tag)) return 'heading';

    // Images
    if (tag === 'img') return 'image';

    // HR / dividers
    if (tag === 'hr') return 'divider';

    // Buttons/CTAs
    if (tag === 'button') return 'cta';
    if (tag === 'a') {
      if (cls.match(/btn|button|cta/) ||
          style.display === 'block' ||
          style.display === 'inline-block' && parseFloat(style.paddingTop) > 6 && parseFloat(style.paddingBottom) > 6) {
        return 'cta';
      }
      return 'link';
    }

    // Text content
    if (['p','span','li','td','th','label','strong','em','b','i','u'].includes(tag)) {
      if (el.children.length === 0 || el.textContent.trim().length > 0) return 'text';
    }

    // Containers with background
    if (['table','tr','td','div','section','header','footer'].includes(tag)) {
      if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
        return 'container';
      }
    }

    return null;
  }

  function getRelevantStyles(el) {
    const cs = window.getComputedStyle(el);
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      textAlign: cs.textAlign,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      padding: cs.padding,
      margin: cs.margin,
      borderRadius: cs.borderRadius,
      display: cs.display,
      width: cs.width,
      maxWidth: cs.maxWidth,
    };
  }

  function getAttributes(el) {
    const attrs = {};
    for (const attr of el.attributes) {
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  // Mark all editable elements
  function scanElements() {
    const all = document.querySelectorAll('*');
    all.forEach(el => {
      if (el.dataset.editable) return; // already marked
      const type = classifyElement(el);
      if (!type) return;
      
      if (!el.id || !el.id.startsWith('editable-')) {
        el.id = generateId();
      }
      el.dataset.editable = type;
    });
  }

  // Create hover label
  function createHoverLabel() {
    hoverLabel = document.createElement('div');
    hoverLabel.style.cssText = 'position:fixed;z-index:99999;padding:2px 8px;border-radius:4px;font-size:11px;font-family:system-ui;color:#fff;background:#3b82f6;pointer-events:none;display:none;white-space:nowrap;';
    document.body.appendChild(hoverLabel);
  }

  // Event handlers
  function handleMouseOver(e) {
    const el = e.target.closest('[data-editable]');
    if (!el) return;
    el.style.outline = el.id === selectedId ? '2px solid #3b82f6' : '2px dashed rgba(99,179,237,0.5)';
    el.style.outlineOffset = '2px';
    el.style.cursor = 'pointer';

    const rect = el.getBoundingClientRect();
    hoverLabel.textContent = TYPE_LABELS[el.dataset.editable] || el.dataset.editable;
    hoverLabel.style.display = 'block';
    hoverLabel.style.left = rect.left + 'px';
    hoverLabel.style.top = Math.max(0, rect.top - 24) + 'px';
  }

  function handleMouseOut(e) {
    const el = e.target.closest('[data-editable]');
    if (!el) return;
    if (el.id === selectedId) {
      el.style.outline = '2px solid #3b82f6';
    } else {
      el.style.outline = '';
    }
    el.style.outlineOffset = '';
    el.style.cursor = '';
    hoverLabel.style.display = 'none';
  }

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.target.closest('[data-editable]');
    if (!el) {
      // Deselect
      if (selectedId) {
        const prev = document.getElementById(selectedId);
        if (prev) prev.style.outline = '';
        selectedId = null;
        window.parent.postMessage({ type: 'html-editor-deselect' }, '*');
      }
      return;
    }

    // Deselect previous
    if (selectedId) {
      const prev = document.getElementById(selectedId);
      if (prev) prev.style.outline = '';
    }

    selectedId = el.id;
    el.style.outline = '2px solid #3b82f6';
    el.style.outlineOffset = '2px';

    window.parent.postMessage({
      type: 'html-editor-select',
      payload: {
        id: el.id,
        elementType: el.dataset.editable,
        tagName: el.tagName.toLowerCase(),
        content: el.tagName.toLowerCase() === 'img' ? el.src : el.innerHTML,
        textContent: el.textContent || '',
        attributes: getAttributes(el),
        styles: getRelevantStyles(el),
        outerHtml: el.outerHTML,
      }
    }, '*');
  }

  // Listen for updates from parent
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== 'html-editor-update') return;
    const { id, property, value } = e.data.payload;
    const el = document.getElementById(id);
    if (!el) return;

    switch (property) {
      case 'textContent':
        el.textContent = value;
        break;
      case 'innerHTML':
        el.innerHTML = value;
        break;
      case 'src':
        el.src = value;
        break;
      case 'href':
        el.href = value;
        break;
      case 'alt':
        el.alt = value;
        break;
      default:
        // CSS property
        el.style[property] = value;
        break;
    }

    // Send back updated HTML
    window.parent.postMessage({
      type: 'html-editor-html-updated',
      payload: document.documentElement.outerHTML,
    }, '*');
  });

    // Listen for outerHTML replacement
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'html-editor-update' && e.data.payload?.property === 'outerHTML') {
      const { id, value } = e.data.payload;
      const el = document.getElementById(id);
      if (el) {
        el.outerHTML = value;
        scanElements(); // Re-scan after replacement
        window.parent.postMessage({
          type: 'html-editor-html-updated',
          payload: document.documentElement.outerHTML,
        }, '*');
      }
      return;
    }
  });

  // Listen for tree request
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'html-editor-get-tree') {
      const items = [];
      document.querySelectorAll('[data-editable]').forEach(el => {
        items.push({
          id: el.id,
          type: el.dataset.editable,
          tagName: el.tagName.toLowerCase(),
          preview: el.tagName.toLowerCase() === 'img' ? (el.alt || el.src || 'Imagem').substring(0, 40) : (el.textContent || '').trim().substring(0, 40),
        });
      });
      window.parent.postMessage({ type: 'html-editor-tree', payload: items }, '*');
    }
  });

  // Listen for select-by-id
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'html-editor-select-by-id') {
      const el = document.getElementById(e.data.payload);
      if (el) {
        el.click();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  // Listen for full HTML request
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'html-editor-get-html') {
      // Remove editor artifacts before exporting
      document.querySelectorAll('[data-editable]').forEach(el => {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.cursor = '';
      });
      if (hoverLabel) hoverLabel.remove();

      const cleanHtml = document.documentElement.outerHTML;
      window.parent.postMessage({
        type: 'html-editor-full-html',
        payload: cleanHtml,
      }, '*');

      // Re-setup
      createHoverLabel();
      if (selectedId) {
        const sel = document.getElementById(selectedId);
        if (sel) {
          sel.style.outline = '2px solid #3b82f6';
          sel.style.outlineOffset = '2px';
        }
      }
    }
  });

  // Init
  createHoverLabel();
  scanElements();
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick);
})();
`;
}

export function getIframeStyles(): string {
  return `
[data-editable]:hover {
  outline: 2px dashed rgba(99,179,237,0.5) !important;
  outline-offset: 2px !important;
  cursor: pointer !important;
}
`;
}
