// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Test } from "forge-std/Test.sol";
import { CampaignFactory } from "../contracts/CampaignFactory.sol";
import { FundingCampaign } from "../contracts/FundingCampaign.sol";
import { MockUSDC } from "../contracts/mocks/MockUSDC.sol";

contract FundingCampaignFuzzTest is Test {
    MockUSDC internal usdc;
    FundingCampaign internal campaign;
    address internal creator = makeAddr("creator");
    address internal beneficiary = makeAddr("beneficiary");
    address internal contributor = makeAddr("contributor");
    uint64 internal deadline;

    function setUp() public {
        usdc = new MockUSDC();
        CampaignFactory factory = new CampaignFactory(address(usdc));
        deadline = uint64(block.timestamp + 30 days);
        vm.prank(creator);
        campaign = FundingCampaign(
            factory.createCampaign(
                "Fuzz campaign", "https://example.com/fuzz.json", 1_000_000e6, deadline, beneficiary
            )
        );
        vm.prank(contributor);
        usdc.approve(address(campaign), type(uint256).max);
    }

    function testFuzzContributionAccounting(uint96 rawAmount) public {
        uint256 amount = bound(uint256(rawAmount), 1, 1_000_000_000e6);
        usdc.mint(contributor, amount);

        vm.prank(contributor);
        campaign.contribute(amount);

        assertEq(campaign.totalRaised(), amount);
        assertEq(campaign.contributionOf(contributor), amount);
        assertEq(usdc.balanceOf(address(campaign)), amount);
    }

    function testFuzzRefundPreservesSolvency(uint96 rawAmount) public {
        uint256 amount = bound(uint256(rawAmount), 1, 999_999e6);
        usdc.mint(contributor, amount);
        vm.prank(contributor);
        campaign.contribute(amount);

        vm.warp(deadline);
        campaign.finalizeCampaign();
        vm.prank(contributor);
        campaign.claimRefund();

        assertEq(campaign.contributionOf(contributor), 0);
        assertEq(usdc.balanceOf(address(campaign)), 0);
        assertEq(usdc.balanceOf(contributor), amount);
    }

    function testProgressRoundingNeverExceedsTenThousand(uint96 rawAmount) public {
        uint256 amount = bound(uint256(rawAmount), 1, 2_000_000e6);
        usdc.mint(contributor, amount);
        vm.prank(contributor);
        campaign.contribute(amount);

        assertLe(campaign.fundingProgressBps(), 10_000);
    }
}
