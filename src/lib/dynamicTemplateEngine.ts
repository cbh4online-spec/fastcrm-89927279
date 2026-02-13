/**
 * Dynamic Template Engine
 * Processes conditional syntax {{#if condition}}...{{else}}...{{/if}}
 * and variable substitution {{key}} with fallbacks.
 */

export interface TemplateCondition {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string;
  raw: string;
}

/**
 * Parse and render a dynamic template with conditionals and variables.
 */
export function renderDynamicTemplate(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  // Step 1: Resolve conditionals
  let result = resolveConditionals(template, variables);
  // Step 2: Replace variables
  result = replaceVariables(result, variables);
  // Step 3: Clean up empty lines from resolved conditionals
  result = result.replace(/\n{3,}/g, '\n\n').trim();
  return result;
}

function resolveConditionals(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  // Process from innermost to outermost
  let result = template;
  let maxIterations = 50;
  
  while (maxIterations-- > 0) {
    // Match innermost {{#if ...}}...{{/if}} (no nested #if inside)
    const match = result.match(
      /\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{\/if\}\}/
    );
    if (!match) break;

    const [fullMatch, conditionStr, innerContent] = match;
    
    // Split by {{else}}
    const elseParts = innerContent.split(/\{\{else\}\}/);
    const trueBranch = elseParts[0] || '';
    const falseBranch = elseParts[1] || '';

    const conditionMet = evaluateCondition(conditionStr.trim(), variables);
    const replacement = conditionMet ? trueBranch : falseBranch;
    
    result = result.replace(fullMatch, replacement.trim());
  }

  return result;
}

function evaluateCondition(
  conditionStr: string,
  variables: Record<string, string | number | undefined>
): boolean {
  // Parse: field operator value
  const operators = ['>=', '<=', '!=', '==', '>', '<'] as const;
  
  for (const op of operators) {
    const idx = conditionStr.indexOf(op);
    if (idx === -1) continue;
    
    const field = conditionStr.substring(0, idx).trim();
    const rawValue = conditionStr.substring(idx + op.length).trim().replace(/^["']|["']$/g, '');
    
    const varValue = variables[field];
    if (varValue === undefined || varValue === '') return false;

    const numVar = Number(varValue);
    const numVal = Number(rawValue);
    const isNumeric = !isNaN(numVar) && !isNaN(numVal);

    switch (op) {
      case '==': return String(varValue) === rawValue;
      case '!=': return String(varValue) !== rawValue;
      case '>': return isNumeric && numVar > numVal;
      case '<': return isNumeric && numVar < numVal;
      case '>=': return isNumeric && numVar >= numVal;
      case '<=': return isNumeric && numVar <= numVal;
    }
  }

  // If no operator found, treat as truthy check
  const val = variables[conditionStr];
  return val !== undefined && val !== '' && val !== '0' && val !== 'false';
}

function replaceVariables(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined || value === null || value === '') return '';
    return String(value);
  });
}

/**
 * Extract all conditions used in a template.
 */
export function extractConditions(template: string): TemplateCondition[] {
  const conditions: TemplateCondition[] = [];
  const regex = /\{\{#if\s+(.+?)\}\}/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    const raw = match[1].trim();
    const operators = ['>=', '<=', '!=', '==', '>', '<'] as const;
    
    let parsed = false;
    for (const op of operators) {
      const idx = raw.indexOf(op);
      if (idx !== -1) {
        conditions.push({
          field: raw.substring(0, idx).trim(),
          operator: op,
          value: raw.substring(idx + op.length).trim().replace(/^["']|["']$/g, ''),
          raw,
        });
        parsed = true;
        break;
      }
    }
    if (!parsed) {
      conditions.push({ field: raw, operator: '!=', value: '', raw });
    }
  }

  return conditions;
}

/**
 * Validate dynamic template syntax.
 * Returns array of error messages (empty = valid).
 */
export function validateDynamicTemplate(template: string): string[] {
  const errors: string[] = [];
  
  const opens = (template.match(/\{\{#if\s/g) || []).length;
  const closes = (template.match(/\{\{\/if\}\}/g) || []).length;
  
  if (opens !== closes) {
    errors.push(`Blocos condicionais desbalanceados: ${opens} {{#if}} vs ${closes} {{/if}}`);
  }

  // Check for unclosed conditions
  const regex = /\{\{#if\s+(.*?)\}\}/g;
  let match;
  while ((match = regex.exec(template)) !== null) {
    const condition = match[1].trim();
    if (!condition) {
      errors.push('Condição vazia encontrada em {{#if}}');
    }
  }

  return errors;
}

/**
 * Get enriched preview variables including smart variables.
 */
export function getDynamicPreviewVariables(): Record<string, string> {
  return {
    // CRM base
    nome_cliente: 'João Silva',
    primeiro_nome: 'João',
    produto_nome: 'Pack 10 Sessões',
    consumo_atual: '7',
    consumo_total: '10',
    sessoes_restantes: '3',
    data_ultima_sessao: '15/01/2026',
    proxima_acao: 'Agendar sessão de follow-up',
    responsavel_nome: 'Maria Costa',
    empresa_nome: 'Minha Empresa',
    // CRM extended
    first_name: 'João',
    company_name: 'TechCorp',
    industry: 'Tecnologia',
    pipeline_stage: 'Proposta',
    lead_score: '75',
    potential_value: '5000',
    assigned_user: 'Maria Costa',
    city: 'Lisboa',
    days_since_last_contact: '5',
    // Smart variables
    urgency_level: 'medium',
    business_maturity: 'growth',
    digital_readiness: 'medium',
    conversion_probability: '72',
    recommended_tone: 'consultative',
  };
}
