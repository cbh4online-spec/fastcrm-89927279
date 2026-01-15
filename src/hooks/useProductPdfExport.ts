import { useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import type { Product, ProductImage } from "@/types/product";

interface WorkspaceInfo {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

interface UseProductPdfExportReturn {
  generatePdf: (
    product: Product,
    images: ProductImage[],
    workspace: WorkspaceInfo
  ) => Promise<void>;
  isGenerating: boolean;
}

export function useProductPdfExport(): UseProductPdfExportReturn {
  const [isGenerating, setIsGenerating] = useState(false);

  const formatCurrency = (value: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
  };

  const generatePdf = async (
    product: Product,
    images: ProductImage[],
    workspace: WorkspaceInfo
  ) => {
    setIsGenerating(true);

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Colors
      const primaryColor = [59, 130, 246]; // Blue
      const textColor = [31, 41, 55];
      const mutedColor = [107, 114, 128];
      const successColor = [34, 197, 94];

      // Header with workspace name
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(0, 0, pageWidth, 25, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(workspace.name || "Empresa", margin, 16);

      yPosition = 35;

      // Product Name
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      
      const productNameLines = pdf.splitTextToSize(product.name, contentWidth);
      pdf.text(productNameLines, margin, yPosition);
      yPosition += productNameLines.length * 10 + 5;

      // Category badge
      if (product.category) {
        pdf.setFillColor(229, 231, 235);
        pdf.roundedRect(margin, yPosition - 5, pdf.getTextWidth(product.category) + 8, 8, 2, 2, "F");
        pdf.setFontSize(10);
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        pdf.text(product.category, margin + 4, yPosition);
        yPosition += 10;
      }

      // Price
      if (product.base_price > 0) {
        pdf.setFontSize(20);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFont("helvetica", "bold");
        pdf.text(formatCurrency(product.base_price, product.currency), margin, yPosition + 5);
        yPosition += 15;
      }

      yPosition += 5;

      // Product Image (first image if available)
      if (images.length > 0) {
        try {
          const img = await loadImage(images[0].url);
          const imgMaxWidth = contentWidth;
          const imgMaxHeight = 60;
          
          let imgWidth = img.width;
          let imgHeight = img.height;
          
          const ratio = Math.min(imgMaxWidth / imgWidth, imgMaxHeight / imgHeight);
          imgWidth *= ratio;
          imgHeight *= ratio;

          // Center the image
          const imgX = margin + (contentWidth - imgWidth) / 2;
          
          pdf.addImage(img, "JPEG", imgX, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } catch (error) {
          console.warn("Could not load product image for PDF");
        }
      }

      // Short Description
      if (product.short_description) {
        pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        const descLines = pdf.splitTextToSize(product.short_description, contentWidth);
        pdf.text(descLines, margin, yPosition);
        yPosition += descLines.length * 6 + 10;
      }

      // Commercial Description
      if (product.commercial_description) {
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Descrição", margin, yPosition);
        yPosition += 8;

        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        const commercialLines = pdf.splitTextToSize(product.commercial_description, contentWidth);
        
        // Check if we need a new page
        if (yPosition + commercialLines.length * 5 > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.text(commercialLines, margin, yPosition);
        yPosition += commercialLines.length * 5 + 10;
      }

      // Benefits
      const benefits = product.benefits || [];
      if (benefits.length > 0) {
        // Check if we need a new page
        if (yPosition + 30 > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Benefícios", margin, yPosition);
        yPosition += 8;

        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");

        benefits.forEach((benefit) => {
          // Check if we need a new page
          if (yPosition + 8 > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

          // Checkmark
          pdf.setTextColor(successColor[0], successColor[1], successColor[2]);
          pdf.text("✓", margin, yPosition);
          
          // Benefit text
          pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
          const benefitLines = pdf.splitTextToSize(benefit, contentWidth - 10);
          pdf.text(benefitLines, margin + 8, yPosition);
          yPosition += benefitLines.length * 5 + 3;
        });

        yPosition += 5;
      }

      // Conditions
      if (product.conditions) {
        // Check if we need a new page
        if (yPosition + 30 > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFillColor(249, 250, 251);
        const conditionsLines = pdf.splitTextToSize(product.conditions, contentWidth - 16);
        const boxHeight = conditionsLines.length * 5 + 16;
        
        pdf.roundedRect(margin, yPosition, contentWidth, boxHeight, 3, 3, "F");
        
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Condições", margin + 8, yPosition + 8);
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        pdf.text(conditionsLines, margin + 8, yPosition + 16);
        
        yPosition += boxHeight + 10;
      }

      // Footer
      const footerY = pageHeight - 15;
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      
      const footerText = `© ${new Date().getFullYear()} ${workspace.name}. Todos os direitos reservados.`;
      pdf.text(footerText, margin, footerY);

      if (workspace.email || workspace.phone) {
        const contactInfo = [workspace.email, workspace.phone].filter(Boolean).join(" | ");
        pdf.text(contactInfo, pageWidth - margin, footerY, { align: "right" });
      }

      // Save the PDF
      const filename = `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ficha.pdf`;
      pdf.save(filename);

      toast.success("PDF descarregado com sucesso!");
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return { generatePdf, isGenerating };
}
