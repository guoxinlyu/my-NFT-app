import fs from 'node:fs';
import path from 'node:path';
import hre from 'hardhat';
import { BrowserProvider, ContractFactory, getAddress, toQuantity } from 'ethers';
import { root } from './compile.mjs';

const artifact = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/LivePass.json'), 'utf8'));
const account = getAddress(process.argv[2]);
const request = await new ContractFactory(artifact.abi, artifact.bytecode).getDeployTransaction(account);
const connection = await hre.network.create('hardhatMainnet');
const provider = new BrowserProvider(connection.provider);
try {
  const signer = await provider.getSigner();
  const localRequest = await new ContractFactory(artifact.abi, artifact.bytecode, signer).getDeployTransaction(account);
  const estimated = await signer.estimateGas(localRequest);
  const contract = await new ContractFactory(artifact.abi, artifact.bytecode, signer).deploy(account);
  const receipt = await contract.deploymentTransaction().wait();
  console.log(JSON.stringify({ source: 'local EVM', estimatedGas: estimated.toString(), actualGasUsed: receipt.gasUsed.toString() }));
} finally { provider.destroy(); await connection.close(); }

await Promise.all(['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.drpc.org'].map(async url => {
  let id = 0;
  const rpc = async (method, params = []) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json(); if (body.error) throw new Error(body.error.message); return body.result;
  };
  try {
    const [chainId, balance, block, gas, gasPrice, code] = await Promise.all([
      rpc('eth_chainId'), rpc('eth_getBalance', [account, 'latest']), rpc('eth_getBlockByNumber', ['latest', false]),
      rpc('eth_estimateGas', [{ from: account, data: request.data, value: toQuantity(0n) }]), rpc('eth_gasPrice'), rpc('eth_getCode', [account, 'latest']),
    ]);
    console.log(JSON.stringify({ source: url, chainId: Number(BigInt(chainId)), balanceWei: BigInt(balance).toString(),
      estimatedGas: BigInt(gas).toString(), gasPriceWei: BigInt(gasPrice).toString(), baseFeeWei: BigInt(block.baseFeePerGas).toString(),
      blockGasLimit: BigInt(block.gasLimit).toString(), accountCode: code }));
  } catch (error) { console.log(JSON.stringify({ source: url, error: error.message })); }
}));
