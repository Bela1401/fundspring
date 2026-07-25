# Interaction guide

## Wallet

Connect a standard EOA wallet and select Arc Testnet. Fund it with testnet USDC.
USDC pays both application amounts and gas; ETH is never required.

## Create

Supply a title, HTTPS metadata URI, 6-decimal USDC goal, future deadline, and
beneficiary. Validate the metadata preview before signing; the client requires
a 20-2,000 character description, caps the document at 64 KB, and accepts only
HTTPS optional media/outbound URLs. Wait for the final receipt and use
`CampaignCreated` as the source of the deployed campaign address.

## Contribute

- Standard works with the broadest set of wallets.
- Batch is offered only to an EOA with insufficient allowance.
- Memo requires allowance first and a public local reference.

The UI estimates gas before submission and checks the shared USDC balance.
Two-transaction routes show approval and action fees separately and re-estimate
the action after approval before requesting the second signature.

## Fund wallet

The optional Circle App Kit panel bridges testnet USDC from Ethereum Sepolia,
Base Sepolia, or Arbitrum Sepolia to Arc Testnet. The user confirms source,
amount, and wallet prompts; FundSpring waits for App Kit's bridge result and
then switches back to Arc. Bridging and contributing remain separate,
non-atomic operations.

## Settle

After the deadline, anyone finalizes. The beneficiary claims after success.
Contributors claim their own refunds after failure or cancellation.

Every finalized transaction links to Arc Testnet Explorer.
