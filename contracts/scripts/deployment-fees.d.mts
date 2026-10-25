export type DeploymentFees = { type: number; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; suggestedGasPrice: bigint };
export function deploymentFees(gasPrice: bigint, baseFee: bigint): DeploymentFees;
export function readDeploymentFees(provider: { send(method: string, params: unknown[]): Promise<unknown> }): Promise<DeploymentFees>;
