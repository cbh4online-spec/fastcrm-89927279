/**
 * PDF via impressão do browser — sem dependências.
 * Abre uma janela com HTML imprimível e dispara window.print().
 */

export interface PrintableSection {
  title: string;
  rows: { label: string; value: string }[];
}

export function printLeadChefDocument(opts: {
  title: string;
  subtitle?: string;
  sections: PrintableSection[];
  footer?: string;
}) {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    throw new Error("O browser bloqueou a impressão. Permite popups e tenta novamente.");
  }

  const { title, subtitle, sections, footer } = opts;
  const html = `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #111; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: #555; margin: 24px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 4px; vertical-align: top; font-size: 13px; }
  td.label { width: 35%; color: #555; }
  td.value { color: #111; word-break: break-word; }
  .footer { margin-top: 32px; color: #888; font-size: 11px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ""}
  ${sections
    .map(
      (s) => `
    <h2>${escapeHtml(s.title)}</h2>
    <table>
      ${s.rows
        .map(
          (r) =>
            `<tr><td class="label">${escapeHtml(r.label)}</td><td class="value">${escapeHtml(r.value || "—")}</td></tr>`,
        )
        .join("")}
    </table>
  `,
    )
    .join("")}
  ${footer ? `<div class="footer">${escapeHtml(footer)}</div>` : ""}
  <script>setTimeout(() => { window.print(); }, 250);</script>
</body>
</html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
