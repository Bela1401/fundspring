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
  `0xa334cc5d8aa86f477036955fb23962c609dc391f289c03981c35bbf3fc9dcca2`
- FundingCampaign creation:
  `0x350e55d554aca5941c82e752ac88ca96ae65d74fa2b4b8c1fc2a3508ecfba045`
- Successful atomic approve + contribute:
  `0xa65c7b303d7163bc46c512596466d917ef5452d1ad5a2e897f4933c6cd8b2232`
- Successful Memo contribution:
  `0x3c1fb4025193565836616c97fc73f3dbb334fd5f90b7dc1cd4d4cb1d0087db56`
- Expected atomic batch revert:
  `0x1fd4b74687b0e7a7b01283ca9298abbcf3f3697024a026d58117286bbdf2b210`

The successful batch receipt attributed both the USDC Transfer and
ContributionReceived event to the original EOA. The failed batch left allowance
at zero and totalRaised unchanged. The Memo receipt matched sender, target,
memoId, callDataHash, ContributionReceived, and the 6-decimal USDC Transfer.

The UI disables Memo and Multicall3From when the connected address has contract
code and retains the standard two-transaction fallback. No unsupported smart
account extension call was broadcast.
