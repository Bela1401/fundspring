// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Test } from "forge-std/Test.sol";
import { CampaignFactory } from "../contracts/CampaignFactory.sol";
import { FundingCampaign } from "../contracts/FundingCampaign.sol";
import { MockUSDC } from "../contracts/mocks/MockUSDC.sol";

contract CampaignFactoryTest is Test {
    MockUSDC internal usdc;
    CampaignFactory internal factory;
    address internal creator = makeAddr("creator");
    address internal beneficiary = makeAddr("beneficiary");

    function setUp() public {
        usdc = new MockUSDC();
        factory = new CampaignFactory(address(usdc));
    }

    function testCreateCampaignInitializesAndIndexesCampaign() public {
        uint64 deadline = uint64(block.timestamp + 7 days);

        vm.expectEmit(false, true, true, true);
        emit CampaignFactory.CampaignCreated(
            address(0),
            creator,
            beneficiary,
            10_000e6,
            deadline,
            "https://example.com/campaign.json"
        );

        vm.prank(creator);
        address campaignAddress = factory.createCampaign(
            "Community solar", "https://example.com/campaign.json", 10_000e6, deadline, beneficiary
        );

        FundingCampaign campaign = FundingCampaign(campaignAddress);
        assertEq(factory.campaignCount(), 1);
        assertEq(factory.campaignAt(0), campaignAddress);
        assertTrue(factory.isCampaign(campaignAddress));
        assertEq(factory.getCampaignsByCreator(creator)[0], campaignAddress);
        assertEq(campaign.factory(), address(factory));
        assertEq(campaign.creator(), creator);
        assertEq(campaign.beneficiary(), beneficiary);
        assertEq(address(campaign.usdc()), address(usdc));
        assertEq(campaign.fundingGoal(), 10_000e6);
        assertEq(campaign.deadline(), deadline);
        assertEq(campaign.title(), "Community solar");
    }

    function testPagination() public {
        for (uint256 i; i < 3; ++i) {
            vm.prank(creator);
            factory.createCampaign(
                string.concat("Campaign ", vm.toString(i)),
                "https://example.com/metadata.json",
                (i + 1) * 1_000e6,
                uint64(block.timestamp + 2 days),
                beneficiary
            );
        }

        address[] memory page = factory.getCampaigns(1, 2);
        assertEq(page.length, 2);
        assertEq(page[0], factory.campaignAt(1));
        assertEq(page[1], factory.campaignAt(2));
    }

    function testRejectsZeroUSDC() public {
        vm.expectRevert(CampaignFactory.ZeroAddress.selector);
        new CampaignFactory(address(0));
    }

    function testRejectsInvalidCreationParameters() public {
        uint64 deadline = uint64(block.timestamp + 2 days);

        vm.startPrank(creator);
        vm.expectRevert(CampaignFactory.EmptyTitle.selector);
        factory.createCampaign("", "https://example.com/metadata.json", 1e6, deadline, beneficiary);

        vm.expectRevert(CampaignFactory.EmptyMetadataURI.selector);
        factory.createCampaign("Title", "", 1e6, deadline, beneficiary);

        vm.expectRevert(CampaignFactory.InvalidFundingGoal.selector);
        factory.createCampaign(
            "Title", "https://example.com/metadata.json", 0, deadline, beneficiary
        );

        vm.expectRevert(CampaignFactory.ZeroAddress.selector);
        factory.createCampaign(
            "Title", "https://example.com/metadata.json", 1e6, deadline, address(0)
        );

        vm.expectRevert(CampaignFactory.DeadlineTooSoon.selector);
        factory.createCampaign(
            "Title",
            "https://example.com/metadata.json",
            1e6,
            uint64(block.timestamp + 30 minutes),
            beneficiary
        );
        vm.stopPrank();
    }

    function testRejectsInvalidPagination() public {
        vm.expectRevert(CampaignFactory.InvalidPagination.selector);
        factory.getCampaigns(0, 0);

        vm.expectRevert(CampaignFactory.InvalidPagination.selector);
        factory.getCampaigns(1, 10);
    }
}

