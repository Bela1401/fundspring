# Security policy

## Status

FundSpring is experimental Arc Testnet software. It has not undergone a
professional third-party security audit and must not be represented as audited
or production-ready.

## Reporting

Do not disclose an exploitable issue in a public issue. Send a private report to
the repository owner with:

- affected commit and contract;
- reproduction steps or proof of concept;
- impact and prerequisites;
- suggested mitigation, if known.

Do not include private keys, seed phrases, real user data, or production
credentials in a report.

## Security model

The contracts use immutable campaign economics, pull-based refunds,
checks-effects-interactions, `SafeERC20`, and `ReentrancyGuard`. There is no
upgrade proxy, administrator withdrawal, protocol fee, or arbitrary call path.

The web application validates external campaign metadata at runtime, limits it
to 64 KB, accepts only HTTPS media/outbound URLs, and deploys CSP,
anti-framing, MIME-sniffing, referrer, and browser permissions headers.
Automated CI runs lint, TypeScript, frontend unit tests, production build,
Foundry formatting/build/tests, and a high-severity production dependency gate.

Important residual risks include unaudited code, external USDC behavior, Arc
Testnet instability, malicious or unavailable metadata, wallet compatibility,
and frontend/RPC integrity. See `docs/security-model.md`.
