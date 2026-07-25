# Deployment records

`arc-testnet.json` records the finalized FundSpring Arc Testnet deployment and
the exact Memo and Multicall3From validation transactions executed on
2026-07-25.

For each deployed project contract, record:

- contract name and purpose;
- address and network;
- deployment transaction hash;
- deployment block;
- constructor parameters;
- verification status and source URL;
- major user-facing functions.

Keep official USDC, Memo, Multicall3From, RPC, and explorer under
`externalDependencies`; they are not FundSpring-owned contracts.

Source verification remains marked `pending` until Arc Testnet Explorer's
Blockscout API accepts the submitted sources. A failed verification service
request does not change the onchain deployment status.
