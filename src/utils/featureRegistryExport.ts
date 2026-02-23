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

// ── checkPageBreak helper ──

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
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
  doc.setFontSize(28);
  doc.text("FastCRM", 105, 60, { align: "center" });
  doc.setFontSize(16);
  doc.text("Technical Architecture", 105, 75, { align: "center" });
  doc.setFontSize(11);
  doc.text(`Exported: ${today()}`, 105, 90, { align: "center" });

  doc.setFontSize(10);
  const statsLines = [
    `Modules: ${stats.totalModules}  |  Features: ${stats.totalFeatures}  |  AI Features: ${stats.aiFeatures}`,
    `Edge Functions: ${stats.edgeFunctions}  |  Pages: ${stats.pages}  |  Tables: ${stats.tables}`,
  ];
  statsLines.forEach((line, i) => doc.text(line, 105, 110 + i * 7, { align: "center" }));

  // ── Modules by category ──
  for (const catId of Object.keys(grouped)) {
    doc.addPage();
    let y = 20;

    // Category header
    doc.setFontSize(18);
    doc.text(catId, 15, y);
    y += 10;

    for (const mod of grouped[catId]) {
      y = checkPage(doc, y, 40);

      // Module name
      doc.setFontSize(13);
      doc.text(`${mod.name}  [${planLabels[mod.minPlan]}]`, 15, y);
      y += 6;
      doc.setFontSize(9);
      doc.text(mod.description, 15, y);
      y += 7;

      // Pages
      if (mod.pages.length > 0) {
        doc.setFontSize(10);
        doc.text("Pages:", 18, y);
        y += 5;
        doc.setFontSize(8);
        for (const p of mod.pages) {
          y = checkPage(doc, y, 5);
          doc.text(`• ${p.name}  →  ${p.route}`, 22, y);
          y += 4;
        }
        y += 2;
      }

      // Hooks
      if (mod.hooks.length > 0) {
        doc.setFontSize(10);
        y = checkPage(doc, y, 8);
        doc.text("Hooks:", 18, y);
        y += 5;
        doc.setFontSize(8);
        const hookLine = mod.hooks.join(", ");
        const hookLines = doc.splitTextToSize(hookLine, 170);
        for (const hl of hookLines) {
          y = checkPage(doc, y, 4);
          doc.text(hl, 22, y);
          y += 4;
        }
        y += 2;
      }

      // Edge Functions
      if (mod.edgeFunctions.length > 0) {
        doc.setFontSize(10);
        y = checkPage(doc, y, 8);
        doc.text("Edge Functions:", 18, y);
        y += 5;
        doc.setFontSize(8);
        const efLine = mod.edgeFunctions.join(", ");
        const efLines = doc.splitTextToSize(efLine, 170);
        for (const el of efLines) {
          y = checkPage(doc, y, 4);
          doc.text(el, 22, y);
          y += 4;
        }
        y += 2;
      }

      // Tables
      if (mod.tables.length > 0) {
        doc.setFontSize(10);
        y = checkPage(doc, y, 8);
        doc.text("Tables:", 18, y);
        y += 5;
        doc.setFontSize(8);
        const tLine = mod.tables.join(", ");
        const tLines = doc.splitTextToSize(tLine, 170);
        for (const tl of tLines) {
          y = checkPage(doc, y, 4);
          doc.text(tl, 22, y);
          y += 4;
        }
        y += 2;
      }

      // Features
      if (mod.features.length > 0) {
        doc.setFontSize(10);
        y = checkPage(doc, y, 8);
        doc.text("Features:", 18, y);
        y += 5;
        doc.setFontSize(8);
        for (const f of mod.features) {
          y = checkPage(doc, y, 5);
          const aiTag = f.aiPowered ? " [IA]" : "";
          doc.text(`• ${f.name}${aiTag} (${f.status})`, 22, y);
          y += 4;
        }
        y += 2;
      }

      // Dependencies
      if (mod.dependencies.length > 0) {
        doc.setFontSize(10);
        y = checkPage(doc, y, 8);
        doc.text("Dependencies:", 18, y);
        y += 5;
        doc.setFontSize(8);
        doc.text(mod.dependencies.join(", "), 22, y);
        y += 6;
      }

      // Separator
      y += 4;
      y = checkPage(doc, y, 2);
      doc.setDrawColor(200);
      doc.line(15, y, 195, y);
      y += 6;
    }
  }

  // ── Appendix: All Edge Functions ──
  doc.addPage();
  let y = 20;
  doc.setFontSize(16);
  doc.text("Appendix: All Edge Functions", 15, y);
  y += 10;
  doc.setFontSize(8);
  const allEF = [...new Set(FEATURE_REGISTRY.flatMap((m) => m.edgeFunctions))].sort();
  for (const ef of allEF) {
    y = checkPage(doc, y, 4);
    doc.text(`• ${ef}`, 18, y);
    y += 4;
  }

  // ── Appendix: All Tables ──
  y += 8;
  y = checkPage(doc, y, 15);
  doc.setFontSize(16);
  doc.text("Appendix: All Tables", 15, y);
  y += 10;
  doc.setFontSize(8);
  const allTables = [...new Set(FEATURE_REGISTRY.flatMap((m) => m.tables))].sort();
  for (const t of allTables) {
    y = checkPage(doc, y, 4);
    doc.text(`• ${t}`, 18, y);
    y += 4;
  }

  downloadPDF(doc, `fastcrm-technical-architecture-${today()}.pdf`);
}

