import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { parseStock } from './index.ts'

Deno.test('deteta sem stock', () => {
  assertEquals(parseStock('Produto AJ-HUB2 — Esgotado, prazo 10 dias').level, 'none')
  assertEquals(parseStock('Out of stock').level, 'none')
})

Deno.test('deteta últimas unidades', () => {
  assertEquals(parseStock('Disponibilidade: Últimas unidades').level, 'low')
  assertEquals(parseStock('Stock: 3').level, 'low')
})

Deno.test('deteta stock abundante', () => {
  assertEquals(parseStock('Em stock, entrega imediata').level, 'high')
  const r = parseStock('42 unidades disponíveis')
  assertEquals(r.level, 'high')
  assertEquals(r.qty, 42)
})

Deno.test('falha fechado sem evidência', () => {
  assertThrows(() => parseStock('Ficha técnica do produto sem indicação'))
})
