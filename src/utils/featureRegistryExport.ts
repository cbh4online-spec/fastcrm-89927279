import { jsPDF } from "jspdf";
import { FEATURE_REGISTRY, MODULE_CATEGORIES, type FeatureModule, type ModuleCategory } from "@/types/featureRegistry";

// ── Helpers ──

function getStats() {
  const allModules = FEATURE_REGISTRY;
  const allFeatures = allModules.flatMap((m) => m.features);
  const allEdgeFunctions = new Set(allModules.flatMap((m) => m.edgeFunctions));
  const allPages = allModules.flatMap((m) => m.pages);
  const allTables = new Set(allModules.flatMap((m) => m.tables));

  return {
    totalModules: allModules.length,
    totalFeatures: allFeatures.length,
    aiFeatures: allFeatures.filter((f) => f.aiPowered).length,
    edgeFunctions: allEdgeFunctions.size,
    pages: allPages.length,
    tables: allTables.size,
  };
}

function getModulesByCategory(): Record<string, FeatureModule[]> {
  const grouped: Record<string, FeatureModule[]> = {};
  for (const cat of MODULE_CATEGORIES) {
    const mods = FEATURE_REGISTRY.filter((m) => m.category === cat.id);
    if (mods.length > 0) grouped[cat.id] = mods;
  }
  return grouped;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

const planLabels: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  agency: "Agency",
};

const today = () => new Date().toISOString().split("T")[0];

const todayFormatted = () => {
  const d = new Date();
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
};

// ── Color helpers ──

const CATEGORY_COLORS: Record<string, [number, number, number]> = {
  "Core": [59, 130, 246],
  "CRM": [37, 99, 235],
  "Comunicação": [8, 145, 178],
  "Vendas": [5, 150, 105],
  "Marketing": [217, 119, 6],
  "Loja Online": [124, 58, 237],
  "Portal B2B": [13, 148, 136],
  "Comunidade": [225, 29, 72],
  "IA": [139, 92, 246],
  "Estratégia": [79, 70, 229],
  "Vertical": [202, 138, 4],
  "Admin": [100, 116, 139],
};

function getCatColor(catId: string): [number, number, number] {
  return CATEGORY_COLORS[catId] || [100, 116, 139];
}

const PLAN_COLORS: Record<string, [number, number, number]> = {
  free: [34, 197, 94],
  basic: [59, 130, 246],
  pro: [139, 92, 246],
  agency: [217, 119, 6],
};

const STATUS_COLORS: Record<string, [number, number, number]> = {
  active: [34, 197, 94],
  beta: [234, 179, 8],
  planned: [156, 163, 175],
};

// ── checkPageBreak helper ──

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
}

// ── Drawing helpers ──

