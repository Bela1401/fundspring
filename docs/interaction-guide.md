# Interaction guide

## Wallet

Connect a standard EOA wallet and select Arc Testnet. Fund it with testnet USDC.
USDC pays both application amounts and gas; ETH is never required.

## Create

Supply a title, HTTPS metadata URI, 6-decimal USDC goal, future deadline, and
beneficiary. Wait for the final receipt and use `CampaignCreated` as the source
of the deployed campaign address.

## Contribute

- Standard works with the broadest set of wallets.
- Batch is offered only to an EOA with insufficient allowance.
- Memo requires allowance first and a public local reference.

The UI estimates gas before submission and checks the shared USDC balance.

## Settle

After the deadline, anyone finalizes. The beneficiary claims after success.
Contributors claim their own refunds after failure or cancellation.

Every finalized transaction links to Arc Testnet Explorer.

