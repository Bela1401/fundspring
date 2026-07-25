# Contributing to FundSpring

1. Create a focused branch.
2. Do not commit secrets, generated deployment claims, or fabricated activity.
3. Keep FundSpring as the primary brand and Arc as infrastructure.
4. Add tests for contract behavior changes.
5. Run:

```bash
forge fmt --check
forge build
forge test -vvv
npm run lint
npm run typecheck
npm run build
```

For Arc-specific behavior, cite the current official documentation and record
real testnet transactions only after they are final.

