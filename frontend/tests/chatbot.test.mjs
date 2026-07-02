import test from 'node:test';
import assert from 'node:assert/strict';
import { getMelitaReply } from '../src/chatbot.js';

test('responde a um tópico permitido', () => {
  const result = getMelitaReply('Quero comprar mel', 'pt');
  assert.match(result.response, /mel|loja/i);
  assert.equal(result.isAllowed, true);
});

test('recusa perguntas fora do escopo', () => {
  const result = getMelitaReply('Qual é a previsão do tempo?', 'pt');
  assert.match(result.response, /só consigo responder|site do Hexomel/i);
  assert.equal(result.isAllowed, false);
});