function drawColoredHeader(doc: jsPDF, text: string, color: [number, number, number], y: number, count?: number): number {
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(15, y - 5, 180, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const label = count !== undefined ? `${text}  (${count} módulos)` : text;
  doc.text(label, 20, y + 1);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  return y + 14;
}

function drawStatBox(doc: jsPDF, label: string, value: string | number, icon: string, x: number, y: number, w: number) {
  doc.setFillColor(240, 240, 245);
  doc.roundedRect(x, y, w, 22, 3, 3, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 26, 46);
  doc.text(`${icon} ${value}`, x + w / 2, y + 10, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(label, x + w / 2, y + 18, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

function drawPlanBadge(doc: jsPDF, plan: string, x: number, y: number) {
  const color = PLAN_COLORS[plan] || [100, 116, 139];
  const label = planLabels[plan] || plan;
  const w = doc.getTextWidth(label) + 8;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x - w, y - 4, w, 6, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(label, x - w / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
}

function drawStatusDot(doc: jsPDF, status: string, x: number, y: number) {
  const color = STATUS_COLORS[status] || [156, 163, 175];
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(x, y - 1, 1.5, "F");
}

function drawAITag(doc: jsPDF, x: number, y: number): number {
  doc.setFillColor(237, 233, 254);
  const tagW = 14;
  doc.roundedRect(x, y - 4, tagW, 5.5, 1.5, 1.5, "F");
  doc.setTextColor(139, 92, 246);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("★ IA", x + tagW / 2, y - 0.5, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  return x + tagW + 2;
}

function addFooters(doc: jsPDF, title: string, confidential = false) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${title}`, 15, 290);
    if (confidential) {
      doc.text("Confidencial", 105, 290, { align: "center" });
    }
    doc.text(`${i} / ${totalPages}`, 195, 290, { align: "right" });
    // top line
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 285, 195, 285);
  }
  doc.setTextColor(0, 0, 0);
}

// ══════════════════════════════════════════
// 1. Export Técnico JSON
// ══════════════════════════════════════════

export function exportTechnicalJSON() {
  const stats = getStats();
  const data = {
    exportDate: today(),
    exportType: "technical",
    stats,
    modules: FEATURE_REGISTRY.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      description: m.description,
      minPlan: m.minPlan,
      status: m.status,
      moduleSlug: m.moduleSlug,
      pages: m.pages,
      hooks: m.hooks,
      edgeFunctions: m.edgeFunctions,
      tables: m.tables,
      features: m.features,
      dependencies: m.dependencies,
    })),
  };

  downloadFile(JSON.stringify(data, null, 2), `fastcrm-technical-registry-${today()}.json`, "application/json");
}

// ══════════════════════════════════════════
// 2. Export Técnico PDF
// ══════════════════════════════════════════

export function exportTechnicalPDF() {
  const doc = new jsPDF();
  const stats = getStats();
  const grouped = getModulesByCategory();

  // ── Cover ──
  // Dark header background
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, 210, 80, "F");

  // Decorative accent line
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 80, 210, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("FastCRM", 105, 35, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Technical Architecture", 105, 50, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 210);
  doc.text(`Exported: ${todayFormatted()}`, 105, 65, { align: "center" });

  doc.setTextColor(0, 0, 0);

  // Stats boxes
  const boxW = 40;
  const boxGap = 5;
  const startX = (210 - (boxW * 4 + boxGap * 3)) / 2;
  const boxY = 95;

  drawStatBox(doc, "Módulos", stats.totalModules, "◆", startX, boxY, boxW);
  drawStatBox(doc, "Features", stats.totalFeatures, "●", startX + boxW + boxGap, boxY, boxW);
  drawStatBox(doc, "AI Features", stats.aiFeatures, "★", startX + (boxW + boxGap) * 2, boxY, boxW);
  drawStatBox(doc, "Edge Functions", stats.edgeFunctions, "⚡", startX + (boxW + boxGap) * 3, boxY, boxW);

  // Second row of stats
  const boxY2 = boxY + 28;
  const startX2 = (210 - (boxW * 2 + boxGap)) / 2;
  drawStatBox(doc, "Páginas", stats.pages, "📄", startX2, boxY2, boxW);
  drawStatBox(doc, "Tabelas", stats.tables, "🗄", startX2 + boxW + boxGap, boxY2, boxW);

  // ── Modules by category ──
  for (const catId of Object.keys(grouped)) {
    doc.addPage();
    const catColor = getCatColor(catId);
    const catMeta = MODULE_CATEGORIES.find((c) => c.id === catId);
    let y = 20;

    // Category header bar
    y = drawColoredHeader(doc, catMeta?.label || catId, catColor, y, grouped[catId].length);
    y += 2;

    for (const mod of grouped[catId]) {
      y = checkPage(doc, y, 45);

      // Module card background
      const cardStartY = y - 3;
      // We'll draw the card bg after calculating height, but for simplicity draw a fixed card
      doc.setFillColor(245, 245, 248);
      doc.roundedRect(15, cardStartY, 180, 8, 2, 2, "F");

      // Module name
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 26, 46);
      doc.text(mod.name, 20, y + 2);

      // Plan badge on the right
      drawPlanBadge(doc, mod.minPlan, 192, y + 2);

      y += 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(mod.description, 20, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      y += 6;

      // Section helper
      const drawSection = (icon: string, title: string, items: string[]) => {
        if (items.length === 0) return;
        y = checkPage(doc, y, 10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(catColor[0], catColor[1], catColor[2]);
        doc.text(`${icon} ${title}`, 20, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        y += 4;
        doc.setFontSize(7);
        const line = items.join("  ·  ");
        const lines = doc.splitTextToSize(line, 165);
        for (const l of lines) {
          y = checkPage(doc, y, 4);
          doc.text(l, 24, y);
          y += 3.5;
        }
        y += 2;
      };

      // Pages
      drawSection("▸", "Pages", mod.pages.map((p) => `${p.name} → ${p.route}`));
      drawSection("▸", "Hooks", mod.hooks);
      drawSection("⚡", "Edge Functions", mod.edgeFunctions);
      drawSection("🗄", "Tables", mod.tables);

      // Features with status dots and AI tags
      if (mod.features.length > 0) {
        y = checkPage(doc, y, 10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(catColor[0], catColor[1], catColor[2]);
        doc.text("★ Features", 20, y);
        doc.setFont("helvetica", "normal");
        y += 4;
        doc.setFontSize(7);
        for (const f of mod.features) {
          y = checkPage(doc, y, 5);
          drawStatusDot(doc, f.status, 24, y);
          doc.setTextColor(40, 40, 40);
          let textX = 28;
          doc.text(f.name, textX, y);
          textX += doc.getTextWidth(f.name) + 2;
          if (f.aiPowered) {
            drawAITag(doc, textX, y);
          }
          y += 4;
        }
        y += 2;
      }

      // Dependencies
      if (mod.dependencies.length > 0) {
        y = checkPage(doc, y, 8);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Depende de: ${mod.dependencies.join(", ")}`, 20, y);
        y += 4;
      }

      // Separator line with category color
      y += 2;
      y = checkPage(doc, y, 2);
      doc.setDrawColor(catColor[0], catColor[1], catColor[2]);
      doc.setLineWidth(0.3);
      doc.line(20, y, 190, y);
      doc.setLineWidth(0.2);
      doc.setDrawColor(200, 200, 200);
      y += 6;
    }
  }

  // ── Appendix: All Edge Functions (dual column) ──
  doc.addPage();
  let y = 20;
  doc.setFillColor(26, 26, 46);
  doc.rect(15, y - 5, 180, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Appendix: All Edge Functions", 20, y + 1);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += 14;

  doc.setFontSize(7);
  const allEF = [...new Set(FEATURE_REGISTRY.flatMap((m) => m.edgeFunctions))].sort();
  const midEF = Math.ceil(allEF.length / 2);
  const col1EF = allEF.slice(0, midEF);
  const col2EF = allEF.slice(midEF);

  let yEF = y;
  for (let i = 0; i < Math.max(col1EF.length, col2EF.length); i++) {
    yEF = checkPage(doc, yEF, 4);
    doc.setTextColor(60, 60, 60);
    if (col1EF[i]) doc.text(`• ${col1EF[i]}`, 20, yEF);
    if (col2EF[i]) doc.text(`• ${col2EF[i]}`, 110, yEF);
    yEF += 4;
  }

  // ── Appendix: All Tables (dual column) ──
  yEF += 8;
  yEF = checkPage(doc, yEF, 20);
  doc.setFillColor(26, 26, 46);
  doc.rect(15, yEF - 5, 180, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Appendix: All Tables", 20, yEF + 1);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  yEF += 14;

  doc.setFontSize(7);
  const allTables = [...new Set(FEATURE_REGISTRY.flatMap((m) => m.tables))].sort();
  const midT = Math.ceil(allTables.length / 2);
  const col1T = allTables.slice(0, midT);
  const col2T = allTables.slice(midT);

  for (let i = 0; i < Math.max(col1T.length, col2T.length); i++) {
    yEF = checkPage(doc, yEF, 4);
    doc.setTextColor(60, 60, 60);
    if (col1T[i]) doc.text(`• ${col1T[i]}`, 20, yEF);
    if (col2T[i]) doc.text(`• ${col2T[i]}`, 110, yEF);
    yEF += 4;
  }

  // ── Footers ──
  addFooters(doc, "FastCRM — Technical Architecture");

  downloadPDF(doc, `fastcrm-technical-architecture-${today()}.pdf`);
}

// ══════════════════════════════════════════
// 3. Export Comercial PDF
// ══════════════════════════════════════════

export function exportCommercialPDF() {
  const doc = new jsPDF();
  const stats = getStats();
  const grouped = getModulesByCategory();

  // ── Cover with gradient-like effect ──
  // Dark blue base
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, 210, 297, "F");

  // Lighter blue overlay at bottom
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 200, 210, 97, "F");

  // Gradient blend strips
  for (let i = 0; i < 30; i++) {
    const ratio = i / 30;
    const r = Math.round(26 + (37 - 26) * ratio);
    const g = Math.round(26 + (99 - 26) * ratio);
    const b = Math.round(46 + (235 - 46) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(0, 170 + i, 210, 1.2, "F");
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(42);
  doc.setFont("helvetica", "bold");
  doc.text("FastCRM", 105, 70, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 255);
  doc.text("Catálogo de Funcionalidades", 105, 88, { align: "center" });

  // Decorative line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(60, 98, 150, 98);
  doc.setLineWidth(0.2);

  // Stats boxes on cover
  const cBoxW = 38;
  const cBoxGap = 6;
  const cStartX = (210 - (cBoxW * 4 + cBoxGap * 3)) / 2;
  const cBoxY = 115;

  const coverStats = [
    { label: "Módulos", value: stats.totalModules, icon: "◆" },
    { label: "Funcionalidades", value: stats.totalFeatures, icon: "●" },
    { label: "Com IA", value: stats.aiFeatures, icon: "★" },
    { label: "Páginas", value: stats.pages, icon: "📄" },
  ];

  for (let i = 0; i < coverStats.length; i++) {
    const x = cStartX + i * (cBoxW + cBoxGap);
    // Semi-transparent box effect
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, cBoxY, cBoxW, 28, 3, 3, "F");
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 26, 46);
    doc.text(`${coverStats[i].value}`, x + cBoxW / 2, cBoxY + 13, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(coverStats[i].label, x + cBoxW / 2, cBoxY + 22, { align: "center" });
  }

  // Date
  doc.setTextColor(180, 200, 255);
  doc.setFontSize(10);
  doc.text(todayFormatted(), 105, 165, { align: "center" });

  doc.setTextColor(0, 0, 0);

  // ── Modules by category ──
  for (const catId of Object.keys(grouped)) {
    doc.addPage();
    const catColor = getCatColor(catId);
    const catMeta = MODULE_CATEGORIES.find((c) => c.id === catId);
    let y = 20;

    // Category header bar
    y = drawColoredHeader(doc, catMeta?.label || catId, catColor, y, grouped[catId].length);
    y += 2;

    for (const mod of grouped[catId]) {
      y = checkPage(doc, y, 30);

      // Card with left colored border
      const cardH = 6;
      doc.setFillColor(catColor[0], catColor[1], catColor[2]);
      doc.rect(15, y - 3, 3, cardH, "F");
      doc.setFillColor(248, 248, 252);
      doc.rect(18, y - 3, 177, cardH, "F");

      // Module name
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 26, 46);
      doc.text(mod.name, 22, y + 1);

      // Plan badge
      drawPlanBadge(doc, mod.minPlan, 192, y + 1);

      y += 8;

      // Description in italic
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(80, 80, 100);
      const descLines = doc.splitTextToSize(mod.description, 170);
      for (const dl of descLines) {
        doc.text(dl, 20, y);
        y += 4;
      }
      doc.setFont("helvetica", "normal");
      y += 2;

      // Features with colored bullets
      doc.setFontSize(8);
      for (const f of mod.features) {
        y = checkPage(doc, y, 9);
        // Colored bullet
        doc.setFillColor(catColor[0], catColor[1], catColor[2]);
        doc.circle(23, y - 1, 1.2, "F");

        doc.setTextColor(40, 40, 40);
        let textX = 27;
        doc.setFont("helvetica", "bold");
        doc.text(f.name, textX, y);
        textX += doc.getTextWidth(f.name) + 2;
        doc.setFont("helvetica", "normal");

        if (f.aiPowered) {
          // Gold star AI tag
          doc.setFillColor(255, 237, 179);
          const tagW = 14;
          doc.roundedRect(textX, y - 3.5, tagW, 5, 1.5, 1.5, "F");
          doc.setTextColor(180, 130, 0);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.text("★ IA", textX + tagW / 2, y, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
        }

        y += 4;

        // Description
        if (f.description) {
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 140);
          doc.text(f.description, 27, y);
          doc.setFontSize(8);
          y += 4;
        }
      }

      y += 3;
      // Light separator
      doc.setDrawColor(230, 230, 235);
      doc.line(20, y, 190, y);
      y += 6;
    }
  }

  // ── Summary table ──
  doc.addPage();
  let y = 20;

  // Table title
  doc.setFillColor(26, 26, 46);
  doc.rect(15, y - 5, 180, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo por Categoria", 20, y + 1);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += 14;

  // Table header
  doc.setFillColor(40, 40, 60);
  doc.rect(15, y - 4, 180, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Categoria", 20, y + 1);
  doc.text("Módulos", 100, y + 1);
  doc.text("Funcionalidades", 125, y + 1);
  doc.text("Com IA", 170, y + 1);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += 8;

  // Table rows with zebra striping
  let rowIdx = 0;
  let totalMods = 0;
  let totalFeats = 0;
  let totalAI = 0;

  for (const catId of Object.keys(grouped)) {
    const mods = grouped[catId];
    const feats = mods.flatMap((m) => m.features);
    const aiCount = feats.filter((f) => f.aiPowered).length;
    const catMeta = MODULE_CATEGORIES.find((c) => c.id === catId);
    const catColor = getCatColor(catId);

    totalMods += mods.length;
    totalFeats += feats.length;
    totalAI += aiCount;

    // Zebra stripe
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 248, 252);
      doc.rect(15, y - 4, 180, 7, "F");
    }

    // Color dot for category
    doc.setFillColor(catColor[0], catColor[1], catColor[2]);
    doc.circle(19, y - 0.5, 1.5, "F");

    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text(catMeta?.label || catId, 24, y);
    doc.text(String(mods.length), 105, y);
    doc.text(String(feats.length), 140, y);
    doc.text(String(aiCount), 175, y);
    y += 7;
    rowIdx++;
  }

  // Totals row
  doc.setFillColor(26, 26, 46);
  doc.rect(15, y - 4, 180, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", 20, y + 1);
  doc.text(String(totalMods), 105, y + 1);
  doc.text(String(totalFeats), 140, y + 1);
  doc.text(String(totalAI), 175, y + 1);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // ── Footers ──
  addFooters(doc, "FastCRM — Catálogo de Funcionalidades", true);

  downloadPDF(doc, `fastcrm-catalogo-funcionalidades-${today()}.pdf`);
}

// ══════════════════════════════════════════
// 4. Export B2B Module PDF
// ══════════════════════════════════════════

export function exportB2BModulePDF() {
  const doc = new jsPDF();
  const teal: [number, number, number] = [13, 148, 136];
  const darkTeal: [number, number, number] = [6, 95, 87];

  // Get B2B modules
  const b2bModules = FEATURE_REGISTRY.filter((m) => m.category === "Portal B2B");
  const allFeatures = b2bModules.flatMap((m) => m.features);
  const allPages = b2bModules.flatMap((m) => m.pages);
  const allHooks = [...new Set(b2bModules.flatMap((m) => m.hooks))];
  const allEF = [...new Set(b2bModules.flatMap((m) => m.edgeFunctions))];
  const allTables = [...new Set(b2bModules.flatMap((m) => m.tables))];
  const aiFeatures = allFeatures.filter((f) => f.aiPowered);

  // ── COVER ──
  doc.setFillColor(teal[0], teal[1], teal[2]);
  doc.rect(0, 0, 210, 90, "F");

  // Darker strip at top
  doc.setFillColor(darkTeal[0], darkTeal[1], darkTeal[2]);
  doc.rect(0, 0, 210, 12, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text("FastCRM", 105, 40, { align: "center" });
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("Portal B2B", 105, 55, { align: "center" });
  doc.setFontSize(11);
  doc.setTextColor(200, 240, 235);
  doc.text("Documentação Completa do Módulo", 105, 68, { align: "center" });
  doc.setFontSize(9);
  doc.text(todayFormatted(), 105, 80, { align: "center" });

  // Decorative line
  doc.setFillColor(255, 255, 255);
  doc.rect(60, 92, 90, 1, "F");

  // Stats boxes
  const statsData = [
    { label: "Sub-módulos", value: b2bModules.length, icon: "◆" },
    { label: "Funcionalidades", value: allFeatures.length, icon: "●" },
    { label: "Com IA", value: aiFeatures.length, icon: "★" },
    { label: "Páginas", value: allPages.length, icon: "📄" },
    { label: "Hooks", value: allHooks.length, icon: "⚙" },
    { label: "Edge Functions", value: allEF.length, icon: "⚡" },
  ];

  const sBoxW = 28;
  const sBoxGap = 2;
  const sStartX = (210 - (sBoxW * 6 + sBoxGap * 5)) / 2;
  const sBoxY = 100;

  for (let i = 0; i < statsData.length; i++) {
    const x = sStartX + i * (sBoxW + sBoxGap);
    doc.setFillColor(240, 248, 247);
    doc.roundedRect(x, sBoxY, sBoxW, 24, 2, 2, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(6, 95, 87);
    doc.text(`${statsData[i].value}`, x + sBoxW / 2, sBoxY + 10, { align: "center" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(statsData[i].label, x + sBoxW / 2, sBoxY + 19, { align: "center" });
  }

  // ── VISÃO GERAL ──
  doc.addPage();
  let y = 20;
  y = drawColoredHeader(doc, "Visão Geral", teal, y);
  y += 4;

  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const overviewText = [
    "O Portal B2B do FastCRM é uma solução completa de self-service para clientes empresariais.",
    "Permite que empresas clientes façam encomendas, consultem faturas, acompanhem contratos,",
    "abram tickets de suporte e utilizem ferramentas de inteligência artificial — tudo isto",
    "através de um portal dedicado com autenticação e permissões isoladas do CRM principal.",
    "",
    "A arquitectura divide-se em dois eixos:",
    "",
    "  • Admin CRM — Onde a equipa interna gere clientes, aprovações e configurações",
    "  • Portal Cliente — Interface self-service para os utilizadores das empresas clientes",
  ];
  for (const line of overviewText) {
    doc.text(line, 20, y);
    y += 5;
  }

  y += 4;
  // Roles section
  doc.setFillColor(240, 248, 247);
  doc.roundedRect(15, y - 3, 180, 32, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(teal[0], teal[1], teal[2]);
  doc.text("Roles Disponíveis", 20, y + 3);
  y += 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);

  const roles = [
    ["client_admin", "Acesso total: gestão de equipa, aprovações, financeiro, suporte"],
    ["client_financial", "Acesso a faturas, contratos, histórico financeiro e tickets"],
    ["client_operational", "Pode comprar, criar tickets e usar o catálogo"],
    ["client_viewer", "Acesso apenas de leitura ao portal"],
  ];
  for (const [role, desc] of roles) {
    doc.setFont("helvetica", "bold");
    doc.text(role, 22, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 120);
    doc.text(`— ${desc}`, 22 + doc.getTextWidth(role) + 3, y);
    doc.setTextColor(40, 40, 40);
    y += 5;
  }

  // ── SUB-MÓDULOS ──
  for (const mod of b2bModules) {
    doc.addPage();
    let y = 20;

    // Sub-module header
    y = drawColoredHeader(doc, mod.name, teal, y);
    y += 2;

    // Description
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 100);
    const descLines = doc.splitTextToSize(mod.description, 170);
    for (const dl of descLines) {
      doc.text(dl, 20, y);
      y += 4.5;
    }
    doc.setFont("helvetica", "normal");
    y += 4;

    // Pages
    if (mod.pages.length > 0) {
      y = checkPage(doc, y, 10 + mod.pages.length * 5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text("📄 Páginas", 20, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      for (const p of mod.pages) {
        doc.setTextColor(40, 40, 40);
        doc.text(`• ${p.name}`, 24, y);
        doc.setTextColor(130, 130, 150);
        doc.text(p.route, 90, y);
        y += 4.5;
      }
      y += 3;
    }

    // Features
    if (mod.features.length > 0) {
      y = checkPage(doc, y, 10 + mod.features.length * 9);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text("★ Funcionalidades", 20, y);
      y += 6;

      for (const f of mod.features) {
        y = checkPage(doc, y, 10);
        drawStatusDot(doc, f.status, 24, y);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        let textX = 28;
        doc.text(f.name, textX, y);
        textX += doc.getTextWidth(f.name) + 3;
        if (f.aiPowered) {
          drawAITag(doc, textX, y);
        }
        y += 4;
        if (f.description) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(120, 120, 140);
          doc.text(f.description, 28, y);
          y += 4.5;
        }
      }
      y += 3;
    }

    // Hooks
    if (mod.hooks.length > 0) {
      y = checkPage(doc, y, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text("⚙ Hooks", 20, y);
      y += 5;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(mod.hooks.join("  ·  "), 24, y);
      y += 5;
    }

    // Edge Functions
    if (mod.edgeFunctions.length > 0) {
      y = checkPage(doc, y, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text("⚡ Edge Functions", 20, y);
      y += 5;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(mod.edgeFunctions.join("  ·  "), 24, y);
      y += 5;
    }

    // Tables
    if (mod.tables.length > 0) {
      y = checkPage(doc, y, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text("🗄 Tabelas", 20, y);
      y += 5;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(mod.tables.join("  ·  "), 24, y);
      y += 5;
    }
  }

  // ── FLUXO DE ONBOARDING ──
  doc.addPage();
  y = 20;
  y = drawColoredHeader(doc, "Fluxo de Onboarding", teal, y);
  y += 6;

  const onboardingSteps = [
    { step: "1", title: "Criar Empresa Cliente", desc: "Admin CRM cria registo da empresa com condições comerciais (descontos, preços especiais, limites)" },
    { step: "2", title: "Enviar Convite", desc: "Admin envia convite por email via edge function 'send-client-invitation' com template personalizável" },
    { step: "3", title: "Receber Email", desc: "Utilizador recebe email com link único contendo token seguro (invite_token)" },
    { step: "4", title: "Activar Conta", desc: "Utilizador acede ao link, define password e activa conta via 'activate-client-invite'" },
    { step: "5", title: "Criar Auth User", desc: "Edge function 'create-client-auth-user' cria utilizador no sistema de autenticação" },
    { step: "6", title: "Acesso ao Portal", desc: "Conta muda de 'pending' para 'active', utilizador pode fazer login no portal B2B" },
    { step: "7", title: "Atribuir Roles", desc: "Admin pode atribuir roles adicionais (financial, operational) conforme necessário" },
  ];

  for (const s of onboardingSteps) {
    y = checkPage(doc, y, 18);
    // Step circle
    doc.setFillColor(teal[0], teal[1], teal[2]);
    doc.circle(24, y + 1, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(s.step, 24, y + 2.5, { align: "center" });

    // Title
    doc.setTextColor(26, 26, 46);
    doc.setFontSize(10);
    doc.text(s.title, 32, y + 2);
    y += 7;

    // Description
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 100);
    const stepLines = doc.splitTextToSize(s.desc, 158);
    for (const sl of stepLines) {
      doc.text(sl, 32, y);
      y += 4;
    }

    // Connector line (except last)
    if (s.step !== "7") {
      doc.setDrawColor(teal[0], teal[1], teal[2]);
      doc.setLineWidth(0.4);
      doc.line(24, y - 1, 24, y + 4);
      doc.setLineWidth(0.2);
    }
    y += 5;
  }

  // ── MAPA DE PERMISSÕES ──
  doc.addPage();
  y = 20;
  y = drawColoredHeader(doc, "Mapa de Permissões", teal, y);
  y += 4;

  const permHeaders = ["Funcionalidade", "Admin", "Financial", "Operational", "Viewer"];
  const permRows = [
    ["Gerir equipa", "✓", "—", "—", "—"],
    ["Aprovar encomendas", "✓", "—", "—", "—"],
    ["Comprar / Encomendar", "✓", "—", "✓", "—"],
    ["Ver faturas", "✓", "✓", "—", "—"],
    ["Ver financeiro", "✓", "✓", "—", "—"],
    ["Ver contratos", "✓", "✓", "—", "—"],
    ["Criar tickets", "✓", "✓", "✓", "—"],
    ["Ver catálogo", "✓", "✓", "✓", "✓"],
    ["Ver encomendas", "✓", "✓", "✓", "✓"],
    ["Usar Copilot IA", "✓", "✓", "✓", "✓"],
    ["Pesquisa semântica", "✓", "✓", "✓", "✓"],
  ];

  // Table header
  const colWidths = [65, 25, 30, 32, 25];
  const colX = [20, 85, 110, 140, 172];

  doc.setFillColor(darkTeal[0], darkTeal[1], darkTeal[2]);
  doc.rect(15, y - 4, 180, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  for (let i = 0; i < permHeaders.length; i++) {
    doc.text(permHeaders[i], colX[i], y + 1);
  }
  y += 8;
  doc.setFont("helvetica", "normal");

  // Rows with zebra
  for (let r = 0; r < permRows.length; r++) {
    y = checkPage(doc, y, 7);
    if (r % 2 === 0) {
      doc.setFillColor(240, 248, 247);
      doc.rect(15, y - 4, 180, 7, "F");
    }
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    for (let c = 0; c < permRows[r].length; c++) {
      const val = permRows[r][c];
      if (val === "✓") {
        doc.setTextColor(teal[0], teal[1], teal[2]);
        doc.setFont("helvetica", "bold");
      } else if (val === "—") {
        doc.setTextColor(180, 180, 190);
        doc.setFont("helvetica", "normal");
      } else {
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");
      }
      doc.text(val, colX[c], y);
    }
    y += 7;
  }

  // ── RESUMO TÉCNICO ──
  doc.addPage();
  y = 20;
  y = drawColoredHeader(doc, "Resumo Técnico", teal, y);
  y += 6;

  // Hooks list
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(teal[0], teal[1], teal[2]);
  doc.text(`Hooks (${allHooks.length})`, 20, y);
  y += 6;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  for (const h of allHooks) {
    y = checkPage(doc, y, 4);
    doc.text(`• ${h}`, 24, y);
    y += 4;
  }

  y += 6;
  y = checkPage(doc, y, 20);

  // Edge Functions list
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(teal[0], teal[1], teal[2]);
  doc.text(`Edge Functions (${allEF.length})`, 20, y);
  y += 6;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  for (const ef of allEF) {
    y = checkPage(doc, y, 4);
    doc.text(`• ${ef}`, 24, y);
    y += 4;
  }

  y += 6;
  y = checkPage(doc, y, 20);

  // Tables list
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(teal[0], teal[1], teal[2]);
  doc.text(`Tabelas (${allTables.length})`, 20, y);
  y += 6;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  // Dual column
  const midT = Math.ceil(allTables.length / 2);
  const tCol1 = allTables.slice(0, midT);
  const tCol2 = allTables.slice(midT);
  for (let i = 0; i < Math.max(tCol1.length, tCol2.length); i++) {
    y = checkPage(doc, y, 4);
    if (tCol1[i]) doc.text(`• ${tCol1[i]}`, 24, y);
    if (tCol2[i]) doc.text(`• ${tCol2[i]}`, 110, y);
    y += 4;
  }

  // ── Footers ──
  addFooters(doc, "FastCRM — Portal B2B");

  downloadPDF(doc, `fastcrm-portal-b2b-${today()}.pdf`);
}
