import React from "react";
import { format } from "date-fns";

interface SecurityDocumentA4TemplateProps {
  documentType: string;
  versionNumber: number;
  emittedAt?: string | null;
  companyName?: string;
  children: React.ReactNode;
}

const docTypeLabels: Record<string, string> = {
  installation_certificate: "Certificado de Instalação",
  maintenance_certificate: "Certificado de Manutenção",
  conformity_declaration: "Declaração de Conformidade",
  occurrence_book: "Livro de Registo de Ocorrências",
  technical_sheet: "Ficha Técnica do Sistema",
  annex: "Anexo Técnico",
  other: "Documento",
};

/**
 * A4-styled wrapper that provides professional document layout for PDF export.
 * 210mm × 297mm at 96dpi ≈ 794px × 1123px
 */
export function SecurityDocumentA4Template({
  documentType,
  versionNumber,
  emittedAt,
  companyName,
  children,
}: SecurityDocumentA4TemplateProps) {
  const today = format(new Date(), "dd/MM/yyyy");
  const label = docTypeLabels[documentType] || documentType;

  return (
    <div
      className="bg-white text-black mx-auto shadow-lg"
      style={{
        width: "794px",
        minHeight: "1123px",
        padding: "48px 56px",
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        fontSize: "12px",
        lineHeight: "1.6",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "2px solid #1a1a1a",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          {/* Logo placeholder */}
          <div
            style={{
              width: "140px",
              height: "40px",
              border: "1px dashed #ccc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              color: "#999",
              borderRadius: "4px",
              marginBottom: "4px",
            }}
          >
            LOGO
          </div>
          <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>
            {companyName || "Entidade Instaladora"}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h1
            style={{
              fontSize: "16px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              margin: 0,
              color: "#1a1a1a",
            }}
          >
            {label}
          </h1>
          <p style={{ fontSize: "11px", color: "#666", margin: "4px 0 0 0" }}>
            Versão {versionNumber} · {emittedAt ? format(new Date(emittedAt), "dd/MM/yyyy") : today}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ minHeight: "900px" }}>{children}</div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: "32px",
          left: "56px",
          right: "56px",
          borderTop: "1px solid #e5e5e5",
          paddingTop: "12px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "9px",
          color: "#999",
        }}
      >
        <span>
          {label} · v{versionNumber}
        </span>
        <span>
          Gerado em {today} · Documento eletrónico
        </span>
        <span>Pág. 1</span>
      </div>
    </div>
  );
}

/* Reusable sub-components for document content */

export function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h3
        style={{
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "#666",
          borderBottom: "1px solid #e5e5e5",
          paddingBottom: "4px",
          marginBottom: "10px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export function DocFieldGrid({ fields }: { fields: { label: string; value?: string | null }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
      {fields.map((f, i) => (
        <div key={i}>
          <p style={{ fontSize: "10px", color: "#999", margin: "0 0 2px 0", textTransform: "uppercase" }}>
            {f.label}
          </p>
          <p style={{ margin: 0, fontWeight: 500 }}>{f.value || "—"}</p>
        </div>
      ))}
    </div>
  );
}

export function DocEquipmentTable({
  devices,
}: {
  devices: { zone?: string; type?: string; brand?: string; model?: string; reference?: string; serial?: string; qty?: number }[];
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
      <thead>
        <tr style={{ backgroundColor: "#f5f5f5" }}>
          <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd", fontWeight: 600 }}>Zona</th>
          <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd", fontWeight: 600 }}>Tipo</th>
          <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd", fontWeight: 600 }}>Marca</th>
          <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd", fontWeight: 600 }}>Modelo</th>
          <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd", fontWeight: 600 }}>Ref.</th>
          <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #ddd", fontWeight: 600 }}>Qtd</th>
        </tr>
      </thead>
      <tbody>
        {devices.map((d, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: "5px 8px" }}>{d.zone || "—"}</td>
            <td style={{ padding: "5px 8px" }}>{d.type || "—"}</td>
            <td style={{ padding: "5px 8px" }}>{d.brand || "—"}</td>
            <td style={{ padding: "5px 8px" }}>{d.model || "—"}</td>
            <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: "10px" }}>{d.reference || "—"}</td>
            <td style={{ padding: "5px 8px", textAlign: "right" }}>{d.qty ?? 1}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DocSignatureBlock({ labels }: { labels: string[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${labels.length}, 1fr)`,
        gap: "24px",
        marginTop: "48px",
        paddingTop: "16px",
        borderTop: "1px solid #e5e5e5",
      }}
    >
      {labels.map((label, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div
            style={{
              height: "60px",
              borderBottom: "1px dashed #999",
              marginBottom: "6px",
            }}
          />
          <p style={{ fontSize: "10px", color: "#666", margin: 0 }}>{label}</p>
        </div>
      ))}
    </div>
  );
}
