# Data, discovery, and analytics

FundSpring keeps economic data verifiable. The frontend does not create
campaign totals, outcomes, contributors, or activity records in an application
database.

## Campaign discovery

The client captures a final Arc block, then reads `campaignCount()` and the
paginated `getCampaigns(offset, limit)` registry from `CampaignFactory` at that
block. It hydrates each registered `FundingCampaign` at the same block number
in bounded parallel batches. Search, lifecycle filters, and sorting are
deterministic client-side views over that coherent snapshot.

The discovery URL stores only these presentation controls:

- `q` for title, description, contract, creator, or beneficiary search;
- `status` for the derived lifecycle phase;
- `sort` for the selected stable ordering.

An onchain `Active` status is shown as `Awaiting finalization` when its onchain
deadline is at or before the captured Arc block timestamp. This is a derived UI
phase, not an additional contract status, and avoids presenting an expired,
not-yet-finalized campaign as open for funding.

## Protocol analytics

The analytics page aggregates the current state returned for every registered
campaign. It reports gross `totalRaised`, combined funding goals, lifecycle
distribution, distinct creator and beneficiary addresses, and the top five
campaigns by gross USDC raised. `Live` and `Awaiting finalization` are derived
by comparing each onchain deadline with the captured Arc block timestamp.

The finalized success rate intentionally uses only `Successful` and `Failed`
campaigns. Active, awaiting-finalization, and cancelled campaigns are excluded
from that denominator. FundSpring does not infer contributor counts or future
outcomes when the required event or state data is unavailable.

## Saved campaigns

The watchlist is a convenience feature stored in the current browser under a
versioned local-storage key. It is not written onchain, synchronized to a
FundSpring server, or treated as protocol data. Same-tab and cross-tab changes
are synchronized in the UI, and invalid or duplicate addresses are discarded.

## Activity and CSV evidence

The campaign activity feed queries Arcscan indexed logs and falls back to
chunked Arc RPC log reads. Arcscan ranges are recursively split whenever the
documented 1,000-log response cap is reached, so a busy campaign cannot be
silently treated as a complete result. A single-block cap triggers the RPC
fallback. A record is unique by emitter address, transaction hash, and log
index. Related `ContributionReceived`, USDC `Transfer`, and optional Arc `Memo`
events are correlated by transaction hash.

Users can filter the reconciled feed and export the visible records as CSV.
Each row includes:

- emitter address, block number, and log index;
- event type, title, and decoded detail;
- optional memo reference;
- transaction hash;
- Arc Testnet Explorer evidence URL.

CSV values are quoted and spreadsheet-formula prefixes are neutralized. The
export contains no fabricated timestamps or identities.

## Scaling path

The current browser-first approach is appropriate for the Arc Testnet MVP and
keeps verification simple. As registry and event volume grows, the same stable
event IDs can be materialized in an indexer. Official Arc documentation lists
Envio, Goldsky, The Graph, and Thirdweb as indexing options; Circle Contracts
event monitors can also push contract events to a webhook. Neither an external
indexer nor a Circle event monitor is currently operated by FundSpring, so the
application does not claim otherwise.

## Official references

- [Monitor contract events](https://docs.arc.io/arc/tutorials/monitor-contract-events)
- [Data indexers](https://docs.arc.io/arc/tools/data-indexers)
- [Deterministic finality](https://docs.arc.io/arc/concepts/deterministic-finality)
- [EVM differences](https://docs.arc.io/arc/references/evm-differences)
- [Blockscout logs API](https://docs.blockscout.com/devs/apis/rpc/logs)
