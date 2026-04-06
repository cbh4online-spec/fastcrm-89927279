/**
 * Mapa de tradução de chaves técnicas de especificações para labels legíveis em Português.
 * Usado na página de produto da loja para humanizar specs importadas de fornecedores.
 */

const SPEC_LABEL_MAP: Record<string, string> = {
  // Geral
  brand: "Marca",
  marca: "Marca",
  fabricante: "Fabricante",
  model: "Modelo",
  modelo: "Modelo",
  sku: "SKU",
  ean: "EAN",
  upc: "UPC",
  mpn: "MPN",
  color: "Cor",
  cor: "Cor",
  material: "Material",
  weight: "Peso",
  peso: "Peso",
  dimensions: "Dimensões",
  dimensões: "Dimensões",
  size: "Tamanho",
  tamanho: "Tamanho",
  warranty: "Garantia",
  garantia: "Garantia",

  // Eletrónica / Câmaras
  resolution: "Resolução",
  resolução: "Resolução",
  resolucao: "Resolução",
  sensor: "Sensor",
  lens: "Lente",
  lente: "Lente",
  aperture: "Abertura",
  abertura: "Abertura",
  focalLength: "Distância Focal",
  zoom: "Zoom",
  fps: "Frames por Segundo",
  nightVision: "Visão Noturna",
  nightvision: "Visão Noturna",
  visãonoturna: "Visão Noturna",
  infravermelho: "Infravermelhos",
  ir: "Infravermelhos (IR)",
  wdr: "WDR (Wide Dynamic Range)",
  hdr: "HDR",
  compression: "Compressão de Vídeo",
  compressão: "Compressão de Vídeo",
  codec: "Codec",

  // Rede / Conectividade
  connectivity: "Conectividade",
  conectividade: "Conectividade",
  wifi: "Wi-Fi",
  bluetooth: "Bluetooth",
  ethernet: "Ethernet",
  protocol: "Protocolo",
  protocolo: "Protocolo",
  interface: "Interface",
  poe: "PoE (Power over Ethernet)",

  // Energia
  power: "Potência",
  potência: "Potência",
  potencia: "Potência",
  voltagem: "Voltagem",
  voltage: "Voltagem",
  battery: "Bateria",
  bateria: "Bateria",
  autonomia: "Autonomia",
  consumo: "Consumo",

  // Proteção
  protection: "Proteção",
  proteção: "Proteção",
  protecao: "Proteção",
  ip: "Classificação IP",
  waterproof: "À Prova de Água",
  vandal: "Anti-Vandalismo",
  ik: "Resistência a Impacto (IK)",

  // Armazenamento / Memória
  storage: "Armazenamento",
  armazenamento: "Armazenamento",
  memória: "Memória",
  memoria: "Memória",
  sdcard: "Cartão SD",
  hdd: "Disco Rígido",

  // Processamento
  processor: "Processador",
  processador: "Processador",
  chipset: "Chipset",
  cpu: "CPU",
  ram: "RAM",

  // Áudio
  audio: "Áudio",
  som: "Som",
  microphone: "Microfone",
  microfone: "Microfone",
  speaker: "Altifalante",
  altifalante: "Altifalante",

  // Temperatura
  temperature: "Temperatura de Operação",
  temperatura: "Temperatura de Operação",

  // Outras
  compatibility: "Compatibilidade",
  compatibilidade: "Compatibilidade",
  speed: "Velocidade",
  velocidade: "Velocidade",
  capacity: "Capacidade",
  capacidade: "Capacidade",
  mounting: "Montagem",
  montagem: "Montagem",
  certification: "Certificação",
  certificação: "Certificação",
  origin: "Origem",
  origem: "País de Origem",
};

/**
 * Converte uma chave técnica de spec para um label legível em português.
 * Tenta match exato, depois normalizado, depois capitaliza como fallback.
 */
export function humanizeSpecKey(key: string): string {
  // Match exato
  if (SPEC_LABEL_MAP[key]) return SPEC_LABEL_MAP[key];

  // Match normalizado (lowercase, sem acentos)
  const normalized = key.toLowerCase().trim();
  if (SPEC_LABEL_MAP[normalized]) return SPEC_LABEL_MAP[normalized];

  // Fallback: capitalizar e separar camelCase
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Filtra specs inválidas: valores vazios, null, undefined, ou chaves com texto raw longo.
 */
export function filterValidSpecs(
  specs: Record<string, string>
): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(specs)) {
    // Filtrar valores vazios
    if (!value || value.trim() === "" || value === "null" || value === "undefined") continue;
    // Filtrar chave "specs" que é um bloco de texto raw (>100 chars sem espaços = colado)
    if (key.toLowerCase() === "specs" && value.length > 100) continue;
    // Filtrar valores que são blocos de texto sem estrutura (provável dump)
    if (value.length > 200 && !value.includes(":") && !value.includes("\n")) continue;
    filtered[key] = value;
  }
  return filtered;
}
