import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEther } from 'ethers';
import { showInput, validPoster, ticketImage, ticketIds } from '../src/livepass/model.ts';

test('regression: publish price is capped at 100 ETH while the exact cap stays valid', () => {
  const floor = parseEther('0.001');
  const poster = 'https://example.com/poster.png';
  assert.equal(showInput('Test', poster, '100', 0, '0', floor)[2], parseEther('100'));
  for (const price of ['100.000000000000000001', '101', '10000000']) {
    assert.throws(() => showInput('Test', poster, price, 0, '0', floor), /100 ETH/);
  }
});

test('regression: posters with embedded credentials or non-HTTPS schemes are rejected', () => {
  assert.equal(validPoster('https://example.com/poster.png'), 'https://example.com/poster.png');
  for (const poster of [
    'https://user:pass@example.com/poster.png',
    'https://user@example.com/poster.png',
    'http://example.com/poster.png',
    'ftp://example.com/poster.png',
    'not a url',
    '  ',
  ]) {
    assert.throws(() => validPoster(poster), /海报/);
  }
});

test('regression: oversized tokenURI is rejected before decoding', () => {
  const image = `data:image/svg+xml;base64,${'A'.repeat(1000000)}`;
  const uri = `data:application/json;base64,${Buffer.from(JSON.stringify({ image })).toString('base64')}`;
  assert.ok(uri.length > 1000000);
  assert.throws(() => ticketImage(uri), /Invalid tokenURI JSON encoding/);
  const small = `data:application/json;base64,${Buffer.from(JSON.stringify({ image: 'data:image/svg+xml;base64,PHN2Zy8+' })).toString('base64')}`;
  assert.equal(ticketImage(small), 'data:image/svg+xml;base64,PHN2Zy8+');
});

test('regression: uint256 maximum ids are accepted for verification inputs', () => {
  const top = (2n ** 256n - 1n).toString();
  assert.deepEqual(ticketIds(top, top), [2n ** 256n - 1n, 2n ** 256n - 1n]);
  const seventyEightDigits = BigInt('1'.repeat(78));
  assert.deepEqual(ticketIds('0', '1'.repeat(78)), [0n, seventyEightDigits]);
  assert.throws(() => ticketIds('0', '1'.repeat(79)));
  assert.throws(() => ticketIds('1'.repeat(79), '1'));
});
