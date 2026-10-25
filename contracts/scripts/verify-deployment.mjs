import { AbiCoder, Contract, getAddress, getCreateAddress, keccak256 } from 'ethers';

/** Verify public chain evidence before recording a deployment. Never signs. */
export async function verifyDeployment(provider, artifact, transactionHash, expectedChainId = 11155111n) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) throw new Error('Invalid transaction hash');
  const chainId = BigInt(await provider.send('eth_chainId', []));
  if (chainId !== expectedChainId) throw new Error('RPC is not on the expected chain');
  const [transaction, receipt] = await Promise.all([
    provider.getTransaction(transactionHash), provider.getTransactionReceipt(transactionHash),
  ]);
  if (!transaction || !receipt) throw new Error('交易尚未确认，请稍后重试核对。不要重复部署。');
  if (receipt.status !== 1 || !receipt.contractAddress || transaction.to !== null || transaction.value !== 0n) {
    throw new Error('Transaction is not a successful zero-value contract deployment');
  }
  const prefix = artifact.bytecode.toLowerCase();
  const data = transaction.data.toLowerCase();
  if (!data.startsWith(prefix) || data.length !== prefix.length + 64) throw new Error('Creation bytecode does not match the tested build');
  const constructorArguments = '0x' + data.slice(prefix.length);
  const [owner] = AbiCoder.defaultAbiCoder().decode(['address'], constructorArguments);
  if (getAddress(owner) !== getAddress(transaction.from)) throw new Error('Initial owner must be the connected deployer');
  const address = getAddress(receipt.contractAddress);
  if (address !== getCreateAddress({ from: transaction.from, nonce: transaction.nonce })) throw new Error('Contract address mismatch');
  const [block, code] = await Promise.all([
    provider.getBlock(receipt.blockNumber), provider.getCode(address, receipt.blockNumber),
  ]);
  if (!block || block.hash !== receipt.blockHash) throw new Error('Deployment receipt is not on the canonical chain');
  if (code.toLowerCase() !== artifact.deployedBytecode.toLowerCase()) throw new Error('On-chain runtime bytecode does not match the tested build');
  const contract = new Contract(address, artifact.abi, provider);
  const at = { blockTag: receipt.blockNumber };
  const [chainOwner, name, symbol, showCount, cooldown, stakeFloor] = await Promise.all([
    contract.owner(at), contract.name(at), contract.symbol(at), contract.showCount(at),
    contract.STAKE_COOLDOWN(at), contract.MIN_STAKE_FLOOR(at),
  ]);
  if (getAddress(chainOwner) !== getAddress(owner) || name !== 'LivePass' || symbol !== 'LIVEPASS'
      || showCount !== 0n || cooldown !== 600n || stakeFloor !== 1000000000000000n) throw new Error('Initial contract state mismatch');
  return {
    chainId: Number(chainId), network: chainId === 11155111n ? 'sepolia' : 'local-test',
    address, transactionHash: receipt.hash, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash,
    deployedAt: new Date(block.timestamp * 1000).toISOString(), deployer: getAddress(transaction.from),
    initialOwner: getAddress(owner), constructorArguments,
    compiler: artifact.compiler, creationBytecodeHash: keccak256(artifact.bytecode), runtimeBytecodeHash: keccak256(code),
    gasUsed: receipt.gasUsed.toString(), feeWei: receipt.fee.toString(),
    checks: { name, symbol, initialShowCount: '0', stakeCooldown: cooldown.toString(), minStakeFloor: stakeFloor.toString() },
    explorer: chainId === 11155111n ? `https://sepolia.etherscan.io/address/${address}` : null,
    sourceVerification: 'not-submitted',
  };
}
