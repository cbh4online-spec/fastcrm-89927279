import { describe, it, expect } from 'vitest';
import {
  parseSocialProfile,
  normalizeSocialValue,
  socialMessageUrl,
  socialDisplayValue,
} from '@/lib/social/socialProfiles';

describe('parseSocialProfile', () => {
  it('aceita handle com @ no Instagram', () => {
    const p = parseSocialProfile('instagram', '@diogotricologia');
    expect(p?.handle).toBe('diogotricologia');
    expect(p?.profileUrl).toBe('https://www.instagram.com/diogotricologia');
    expect(p?.messageUrl).toBe('https://ig.me/m/diogotricologia');
    expect(p?.displayHandle).toBe('@diogotricologia');
  });

  it('aceita handle sem @', () => {
    expect(parseSocialProfile('instagram', 'diogotricologia')?.handle).toBe('diogotricologia');
  });

  it('aceita endereço completo com www, barra final e querystring', () => {
    const p = parseSocialProfile('instagram', 'https://www.instagram.com/diogotricologia/?hl=pt');
    expect(p?.handle).toBe('diogotricologia');
  });

  it('aceita ig.me/m/ como origem', () => {
    expect(parseSocialProfile('instagram', 'https://ig.me/m/diogotricologia')?.handle).toBe(
      'diogotricologia',
    );
  });

  it('extrai handle do LinkedIn ignorando /in/', () => {
    const p = parseSocialProfile('linkedin', 'https://www.linkedin.com/in/joao-silva/');
    expect(p?.profileUrl).toBe('https://www.linkedin.com/in/joao-silva');
    expect(p?.supportsMessaging).toBe(false);
    expect(p?.messageUrl).toBe('https://www.linkedin.com/in/joao-silva');
  });

  it('rejeita endereço de outra rede', () => {
    expect(parseSocialProfile('instagram', 'https://example.com/perfil')).toBeNull();
  });

  it('rejeita valor sem sentido', () => {
    expect(parseSocialProfile('instagram', 'não é um perfil!!')).toBeNull();
    expect(parseSocialProfile('instagram', '')).toBeNull();
  });

  it('trata WhatsApp como número', () => {
    const p = parseSocialProfile('whatsapp', '+351 912 345 678');
    expect(p?.handle).toBe('351912345678');
    expect(p?.messageUrl).toBe('https://wa.me/351912345678');
    expect(p?.displayHandle).toBe('+351912345678');
  });

  it('mantém prefixo @ no YouTube e TikTok', () => {
    expect(parseSocialProfile('youtube', 'fastcrm')?.profileUrl).toBe(
      'https://www.youtube.com/@fastcrm',
    );
    expect(parseSocialProfile('tiktok', '@fastcrm')?.profileUrl).toBe(
      'https://www.tiktok.com/@fastcrm',
    );
  });
});

describe('normalizeSocialValue', () => {
  it('grava o endereço canónico', () => {
    expect(normalizeSocialValue('instagram', '@diogotricologia')).toBe(
      'https://www.instagram.com/diogotricologia',
    );
  });

  it('devolve null para vazio', () => {
    expect(normalizeSocialValue('instagram', '   ')).toBeNull();
    expect(normalizeSocialValue('instagram', null)).toBeNull();
  });

  it('preserva valor não reconhecido', () => {
    expect(normalizeSocialValue('instagram', 'perfil inválido!')).toBe('perfil inválido!');
  });
});

describe('links e apresentação', () => {
  it('socialMessageUrl devolve null para valor inválido', () => {
    expect(socialMessageUrl('instagram', 'perfil inválido!')).toBeNull();
  });

  it('socialDisplayValue devolve o valor original quando não reconhece', () => {
    expect(socialDisplayValue('instagram', 'perfil inválido!')).toBe('perfil inválido!');
  });
});
