import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deploymentFees, readDeploymentFees } from '../scripts/deployment-fees.mjs';

test('Sepolia low base fee uses actual RPC gas price, not a 1 gwei default', () => {
  const fees = deploymentFees(153612n, 16n);
  assert.equal(fees.maxPriorityFeePerGas, 153596n);
  assert.equal(fees.maxFeePerGas, 307224n);
  assert.equal(26241861n * fees.maxFeePerGas, 8062129503864n);
  assert.ok(26241861n * fees.maxFeePerGas < 1519898323202252n);
});

test('rising base fee and zero base fee retain valid explicit EIP-1559 limits', () => {
  for (const [price, base] of [[1n, 100n], [10n, 0n], [100n, 100n]]) {
    const fee = deploymentFees(price, base);
    assert.ok(fee.maxFeePerGas >= base * 2n + fee.maxPriorityFeePerGas);
    assert.ok(fee.maxPriorityFeePerGas > 0n);
  }
  assert.throws(() => deploymentFees(0n, 1n));
  assert.throws(() => deploymentFees(1n, -1n));
});

test('fee reader fails closed on RPC errors or missing EIP-1559 data', async () => {
  const seen = [];
  const provider = { send: async method => { seen.push(method); return method === 'eth_gasPrice' ? '0x2580c' : { baseFeePerGas: '0x10' }; } };
  assert.equal((await readDeploymentFees(provider)).maxFeePerGas, 307224n);
  assert.deepEqual(seen.sort(), ['eth_gasPrice', 'eth_getBlockByNumber'].sort());
  await assert.rejects(readDeploymentFees({ send: async () => null }));
  await assert.rejects(readDeploymentFees({ send: async () => { throw new Error('RPC unavailable'); } }), /RPC unavailable/);
});
