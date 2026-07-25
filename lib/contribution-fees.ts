export interface ContributionFeeEstimate {
  approval: bigint;
  action: bigint;
  total: bigint;
  transactionCount: 1 | 2;
}

export function contributionFeeEstimate(
  approvalGas: bigint,
  actionGas: bigint,
  gasPrice: bigint,
): ContributionFeeEstimate {
  const approval = approvalGas * gasPrice;
  const action = actionGas * gasPrice;
  return {
    approval,
    action,
    total: approval + action,
    transactionCount: approvalGas > 0n ? 2 : 1,
  };
}
