# Deployment records

`arc-testnet.json` is deliberately marked `pending`. No FundSpring-owned
contract address or transaction hash is included until an actual deployment is
executed and finalized.

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

