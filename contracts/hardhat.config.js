// Compilation uses the locked local solc package; Hardhat supplies the test EVM.
export default {
  networks: {
    hardhatMainnet: { type: 'edr-simulated', chainType: 'l1', chainId: 31337, hardfork: 'amsterdam', blockGasLimit: 200000000 },
    // Isolated local EVM with the frontend's expected chain ID; never connects to Sepolia.
    frontendTest: { type: 'edr-simulated', chainType: 'l1', chainId: 11155111, hardfork: 'amsterdam', blockGasLimit: 200000000 },
  },
};
