// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { FundingCampaign } from "./FundingCampaign.sol";

/// @title CampaignFactory
/// @notice Deploys and indexes FundSpring campaign contracts.
contract CampaignFactory {
    error ZeroAddress();
    error EmptyTitle();
    error EmptyMetadataURI();
    error InvalidFundingGoal();
    error DeadlineTooSoon();
    error InvalidPagination();

    event CampaignCreated(
        address indexed campaign,
        address indexed creator,
        address indexed beneficiary,
        uint256 fundingGoal,
        uint64 deadline,
        string metadataURI
    );

    uint64 public constant MINIMUM_LEAD_TIME = 1 hours;
    address public immutable usdc;

    address[] private campaigns;
    mapping(address creator => address[] campaigns) private creatorCampaigns;
    mapping(address candidate => bool registered) public isCampaign;

    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc = usdc_;
    }

    function createCampaign(
        string calldata title,
        string calldata metadataURI,
        uint256 fundingGoal,
        uint64 deadline,
        address beneficiary
    ) external returns (address campaign) {
        if (bytes(title).length == 0) revert EmptyTitle();
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();
        if (fundingGoal == 0) revert InvalidFundingGoal();
        if (beneficiary == address(0)) revert ZeroAddress();
        if (deadline < block.timestamp + MINIMUM_LEAD_TIME) {
            revert DeadlineTooSoon();
        }

        campaign = address(
            new FundingCampaign(
                address(this),
                msg.sender,
                usdc,
                title,
                metadataURI,
                fundingGoal,
                deadline,
                beneficiary
            )
        );

        campaigns.push(campaign);
        creatorCampaigns[msg.sender].push(campaign);
        isCampaign[campaign] = true;

        emit CampaignCreated(campaign, msg.sender, beneficiary, fundingGoal, deadline, metadataURI);
    }

    function campaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    function campaignAt(uint256 index) external view returns (address) {
        return campaigns[index];
    }

    function getCampaigns(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory page)
    {
        if (limit == 0 || offset > campaigns.length) revert InvalidPagination();

        uint256 end = offset + limit;
        if (end > campaigns.length) end = campaigns.length;
        page = new address[](end - offset);

        for (uint256 i; i < page.length; ++i) {
            page[i] = campaigns[offset + i];
        }
    }

    function getCampaignsByCreator(address creator) external view returns (address[] memory) {
        return creatorCampaigns[creator];
    }
}

