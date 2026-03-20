export type ScreenshotResult =
  | { success: true; dataUrl: string; blob: Blob }
  | { success: false; error: string };

export async function captureScreenshot(): Promise<ScreenshotResult> {
  try {
    const html2canvas = (await import("html2canvas")).default;

    const canvas = await html2canvas(document.body, {
      allowTaint: true,
      useCORS: true,
      scale: Math.min(window.devicePixelRatio, 2),
      logging: false,
      ignoreElements: (el) => {
        return el.hasAttribute("data-bug-report-modal");
      },
    });

    const dataUrl = canvas.toDataURL("image/png");
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    return { success: true, dataUrl, blob };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao capturar ecrã",
    };
  }
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: "image/png" });
}
