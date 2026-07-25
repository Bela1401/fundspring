# Arc-specific testnet validation

Local Foundry/Anvil cannot reproduce Arc's CallFrom sender preservation,
EIP-7708 native USDC events, or token blocklist behavior. Before a public
launch, run this exact funded-EOA matrix on Arc Testnet and record real hashes:

1. Deploy CampaignFactory with official USDC and create a campaign.
2. With zero allowance, call `Multicall3From.aggregate3` containing exactly:
   - USDC `approve(campaign, amount)`, `allowFailure=false`;
   - campaign `contribute(amount)`, `allowFailure=false`.
3. Verify final receipt:
   - ERC-20 `Transfer.from` is the EOA;
   - `Transfer.to` is the campaign;
   - `ContributionReceived.contributor` is the EOA;
   - allowance and campaign totals refresh correctly.
4. Force one subcall to fail and confirm the entire batch reverts.
5. Prepare allowance, then call `Memo.memo` directly from the EOA with the
   documented FundSpring format.
6. Verify `Memo.sender`, `target`, `memoId`, `callDataHash`,
   `ContributionReceived`, and USDC `Transfer` in one final receipt.
7. Attempt both extensions through a contract wallet and confirm the UI offers
   the standard fallback instead.
8. Confirm estimated and actual `gasUsed × effectiveGasPrice` are displayed as
   USDC and that success appears after one final receipt.

This repository does not contain testnet credentials, so these onchain tests
are pending and must not be reported as passed.

