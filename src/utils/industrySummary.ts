/**
 * Generates a short industry summary from the full CAE description.
 * Extracts only the first activity and truncates if too long.
 */
export function generateIndustrySummary(caeDescription: string | null | undefined): string {
  if (!caeDescription) return '';
  
  // Get the first activity (before the first ";" or line break)
  const firstActivity = caeDescription.split(/[;\n]/)[0].trim();
  
  // Remove the CAE code prefix if present (e.g., "79110 - Agências de viagens" -> "Agências de viagens")
  const withoutCode = firstActivity.replace(/^\d+\s*[-–]\s*/, '').trim();
  
  // Truncate if too long (max 60 characters for a clean badge/field display)
  if (withoutCode.length > 60) {
    return withoutCode.substring(0, 57) + '...';
  }
  
  return withoutCode;
}
