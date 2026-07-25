export const factoryAbi = [
  {
    type: "function",
    name: "campaignCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "campaignAt",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getCampaignsByCreator",
    stateMutability: "view",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "createCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "title", type: "string" },
      { name: "metadataURI", type: "string" },
      { name: "fundingGoal", type: "uint256" },
      { name: "deadline", type: "uint64" },
      { name: "beneficiary", type: "address" },
    ],
    outputs: [{ name: "campaign", type: "address" }],
  },
  {
    type: "event",
    name: "CampaignCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "campaign", type: "address" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "beneficiary", type: "address" },
      { indexed: false, name: "fundingGoal", type: "uint256" },
      { indexed: false, name: "deadline", type: "uint64" },
      { indexed: false, name: "metadataURI", type: "string" },
    ],
  },
] as const;

export const campaignAbi = [
  ...[
    "factory",
    "creator",
    "beneficiary",
    "usdc",
  ].map((name) => ({
    type: "function" as const,
    name,
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "address" as const }],
  })),
  ...["fundingGoal", "totalRaised", "amountClaimed", "remainingTime", "fundingProgressBps"].map(
    (name) => ({
      type: "function" as const,
      name,
      stateMutability: "view" as const,
      inputs: [],
      outputs: [{ name: "", type: "uint256" as const }],
    }),
  ),
  ...["deadline", "createdAt"].map((name) => ({
    type: "function" as const,
    name,
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "uint64" as const }],
  })),
  ...["title", "metadataURI"].map((name) => ({
    type: "function" as const,
    name,
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "string" as const }],
  })),
  {
    type: "function",
    name: "status",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "contributionOf",
    stateMutability: "view",
    inputs: [{ name: "contributor", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "canClaimRefund",
    stateMutability: "view",
    inputs: [{ name: "contributor", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "canClaimFunds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "contribute",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  ...["cancelCampaign", "finalizeCampaign", "claimFunds", "claimRefund"].map(
    (name) => ({
      type: "function" as const,
      name,
      stateMutability: "nonpayable" as const,
      inputs: [],
      outputs: [],
    }),
  ),
  {
    type: "event",
    name: "ContributionReceived",
    anonymous: false,
    inputs: [
      { indexed: true, name: "contributor", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "contributorTotal", type: "uint256" },
      { indexed: false, name: "totalRaised", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "CampaignCancelled",
    anonymous: false,
    inputs: [{ indexed: true, name: "creator", type: "address" }],
  },
  {
    type: "event",
    name: "CampaignFinalized",
    anonymous: false,
    inputs: [
      { indexed: true, name: "status", type: "uint8" },
      { indexed: false, name: "totalRaised", type: "uint256" },
      { indexed: false, name: "fundingGoal", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "FundsClaimed",
    anonymous: false,
    inputs: [
      { indexed: true, name: "beneficiary", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "RefundClaimed",
    anonymous: false,
    inputs: [
      { indexed: true, name: "contributor", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
] as const;

export const usdcAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "Transfer",
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
] as const;

export const memoAbi = [
  {
    type: "function",
    name: "memo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
      { name: "memoId", type: "bytes32" },
      { name: "memoData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "Memo",
    anonymous: false,
    inputs: [
      { indexed: true, name: "sender", type: "address" },
      { indexed: true, name: "target", type: "address" },
      { indexed: false, name: "callDataHash", type: "bytes32" },
      { indexed: true, name: "memoId", type: "bytes32" },
      { indexed: false, name: "memo", type: "bytes" },
      { indexed: false, name: "memoIndex", type: "uint256" },
    ],
  },
] as const;

export const multicall3FromAbi = [
  {
    type: "function",
    name: "aggregate3",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "tuple[]",
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
      },
    ],
  },
] as const;

