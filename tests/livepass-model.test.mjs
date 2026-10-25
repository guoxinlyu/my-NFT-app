import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEther, Interface } from 'ethers';
import { ethInput, showInput, ticketStatus, ticketImage, chainError, ticketIds, entryDecision } from '../src/livepass/model.ts';
import { LIVEPASS_ABI } from '../src/livepass/contract.ts';

test('amounts preserve wei precision and reject exponent, negatives and excess decimals', () => {
  assert.equal(ethInput('0.000000000000000001'), 1n);
  assert.equal(ethInput('1000000.000000000000000001'), 1000000000000000000000001n);
  assert.equal(ethInput('0', true), 0n);
  for (const value of ['1e-3', '-1', '0.0000000000000000001', '0', 'NaN', '01']) assert.throws(() => ethInput(value));
});
test('publish validation matches contract-safe names, HTTPS posters and stake floor', () => {
  const args = showInput('测试 🎵', 'https://example.com/poster.png', '0.0001', 2, '0.001', parseEther('0.001'));
  assert.equal(args[2], 100000000000000n); assert.equal(args[4], 1000000000000000n);
  for (const name of ['<script>', 'a"b', 'a&b', '\ud800', 'a'.repeat(65)]) assert.throws(() => showInput(name, args[1], '1', 0, '0', 1n));
  assert.throws(() => showInput('Test', 'javascript:alert(1)', '1', 0, '0', 1n));
  assert.throws(() => showInput('Test', args[1], '1', 0, '0.0001', parseEther('0.001')));
});
test('ticket state gives used priority and distinguishes transferred Open and Detect', () => {
  assert.equal(ticketStatus(true, 'B', 'A', 'Detect'), 'VERIFIED · ADMIT');
  assert.equal(ticketStatus(false, 'a', 'A', 'Closed'), 'UNUSED · VALID');
  assert.equal(ticketStatus(false, 'B', 'A', 'Open'), 'TRANSFERRED · ADMISSIBLE');
  assert.equal(ticketStatus(false, 'B', 'A', 'Detect'), 'RESOLD · NOT ADMISSIBLE');
});
test('verification IDs are uint256 integers and admission rejects wrong show, used and Detect resale', () => {
  assert.deepEqual(ticketIds('0', '9007199254740993'), [0n, 9007199254740993n]);
  for (const token of ['0', '-1', '1.0', '1e2', '01', '', (2n ** 256n).toString()]) assert.throws(() => ticketIds('0', token));
  assert.throws(() => ticketIds('-1', '1'));
  assert.equal(entryDecision('1', '0', false, 'A', 'A', 'Closed').allowed, false);
  assert.equal(entryDecision('0', '0', true, 'A', 'A', 'Open').allowed, false);
  assert.equal(entryDecision('0', '0', false, 'B', 'A', 'Detect').allowed, false);
  assert.equal(entryDecision('0', '0', false, 'a', 'A', 'Detect').allowed, true);
  assert.equal(entryDecision('0', '0', false, 'B', 'A', 'Open').allowed, true);
});
test('SVG ticket remains an image data URI and RPC revert reasons survive decoding', () => {
  const uri = image => `data:application/json;base64,${Buffer.from(JSON.stringify({ image })).toString('base64')}`;
  assert.equal(ticketImage(uri('data:image/svg+xml;base64,PHN2Zy8+')), 'data:image/svg+xml;base64,PHN2Zy8+');
  assert.throws(() => ticketImage(uri('<svg onload="alert(1)"/>')));
  assert.throws(() => ticketImage(uri('https://example.com/track.svg')));
  const iface = new Interface(LIVEPASS_ABI);
  assert.equal(chainError({ data: iface.encodeErrorResult('Error', ['Already bought']) }).message, 'Already bought');
  assert.equal(chainError({ code: 'ACTION_REJECTED' }).rejected, true);
});
