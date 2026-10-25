import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function compile() {
  const sources = Object.fromEntries(['src/LivePass.sol', 'test/Adversaries.sol'].map(name =>
    [name, { content: fs.readFileSync(path.join(root, name), 'utf8') }]));
  const input = {
    language: 'Solidity', sources,
    settings: {
      optimizer: { enabled: true, runs: 200 }, viaIR: true, evmVersion: 'cancun',
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata'] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input), {
    import: name => {
      // Only allow package imports under this project's node_modules.
      const target = path.resolve(root, 'node_modules', name);
      const base = path.resolve(root, 'node_modules') + path.sep;
      if (!target.startsWith(base)) return { error: 'Import outside node_modules' };
      try {
        const content = fs.readFileSync(target, 'utf8');
        // Retain every resolved dependency for reproducible Standard JSON input.
        input.sources[name] = { content };
        return { contents: content };
      }
      catch { return { error: `Missing import: ${name}` }; }
    },
  }));
  for (const diagnostic of output.errors ?? []) {
    if (diagnostic.severity === 'error') throw new Error(diagnostic.formattedMessage);
    console.warn(diagnostic.formattedMessage);
  }
  const artifacts = {};
  for (const [sourceName, contracts] of Object.entries(output.contracts)) {
    if (!['src/LivePass.sol', 'test/Adversaries.sol'].includes(sourceName)) continue;
    for (const [contractName, contract] of Object.entries(contracts)) {
      artifacts[contractName] = {
        contractName, sourceName, compiler: solc.version(),
        abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}`,
        deployedBytecode: `0x${contract.evm.deployedBytecode.object}`, metadata: contract.metadata,
      };
    }
  }
  const bytes = (artifacts.LivePass.deployedBytecode.length - 2) / 2;
  if (bytes > 24576) throw new Error(`Runtime bytecode exceeds EIP-170: ${bytes}`);
  fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  for (const [name, artifact] of Object.entries(artifacts)) {
    fs.writeFileSync(path.join(root, 'artifacts', `${name}.json`), JSON.stringify(artifact, null, 2) + '\n');
  }
  fs.writeFileSync(path.join(root, 'artifacts', 'compiler-input.json'), JSON.stringify(input, null, 2) + '\n');
  fs.mkdirSync(path.join(root, 'abi'), { recursive: true });
  fs.writeFileSync(path.join(root, 'abi', 'LivePass.json'), JSON.stringify(artifacts.LivePass.abi, null, 2) + '\n');
  console.log(`Compiled LivePass with ${solc.version()}; runtime ${bytes}/24576 bytes`);
  return artifacts;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) compile();
