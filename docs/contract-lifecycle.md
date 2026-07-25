# Contract lifecycle

```mermaid
stateDiagram-v2
  [*] --> Active: Factory deploys campaign
  Active --> Cancelled: Creator cancels
  Active --> Successful: Deadline + goal reached
  Active --> Failed: Deadline + goal missed
  Successful --> Successful: Beneficiary claims once
  Failed --> Failed: Contributors claim individually
  Cancelled --> Cancelled: Contributors claim individually
```

## Active

Contributions are accepted only before `deadline`. Overfunding is allowed. The
creator may update metadata only before the first contribution and may cancel
before finalization.

## Successful

After the deadline, anyone finalizes. If `totalRaised >= fundingGoal`, only the
beneficiary may claim the full amount, once.

## Failed

If the goal was missed, each contributor independently calls `claimRefund()`.

## Cancelled

Cancellation never pushes funds. It only enables each contributor's pull
refund.

