import fs from 'node:fs';
import path from 'node:path';
import { root } from './compile.mjs';

const directory = path.join(root, 'deployments');
const file = path.join(directory, 'sepolia.json');
const record = JSON.parse(fs.readFileSync(file, 'utf8'));
if (record.chainId !== 11155111) throw new Error('Only the recorded Sepolia deployment can be verified');
const artifact = JSON.parse(fs.readFileSync(path.join(directory, 'sepolia-build/LivePass.json'), 'utf8'));
const input = JSON.parse(fs.readFileSync(path.join(directory, 'sepolia-build/compiler-input.json'), 'utf8'));
// Only send the actual contract and its transitive library sources, never local test helpers.
const metadata = JSON.parse(artifact.metadata);
const sources = Object.fromEntries(Object.keys(metadata.sources).map(name => [name, input.sources[name]]));
const standardInput = { ...input, sources };
const api = 'https://sourcify.dev/server/v2';
const request = async (url, options = {}) => {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(45000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  return data;
};

let job;
if (record.sourcifyVerificationId) job = record.sourcifyVerificationId;
else {
  const submitted = await request(`${api}/verify/11155111/${record.address}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stdJsonInput: standardInput, compilerVersion: record.compiler.split('.Emscripten')[0],
      contractIdentifier: 'src/LivePass.sol:LivePass', creationTransactionHash: record.transactionHash }),
  });
  if (!submitted.verificationId) throw new Error(`No verification ID: ${JSON.stringify(submitted)}`);
  job = submitted.verificationId;
  record.sourcifyVerificationId = job;
  record.sourceVerification = 'sourcify-pending';
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
}
console.log(`Sourcify job: ${job}`);
// Poll only a bounded number of times. Re-running resumes the same job.
for (let attempt = 0; attempt < 6; attempt++) {
  const result = await request(`${api}/verify/${job}`);
  fs.writeFileSync(path.join(directory, 'sourcify-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
  if (result.isJobCompleted) {
    const lookup = await request(`${api}/contract/11155111/${record.address}?fields=all`);
    fs.writeFileSync(path.join(directory, 'sourcify-contract.json'), JSON.stringify(lookup, null, 2) + '\n');
    if (lookup.match === 'exact_match' || lookup.match === 'match') {
      record.sourceVerification = `sourcify-${lookup.match}`;
      record.sourcifyURL = `https://repo.sourcify.dev/11155111/${record.address}`;
      fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
      console.log(`Source verified: ${record.sourcifyURL}`);
    } else throw new Error(`Verification not matched: ${JSON.stringify(result)}`);
    break;
  }
  if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 5000));
}
