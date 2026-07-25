// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FundingCampaign
/// @notice All-or-nothing USDC crowdfunding campaign with pull-based refunds.
contract FundingCampaign is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum CampaignStatus {
        Active,
        Successful,
        Failed,
        Cancelled
    }

    error ZeroAddress();
    error EmptyTitle();
    error EmptyMetadataURI();
    error InvalidFundingGoal();
    error InvalidDeadline();
    error NotCreator();
    error NotBeneficiary();
    error CampaignNotActive();
    error CampaignExpired();
    error CampaignNotEnded();
    error InvalidContribution();
    error AlreadyFinalized();
    error InvalidStatus();
    error FundsAlreadyClaimed();
    error NothingToRefund();
    error MetadataLocked();

    event ContributionReceived(
        address indexed contributor, uint256 amount, uint256 contributorTotal, uint256 totalRaised
    );
    event CampaignCancelled(address indexed creator);
    event CampaignFinalized(
        CampaignStatus indexed status, uint256 totalRaised, uint256 fundingGoal
    );
    event FundsClaimed(address indexed beneficiary, uint256 amount);
    event RefundClaimed(address indexed contributor, uint256 amount);
    event MetadataURIUpdated(string previousMetadataURI, string newMetadataURI);

    address public immutable factory;
    address public immutable creator;
    address public immutable beneficiary;
    IERC20 public immutable usdc;
    uint256 public immutable fundingGoal;
    uint64 public immutable deadline;
    uint64 public immutable createdAt;

    string public title;
    string public metadataURI;
    uint256 public totalRaised;
    uint256 public amountClaimed;
    CampaignStatus public status;

    mapping(address contributor => uint256 amount) private contributions;

    constructor(
        address factory_,
        address creator_,
        address usdc_,
        string memory title_,
        string memory metadataURI_,
        uint256 fundingGoal_,
        uint64 deadline_,
        address beneficiary_
    ) {
        if (
            factory_ == address(0) || creator_ == address(0) || usdc_ == address(0)
                || beneficiary_ == address(0)
        ) revert ZeroAddress();
        if (bytes(title_).length == 0) revert EmptyTitle();
        if (bytes(metadataURI_).length == 0) revert EmptyMetadataURI();
        if (fundingGoal_ == 0) revert InvalidFundingGoal();
        if (deadline_ <= block.timestamp) revert InvalidDeadline();

        factory = factory_;
        creator = creator_;
        usdc = IERC20(usdc_);
        title = title_;
        metadataURI = metadataURI_;
        fundingGoal = fundingGoal_;
        deadline = deadline_;
        beneficiary = beneficiary_;
        createdAt = uint64(block.timestamp);
    }

    function contribute(uint256 amount) external nonReentrant {
        if (status != CampaignStatus.Active) revert CampaignNotActive();
        if (block.timestamp >= deadline) revert CampaignExpired();
        if (amount == 0) revert InvalidContribution();

        contributions[msg.sender] += amount;
        totalRaised += amount;

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit ContributionReceived(msg.sender, amount, contributions[msg.sender], totalRaised);
    }

    function cancelCampaign() external {
        if (msg.sender != creator) revert NotCreator();
        if (status != CampaignStatus.Active) revert AlreadyFinalized();

        status = CampaignStatus.Cancelled;
        emit CampaignCancelled(msg.sender);
    }

    function finalizeCampaign() external {
        if (status != CampaignStatus.Active) revert AlreadyFinalized();
        if (block.timestamp < deadline) revert CampaignNotEnded();

        status = totalRaised >= fundingGoal ? CampaignStatus.Successful : CampaignStatus.Failed;

        emit CampaignFinalized(status, totalRaised, fundingGoal);
    }

    function claimFunds() external nonReentrant {
        if (msg.sender != beneficiary) revert NotBeneficiary();
        if (status != CampaignStatus.Successful) revert InvalidStatus();
        if (amountClaimed != 0) revert FundsAlreadyClaimed();

        uint256 amount = totalRaised;
        amountClaimed = amount;
        usdc.safeTransfer(beneficiary, amount);

        emit FundsClaimed(beneficiary, amount);
    }

    function claimRefund() external nonReentrant {
        if (status != CampaignStatus.Failed && status != CampaignStatus.Cancelled) {
            revert InvalidStatus();
        }

        uint256 amount = contributions[msg.sender];
        if (amount == 0) revert NothingToRefund();

        contributions[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);

        emit RefundClaimed(msg.sender, amount);
    }

    function updateMetadataURI(string calldata newMetadataURI) external {
        if (msg.sender != creator) revert NotCreator();
        if (totalRaised != 0 || status != CampaignStatus.Active) {
            revert MetadataLocked();
        }
        if (bytes(newMetadataURI).length == 0) revert EmptyMetadataURI();

        string memory previous = metadataURI;
        metadataURI = newMetadataURI;
        emit MetadataURIUpdated(previous, newMetadataURI);
    }

    function contributionOf(address contributor) external view returns (uint256) {
        return contributions[contributor];
    }

    function remainingTime() external view returns (uint256) {
        return block.timestamp >= deadline ? 0 : deadline - block.timestamp;
    }

    function fundingProgressBps() external view returns (uint256) {
        if (totalRaised >= fundingGoal) return 10_000;
        return (totalRaised * 10_000) / fundingGoal;
    }

    function canClaimRefund(address contributor) external view returns (bool) {
        return (status == CampaignStatus.Failed || status == CampaignStatus.Cancelled)
            && contributions[contributor] != 0;
    }

    function canClaimFunds() external view returns (bool) {
        return status == CampaignStatus.Successful && amountClaimed == 0;
    }
}