// ══════════════════════════════════════════
// 3. Export Comercial PDF
// ══════════════════════════════════════════

export function exportCommercialPDF() {
  const doc = new jsPDF();
  const stats = getStats();
  const grouped = getModulesByCategory();

  // ── Cover ──
  doc.setFontSize(32);
  doc.text("FastCRM", 105, 55, { align: "center" });
  doc.setFontSize(18);
  doc.text("Catálogo de Funcionalidades", 105, 70, { align: "center" });
  doc.setFontSize(11);
  doc.text(today(), 105, 82, { align: "center" });

  doc.setFontSize(12);
  let cy = 105;
  const summaryItems = [
    `${stats.totalModules} módulos disponíveis`,
    `${stats.totalFeatures} funcionalidades`,
    `${stats.aiFeatures} funcionalidades com Inteligência Artificial`,
    `${stats.pages} páginas no sistema`,
  ];
  for (const item of summaryItems) {
    doc.text(`✓  ${item}`, 50, cy);
    cy += 9;
  }

  // ── Modules by category ──
  for (const catId of Object.keys(grouped)) {
    doc.addPage();
    let y = 20;

    const catMeta = MODULE_CATEGORIES.find((c) => c.id === catId);
    doc.setFontSize(20);
    doc.text(catMeta?.label || catId, 15, y);
    y += 12;

    for (const mod of grouped[catId]) {
      y = checkPage(doc, y, 25);

      // Module name + plan
      doc.setFontSize(13);
      doc.text(mod.name, 15, y);
      doc.setFontSize(9);
      doc.text(`Plano: ${planLabels[mod.minPlan]}`, 195, y, { align: "right" });
      y += 6;

      doc.setFontSize(10);
      doc.text(mod.description, 15, y);
      y += 7;

      // Features (commercial language, no technical details)
      doc.setFontSize(9);
      for (const f of mod.features) {
        y = checkPage(doc, y, 5);
        const aiTag = f.aiPowered ? "  ★ IA" : "";
        doc.text(`•  ${f.name}${aiTag}`, 20, y);
        y += 4;
        if (f.description) {
          y = checkPage(doc, y, 4);
          doc.setFontSize(8);
          doc.text(f.description, 25, y);
          doc.setFontSize(9);
          y += 5;
        }
      }

      y += 4;
      doc.setDrawColor(220);
      doc.line(15, y, 195, y);
      y += 6;
    }
  }

  // ── Summary table ──
  doc.addPage();
  let y = 20;
  doc.setFontSize(18);
  doc.text("Resumo por Categoria", 15, y);
  y += 12;

  // Header
  doc.setFontSize(10);
  doc.text("Categoria", 15, y);
  doc.text("Módulos", 90, y);
  doc.text("Funcionalidades", 120, y);
  doc.text("Com IA", 165, y);
  y += 2;
  doc.line(15, y, 195, y);
  y += 6;

  doc.setFontSize(9);
  for (const catId of Object.keys(grouped)) {
    const mods = grouped[catId];
    const feats = mods.flatMap((m) => m.features);
    const aiCount = feats.filter((f) => f.aiPowered).length;
    const catMeta = MODULE_CATEGORIES.find((c) => c.id === catId);

    doc.text(catMeta?.label || catId, 15, y);
    doc.text(String(mods.length), 95, y);
    doc.text(String(feats.length), 135, y);
    doc.text(String(aiCount), 172, y);
    y += 6;
  }

  // Totals
  y += 2;
  doc.line(15, y, 195, y);
  y += 6;
  doc.setFontSize(10);
  doc.text("Total", 15, y);
  doc.text(String(stats.totalModules), 95, y);
  doc.text(String(stats.totalFeatures), 135, y);
  doc.text(String(stats.aiFeatures), 172, y);

  downloadPDF(doc, `fastcrm-catalogo-funcionalidades-${today()}.pdf`);
}
