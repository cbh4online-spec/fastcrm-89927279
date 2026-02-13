
-- Delete existing structures
DELETE FROM public.persuasion_structures;

-- Insert 6 calibrated METODOPARE structures
INSERT INTO public.persuasion_structures (key, label, channel, blocks, constraints) VALUES
('AIDA', 'AIDA — Email Completo', 'email',
 '[{"id":"attention","goal":"Hook contextualizado","required":true},{"id":"interest","goal":"Problema ou insight estratégico","required":true},{"id":"desire","goal":"Resultado / transformação / prova","required":true},{"id":"action","goal":"CTA único e claro","required":true}]'::jsonb,
 '{"max_length":1600,"cta_type":"single","tone_options":["consultative","strategic"]}'::jsonb),

('AIDA_SHORT', 'AIDA Short — WhatsApp', 'whatsapp',
 '[{"id":"attention","goal":"Mensagem curta personalizada","required":true},{"id":"interest","goal":"Insight direto","required":true},{"id":"action","goal":"Pergunta simples","required":true}]'::jsonb,
 '{"max_length":350,"cta_type":"question","tone_options":["direct","consultative"]}'::jsonb),

('PAS', 'PAS — Problema, Agitação, Solução', 'email',
 '[{"id":"problem","goal":"Identificar dor real","required":true},{"id":"agitate","goal":"Consequência de não agir","required":true},{"id":"solution","goal":"Apresentar solução clara","required":true},{"id":"action","goal":"CTA decisivo","required":true}]'::jsonb,
 '{"max_length":1400,"cta_type":"decisive","tone_options":["direct","strategic"]}'::jsonb),

('BAB', 'BAB — Before, After, Bridge', 'email',
 '[{"id":"before","goal":"Situação atual","required":true},{"id":"after","goal":"Resultado desejado","required":true},{"id":"bridge","goal":"Método PARE como ponte","required":true},{"id":"action","goal":"Próximo passo claro","required":true}]'::jsonb,
 '{"max_length":1500,"cta_type":"consultative","tone_options":["consultative","strategic"]}'::jsonb),

('4P', '4P — Picture, Promise, Proof, Push', 'email',
 '[{"id":"picture","goal":"Visualizar cenário futuro","required":true},{"id":"promise","goal":"Promessa específica","required":true},{"id":"proof","goal":"Prova ou lógica sólida","required":true},{"id":"push","goal":"Encerramento objetivo","required":true}]'::jsonb,
 '{"max_length":1300,"cta_type":"closing","tone_options":["direct","strategic"]}'::jsonb),

('REENGAGE', 'Reativação Inteligente', 'email',
 '[{"id":"reference","goal":"Relembrar contacto anterior","required":true},{"id":"update","goal":"Nova evolução / melhoria","required":true},{"id":"opportunity","goal":"Novo ângulo de valor","required":true},{"id":"action","goal":"Convite leve","required":true}]'::jsonb,
 '{"max_length":1200,"cta_type":"soft","tone_options":["consultative"]}'::jsonb);
