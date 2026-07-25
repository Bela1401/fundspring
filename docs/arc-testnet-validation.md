# Arc-specific testnet validation

Local Foundry/Anvil cannot reproduce Arc's CallFrom sender preservation,
EIP-7708 native USDC events, or token blocklist behavior. The exact funded-EOA
matrix below was executed against Arc Testnet on 2026-07-25:

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

## Recorded results

- CampaignFactory deployment:
  `0x0a7b3ee27fac39a1551d48da82af34a0555deeb97ce9c959b503cb9d2e4d772d`
- FundingCampaign creation:
  `0x8c72ebdfb058f9ba05f58aa655791325cf6b5c1738c76bc2f39a5b110fe6a7c4`
- Successful atomic approve + contribute:
  `0x5dc0638361a7291b79d8965ca704ea1805ae9f6fb74a4f8a18f8915b9a396b51`
- Successful Memo contribution:
  `0xfc7dcb243c207782dfc50270818ac8ada71b0a5eb67952bd96c7f35258e46172`
- Expected atomic batch revert:
  `0x5a11a9fc1fecb12984a4e97f685849eb43e291ae430ebb538cfbc16363d50cb2`

The successful batch receipt attributed both the USDC Transfer and
ContributionReceived event to the original EOA. The failed batch left allowance
at zero and totalRaised unchanged. The Memo receipt matched sender, target,
memoId, callDataHash, ContributionReceived, and the 6-decimal USDC Transfer.

The UI disables Memo and Multicall3From when the connected address has contract
code and retains the standard two-transaction fallback. No unsupported smart
account extension call was broadcast.
