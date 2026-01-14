import { BlueprintCustomField, BlueprintAutomation } from '@/types/blueprint';
import { CustomField } from '@/hooks/useCustomFields';

export interface DuplicateMatch {
  blueprintItem: BlueprintCustomField | BlueprintAutomation;
  existingItem: CustomField | { id: string; name: string };
  matchType: 'exact' | 'similar';
  similarity: number;
  itemType: 'field' | 'automation' | 'stage';
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 1;
  
  // Levenshtein distance-based similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  
  return (longer.length - costs[longer.length]) / longer.length;
}

export function detectFieldDuplicates(
  blueprintFields: BlueprintCustomField[],
  existingFields: CustomField[]
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];
  
  for (const bpField of blueprintFields) {
    for (const existing of existingFields) {
      const similarity = calculateSimilarity(bpField.name, existing.name);
      
      if (similarity >= 0.8) {
        duplicates.push({
          blueprintItem: bpField,
          existingItem: existing,
          matchType: similarity === 1 ? 'exact' : 'similar',
          similarity,
          itemType: 'field',
        });
      }
    }
  }
  
  return duplicates;
}

export function detectAutomationDuplicates(
  blueprintAutomations: BlueprintAutomation[],
  existingAutomations: { id: string; name: string }[]
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];
  
  for (const bpAuto of blueprintAutomations) {
    for (const existing of existingAutomations) {
      const similarity = calculateSimilarity(bpAuto.name, existing.name);
      
      if (similarity >= 0.7) {
        duplicates.push({
          blueprintItem: bpAuto,
          existingItem: existing,
          matchType: similarity === 1 ? 'exact' : 'similar',
          similarity,
          itemType: 'automation',
        });
      }
    }
  }
  
  return duplicates;
}

export function detectStageDuplicates(
  blueprintStages: { name: string }[],
  existingStages: { id: string; name: string }[]
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];
  
  for (const bpStage of blueprintStages) {
    for (const existing of existingStages) {
      const similarity = calculateSimilarity(bpStage.name, existing.name);
      
      if (similarity >= 0.8) {
        duplicates.push({
          blueprintItem: bpStage as any,
          existingItem: existing,
          matchType: similarity === 1 ? 'exact' : 'similar',
          similarity,
          itemType: 'stage',
        });
      }
    }
  }
  
  return duplicates;
}
