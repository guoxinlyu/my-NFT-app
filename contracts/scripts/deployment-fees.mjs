/** Use the node's actual gas-price suggestion, rather than an unrelated tip default. */
export function deploymentFees(gasPrice, baseFee) {
  if (typeof gasPrice !== 'bigint' || typeof baseFee !== 'bigint' || gasPrice <= 0n || baseFee < 0n) {
    throw new Error('无法读取有效的 Sepolia 费率，请稍后重试。');
  }
  const priority = gasPrice > baseFee ? gasPrice - baseFee : 1n;
  const baseCap = baseFee * 2n + priority;
  const suggestionCap = gasPrice * 2n;
  return {
    type: 2,
    maxFeePerGas: baseCap > suggestionCap ? baseCap : suggestionCap,
    maxPriorityFeePerGas: priority,
    suggestedGasPrice: gasPrice,
  };
}

export async function readDeploymentFees(provider) {
  const [price, block] = await Promise.all([
    provider.send('eth_gasPrice', []), provider.send('eth_getBlockByNumber', ['latest', false]),
  ]);
  if (!block || block.baseFeePerGas == null) throw new Error('无法读取 Sepolia 最新区块费率。');
  return deploymentFees(BigInt(price), BigInt(block.baseFeePerGas));
}
