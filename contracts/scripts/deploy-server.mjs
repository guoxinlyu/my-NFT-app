import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { JsonRpcProvider, keccak256 } from 'ethers';
import { root } from './compile.mjs';
import { verifyDeployment } from './verify-deployment.mjs';

const port = 8787;
const origin = `http://127.0.0.1:${port}`;
const token = randomBytes(32).toString('hex');
const artifact = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/LivePass.json'), 'utf8'));
const compilerInput = fs.readFileSync(path.join(root, 'artifacts/compiler-input.json'), 'utf8');
const input = JSON.parse(compilerInput);
if (input.sources['src/LivePass.sol'].content !== fs.readFileSync(path.join(root, 'src/LivePass.sol'), 'utf8')) {
  throw new Error('Contract changed after compilation. Recompile before deployment.');
}
const buildHash = createHash('sha256').update(compilerInput).digest('hex');
const deploymentDir = path.join(root, 'deployments');
const recordPath = path.join(deploymentDir, 'sepolia.json');
const pendingPath = path.join(deploymentDir, 'sepolia-pending.json');
const jsonRead = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
let verifying = false;

function json(response, code, value) {
  response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}
async function body(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 4096) throw new Error('Request too large');
  }
  return JSON.parse(text);
}
async function verify(hash) {
  let failure;
  for (const url of ['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.drpc.org']) {
    const provider = new JsonRpcProvider(url, undefined, { batchMaxCount: 1, cacheTimeout: -1 });
    try { return await verifyDeployment(provider, artifact, hash); }
    catch (error) { failure = error; }
    finally { provider.destroy(); }
  }
  throw failure;
}

const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  if (request.headers.host !== `127.0.0.1:${port}`) return json(response, 403, { error: 'Use the loopback URL' });
  try {
    const url = new URL(request.url, origin);
    if (request.method === 'GET') {
      if (url.pathname === '/api/build') return json(response, 200, {
        token, abi: artifact.abi, bytecode: artifact.bytecode, compiler: artifact.compiler,
        bytecodeHash: keccak256(artifact.bytecode), buildHash,
        recorded: jsonRead(recordPath), pending: jsonRead(pendingPath),
      });
      if (url.pathname === '/api/status') return json(response, 200, { recorded: jsonRead(recordPath), pending: jsonRead(pendingPath) });
      const files = {
        '/': ['deploy-ui/index.html', 'text/html; charset=utf-8'],
        '/app.js': ['deploy-ui/app.js', 'text/javascript; charset=utf-8'],
        '/fees.js': ['deployment-fees.mjs', 'text/javascript; charset=utf-8'],
        '/ethers.js': ['../node_modules/ethers/dist/ethers.min.js', 'text/javascript; charset=utf-8'],
      };
      const file = files[url.pathname];
      if (!file) return json(response, 404, { error: 'Not found' });
      response.writeHead(200, { 'Content-Type': file[1] });
      response.end(fs.readFileSync(path.resolve(root, 'scripts', file[0])));
      return;
    }
    if (request.method !== 'POST' || request.headers.origin !== origin || request.headers['x-deploy-token'] !== token) {
      return json(response, 403, { error: 'Invalid local session' });
    }
    if (!['/api/pending', '/api/record'].includes(url.pathname)) return json(response, 404, { error: 'Not found' });
    const payload = await body(request);
    if (!/^0x[0-9a-fA-F]{64}$/.test(payload.transactionHash)) throw new Error('Invalid transaction hash');
    if (payload.buildHash !== buildHash) throw new Error('Build changed; reload the page');
    const existing = jsonRead(recordPath);
    if (existing && existing.transactionHash.toLowerCase() !== payload.transactionHash.toLowerCase()) throw new Error('A different Sepolia deployment is already recorded; refusing to overwrite');
    fs.mkdirSync(deploymentDir, { recursive: true });
    if (url.pathname === '/api/pending') {
      const pending = jsonRead(pendingPath);
      if (pending && pending.transactionHash.toLowerCase() !== payload.transactionHash.toLowerCase()) throw new Error('Another deployment is already pending; verify it before proceeding');
      fs.writeFileSync(pendingPath, JSON.stringify({ transactionHash: payload.transactionHash, buildHash, submittedAt: new Date().toISOString() }, null, 2) + '\n');
      return json(response, 200, { pending: true });
    }
    if (verifying) return json(response, 409, { error: '正在核对链上结果，请稍后重试。' });
    verifying = true;
    try {
      const record = { ...await verify(payload.transactionHash), compilerInputSHA256: buildHash };
      if (existing) {
        // Rechecking the same transaction must not erase completed source verification.
        for (const key of ['sourceVerification', 'sourcifyVerificationId', 'sourcifyURL']) {
          if (existing[key] !== undefined) record[key] = existing[key];
        }
      }
      // Preserve the exact build, ABI and all dependency sources next to the receipt.
      const snapshotDir = path.join(deploymentDir, 'sepolia-build');
      fs.mkdirSync(snapshotDir, { recursive: true });
      fs.writeFileSync(path.join(snapshotDir, 'compiler-input.json'), compilerInput);
      fs.writeFileSync(path.join(snapshotDir, 'LivePass.json'), JSON.stringify(artifact, null, 2) + '\n');
      fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
      console.log(`VERIFIED Sepolia deployment: ${record.address} tx=${record.transactionHash} block=${record.blockNumber}`);
      return json(response, 200, record);
    } finally { verifying = false; }
  } catch (error) {
    json(response, 400, { error: error.shortMessage ?? error.message });
  }
});
server.listen(port, '127.0.0.1', () => console.log(`LivePass deployment ready: ${origin}\nOnly Sepolia; MetaMask signs in your browser. No private keys are read.`));
