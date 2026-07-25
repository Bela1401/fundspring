# Arc Testnet deployment

## Preconditions

1. Re-check Arc's current network phase, contract addresses, EVM differences,
   and verification guide.
2. Install Foundry and dependencies.
3. Import an Arc Testnet deployer into an encrypted Foundry keystore.
4. Fund it with testnet USDC from the Circle Faucet.
5. Copy `.env.example` to a local ignored environment file.

Never pass or commit a plain-text private key.

## Deploy

```bash
forge fmt --check
forge build
forge test -vvv
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$ARC_RPC_URL" \
  --account "$FOUNDRY_ACCOUNT" \
  --broadcast
```

The script refuses non-Arc-Testnet chain IDs and unexpected USDC addresses.

## Record

Read the final receipt and Foundry `broadcast/` artifact. Update
`deployments/arc-testnet.json` with only real:

- deployer;
- factory address;
- deployment transaction and block;
- constructor parameter;
- verification status/link.

Set `NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS` and
`NEXT_PUBLIC_DEPLOYMENT_BLOCK`, then rebuild the frontend.

## Verify

```bash
forge verify-contract "$CAMPAIGN_FACTORY_ADDRESS" \
  contracts/CampaignFactory.sol:CampaignFactory \
  --chain-id 5042002 \
  --verifier blockscout \
  --verifier-url https://testnet.arcscan.app/api/ \
  --constructor-args "$(cast abi-encode 'constructor(address)' \
  0x3600000000000000000000000000000000000000)"
```

Each FundingCampaign is deployed by the factory. Retrieve its constructor
arguments from `CampaignCreated` and the creation transaction before verifying.

## Interaction scripts

`CreateCampaign.s.sol`, `Contribute.s.sol`, `Finalize.s.sol`, and
`ClaimRefund.s.sol` read addresses/values from environment variables and use the
same encrypted Foundry account selected on the CLI.

