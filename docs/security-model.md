# Security model

## Trust assumptions

- Official Arc Testnet USDC behaves according to its documented ERC-20
  interface and Circle controls relevant token policies such as blocklisting.
- Arc's predeployed Memo and Multicall3From contracts preserve an original EOA
  sender only under their documented guardrails.
- Users verify wallet prompts, addresses, amounts, and network.
- HTTPS metadata can be unavailable or misleading; it does not define campaign
  economics.

## Contract protections

- immutable factory, creator, beneficiary, USDC, goal, and deadline;
- custom errors and explicit state transitions;
- `SafeERC20`;
- `ReentrancyGuard` on all token-moving user functions;
- checks-effects-interactions;
- zero-before-transfer refunds;
- single beneficiary claim;
- public, one-time finalization;
- no unbounded payout loops;
- no owner withdrawal, proxy, delegatecall, arbitrary execution, or platform
  fee.

## Solvency

Before settlement, the campaign's obligation equals recorded contributor
balances and `totalRaised`. A successful claim sets `amountClaimed` before the
transfer. Failed/cancelled refunds reduce the caller's obligation before the
transfer. Standard USDC is assumed not to be fee-on-transfer.

## Arc-specific risks

- Native and ERC-20 USDC share a balance but expose 18 and 6 decimal views.
- Local EVM tools cannot reproduce Arc CallFrom or EIP-7708 behavior.
- Memo and Multicall3From require direct EOA calls; contract wallets use the
  standard path.
- An Arc blocklist revert still consumes gas.
- RPC/indexer failure can delay UI reconciliation but cannot change contract
  state.

## Audit status

No professional third-party audit has been completed. Test coverage and code
review do not substitute for an independent audit.

