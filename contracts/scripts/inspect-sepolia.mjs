// Read-only public-chain acceptance evidence. Never requests a wallet or sends a transaction.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Contract, FetchRequest, JsonRpcProvider, keccak256 } from 'ethers';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deployment = JSON.parse(fs.readFileSync(path.join(root, 'deployments/sepolia.json'), 'utf8'));
const artifact = JSON.parse(fs.readFileSync(path.join(root, 'deployments/sepolia-build/LivePass.json'), 'utf8'));
const request = new FetchRequest('https://ethereum-sepolia-rpc.publicnode.com'); request.timeout = 20000;
const provider = new JsonRpcProvider(request, deployment.chainId, { batchMaxCount: 1, cacheTimeout: -1 });
try {
  if ((await provider.getNetwork()).chainId !== 11155111n) throw new Error('Wrong network');
  if (keccak256(await provider.getCode(deployment.address)) !== deployment.runtimeBytecodeHash) throw new Error('Runtime mismatch');
  const pass = new Contract(deployment.address, artifact.abi, provider);
  const block = await provider.getBlock('latest'); const at = { blockTag: block.number };
  const count = await pass.showCount(at), owner = await pass.owner(at);
  if (count > 1000n) throw new Error('Use paginated inspection for large deployments');
  const shows = [];
  for (let id = 0n; id < count; id++) {
    const s = await pass.shows(id, at);
    shows.push({ id, name: s.name, priceWei: s.price, policy: Number(s.resalePolicy), minStakeWei: s.minStake, saleOpen: s.saleOpen, rulesFrozen: s.rulesFrozen, sold: s.nextTicketNo - 1n });
  }
  const events = [];
  for (let from = deployment.blockNumber; from <= block.number; from += 1000) {
    const logs = await provider.getLogs({ address: deployment.address, fromBlock: from, toBlock: Math.min(from + 999, block.number) });
    for (const log of logs) {
      const parsed = pass.interface.parseLog(log);
      if (parsed && ['ShowCreated', 'SaleToggled', 'TicketBought', 'TicketVerified', 'Withdrawn'].includes(parsed.name)) {
        const receipt = await provider.getTransactionReceipt(log.transactionHash);
        if (!receipt || receipt.status !== 1) throw new Error('Missing successful receipt');
        events.push({ event: parsed.name, args: Object.fromEntries(parsed.fragment.inputs.map((input, i) => [input.name, parsed.args[i]])), transactionHash: log.transactionHash, blockNumber: log.blockNumber, gasUsed: receipt.gasUsed, feeWei: receipt.fee });
      }
    }
  }
  const tickets = [];
  for (const event of events.filter(e => e.event === 'TicketBought')) {
    const tokenId = event.args.tokenId;
    const holder = await pass.ownerOf(tokenId, at), p = await pass.provenance(tokenId, at);
    const uri = await pass.tokenURI(tokenId, at);
    const metadata = JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString('utf8'));
    if (!metadata.image?.startsWith('data:image/svg+xml;base64,')) throw new Error('Unexpected ticket image');
    const svg = Buffer.from(metadata.image.split(',')[1], 'base64').toString('utf8');
    tickets.push({ tokenId, holder, showId: await pass.tokenShow(tokenId, at), ticketNumber: await pass.ticketNumber(tokenId, at), issuer: p.issuerAddress, firstBuyer: p.firstBuyer, mintTime: p.mintTime, isUsed: p.isUsed, buyerHasBought: await pass.hasBought(p.firstBuyer, event.args.showId, at), svgImage: true, svgVerified: svg.includes('VERIFIED - ADMIT') });
  }
  for (const show of shows) show.verifiedCount = events.filter(e => e.event === 'TicketVerified' && e.args.showId === show.id).length;
  const repeatChecks = [];
  for (const ticket of tickets.filter(t => t.isUsed)) {
    try {
      await pass.verify.staticCall(ticket.showId, ticket.tokenId, { ...at, from: owner });
      throw new Error('Unexpected repeat verification success');
    } catch (error) {
      const reason = error.reason ?? error.revert?.name ?? error.shortMessage ?? error.message;
      if (reason !== 'Ticket already used') throw error;
      repeatChecks.push({ tokenId: ticket.tokenId, method: 'eth_call (read-only, no transaction)', reason });
    }
    if (!ticket.svgVerified) throw new Error('Used ticket SVG has not changed');
  }
  const [withdrawable, totalStaked, contractBalance] = await Promise.all([pass.ticketRevenue(at), pass.totalStaked(at), provider.getBalance(deployment.address, block.number)]);
  const sales = events.filter(e => e.event === 'TicketBought'), withdrawals = events.filter(e => e.event === 'Withdrawn');
  const revenue = { showsPublished: count, ticketsSold: sales.length, totalSales: sales.reduce((sum, e) => sum + e.args.price, 0n), withdrawable, totalStaked, contractBalance, totalWithdrawn: withdrawals.reduce((sum, e) => sum + e.args.amount, 0n) };
  if (contractBalance < withdrawable + totalStaked || revenue.totalSales !== revenue.totalWithdrawn + withdrawable) throw new Error('Revenue accounting mismatch');
  const report = { checkedAt: new Date().toISOString(), chainId: deployment.chainId, address: deployment.address, blockNumber: block.number, blockHash: block.hash, owner, shows, events, tickets, repeatChecks, revenue };
  const json = JSON.stringify(report, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2);
  if (process.argv.includes('--record')) fs.writeFileSync(path.join(root, 'deployments/sepolia-acceptance.json'), json + '\n');
  if (process.argv.includes('--record-verification')) fs.writeFileSync(path.join(root, 'deployments/sepolia-verification.json'), json + '\n');
  if (process.argv.includes('--record-revenue-before')) fs.writeFileSync(path.join(root, 'deployments/sepolia-revenue-before.json'), json + '\n');
  if (process.argv.includes('--record-revenue-after')) fs.writeFileSync(path.join(root, 'deployments/sepolia-revenue-after.json'), json + '\n');
  console.log(json);
} finally { provider.destroy(); }
