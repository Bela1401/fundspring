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

Both active project contracts were source-verified through Arc Testnet
Explorer's Blockscout API on 2026-08-03. Keep the verification links and dates
in sync with the deployment record.
