// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { CampaignFactory } from "../contracts/CampaignFactory.sol";
import { FundingCampaign } from "../contracts/FundingCampaign.sol";
import { MockUSDC } from "../contracts/mocks/MockUSDC.sol";

contract FundingCampaignTest is Test {
    MockUSDC internal usdc;
    CampaignFactory internal factory;
    FundingCampaign internal campaign;

    address internal creator = makeAddr("creator");
    address internal beneficiary = makeAddr("beneficiary");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    uint64 internal deadline;

    function setUp() public {
        usdc = new MockUSDC();
        factory = new CampaignFactory(address(usdc));
        deadline = uint64(block.timestamp + 7 days);

        vm.prank(creator);
        campaign = FundingCampaign(
            factory.createCampaign(
                "Community solar",
                "https://example.com/campaign.json",
                10_000e6,
                deadline,
                beneficiary
            )
        );

        usdc.mint(alice, 20_000e6);
        usdc.mint(bob, 20_000e6);
        vm.prank(alice);
        usdc.approve(address(campaign), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(campaign), type(uint256).max);
    }

    function testContributionUpdatesAccountingAndEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit FundingCampaign.ContributionReceived(alice, 1_500e6, 1_500e6, 1_500e6);

        vm.prank(alice);
        campaign.contribute(1_500e6);

        assertEq(campaign.contributionOf(alice), 1_500e6);
        assertEq(campaign.totalRaised(), 1_500e6);
        assertEq(usdc.balanceOf(address(campaign)), 1_500e6);
        assertEq(campaign.fundingProgressBps(), 1_500);
    }

    function testMultipleContributionsAndContributors() public {
        vm.prank(alice);
        campaign.contribute(1_000e6);
        vm.prank(alice);
        campaign.contribute(2_000e6);
        vm.prank(bob);
        campaign.contribute(4_000e6);

        assertEq(campaign.contributionOf(alice), 3_000e6);
        assertEq(campaign.contributionOf(bob), 4_000e6);
        assertEq(campaign.totalRaised(), 7_000e6);
    }

    function testAllowsOverfundingAndCapsDisplayedProgress() public {
        vm.prank(alice);
        campaign.contribute(12_000e6);

        assertEq(campaign.totalRaised(), 12_000e6);
        assertEq(campaign.fundingProgressBps(), 10_000);
    }

    function testRejectsZeroContribution() public {
        vm.prank(alice);
        vm.expectRevert(FundingCampaign.InvalidContribution.selector);
        campaign.contribute(0);
    }

    function testRejectsInsufficientAllowance() public {
        vm.prank(alice);
        usdc.approve(address(campaign), 0);

        vm.prank(alice);
        vm.expectRevert();
        campaign.contribute(1e6);
    }

    function testRejectsInsufficientBalance() public {
        address emptyWallet = makeAddr("emptyWallet");
        vm.prank(emptyWallet);
        usdc.approve(address(campaign), type(uint256).max);

        vm.prank(emptyWallet);
        vm.expectRevert();
        campaign.contribute(1e6);
    }

    function testRejectsContributionAtDeadline() public {
        vm.warp(deadline);
        vm.prank(alice);
        vm.expectRevert(FundingCampaign.CampaignExpired.selector);
        campaign.contribute(1e6);
    }

    function testCreatorCanCancelAndNoFundsArePushed() public {
        vm.prank(alice);
        campaign.contribute(1_000e6);
        uint256 balanceBefore = usdc.balanceOf(alice);

        vm.expectEmit(true, false, false, true);
        emit FundingCampaign.CampaignCancelled(creator);
        vm.prank(creator);
        campaign.cancelCampaign();

        assertEq(uint256(campaign.status()), uint256(FundingCampaign.CampaignStatus.Cancelled));
        assertEq(usdc.balanceOf(alice), balanceBefore);
        assertTrue(campaign.canClaimRefund(alice));
    }

    function testNonCreatorCannotCancel() public {
        vm.prank(alice);
        vm.expectRevert(FundingCampaign.NotCreator.selector);
        campaign.cancelCampaign();
    }

    function testRejectsContributionAfterCancellation() public {
        vm.prank(creator);
        campaign.cancelCampaign();

        vm.prank(alice);
        vm.expectRevert(FundingCampaign.CampaignNotActive.selector);
        campaign.contribute(1e6);
    }

    function testSuccessfulFinalizationIsPublicAndOneTime() public {
        vm.prank(alice);
        campaign.contribute(10_000e6);
        vm.warp(deadline);

        vm.expectEmit(true, false, false, true);
        emit FundingCampaign.CampaignFinalized(
            FundingCampaign.CampaignStatus.Successful, 10_000e6, 10_000e6
        );
        vm.prank(bob);
        campaign.finalizeCampaign();

        assertEq(uint256(campaign.status()), uint256(FundingCampaign.CampaignStatus.Successful));
        vm.expectRevert(FundingCampaign.AlreadyFinalized.selector);
        campaign.finalizeCampaign();
    }

    function testFinalizationSetsFailedStatusBelowGoal() public {
        vm.prank(alice);
        campaign.contribute(9_999e6);
        vm.warp(deadline);
        campaign.finalizeCampaign();

        assertEq(uint256(campaign.status()), uint256(FundingCampaign.CampaignStatus.Failed));
    }

    function testRejectsEarlyFinalization() public {
        vm.expectRevert(FundingCampaign.CampaignNotEnded.selector);
        campaign.finalizeCampaign();
    }

    function testBeneficiaryClaimsExactFundsOnce() public {
        vm.prank(alice);
        campaign.contribute(10_500e6);
        vm.warp(deadline);
        campaign.finalizeCampaign();

        vm.expectEmit(true, false, false, true);
        emit FundingCampaign.FundsClaimed(beneficiary, 10_500e6);
        vm.prank(beneficiary);
        campaign.claimFunds();

        assertEq(usdc.balanceOf(beneficiary), 10_500e6);
        assertEq(campaign.amountClaimed(), 10_500e6);
        assertEq(usdc.balanceOf(address(campaign)), 0);

        vm.prank(beneficiary);
        vm.expectRevert(FundingCampaign.FundsAlreadyClaimed.selector);
        campaign.claimFunds();
    }

    function testRejectsUnauthorizedOrPrematureClaims() public {
        vm.prank(alice);
        vm.expectRevert(FundingCampaign.NotBeneficiary.selector);
        campaign.claimFunds();

        vm.prank(beneficiary);
        vm.expectRevert(FundingCampaign.InvalidStatus.selector);
        campaign.claimFunds();
    }

    function testRejectsClaimFromFailedCampaign() public {
        vm.warp(deadline);
        campaign.finalizeCampaign();
        vm.prank(beneficiary);
        vm.expectRevert(FundingCampaign.InvalidStatus.selector);
        campaign.claimFunds();
    }

    function testIndependentRefundsAfterFailure() public {
        vm.prank(alice);
        campaign.contribute(1_000e6);
        vm.prank(bob);
        campaign.contribute(2_000e6);
        vm.warp(deadline);
        campaign.finalizeCampaign();

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.expectEmit(true, false, false, true);
        emit FundingCampaign.RefundClaimed(alice, 1_000e6);
        vm.prank(alice);
        campaign.claimRefund();

        assertEq(usdc.balanceOf(alice), aliceBefore + 1_000e6);
        assertEq(campaign.contributionOf(alice), 0);
        assertEq(campaign.contributionOf(bob), 2_000e6);
        assertEq(usdc.balanceOf(address(campaign)), 2_000e6);

        vm.prank(bob);
        campaign.claimRefund();
        assertEq(usdc.balanceOf(address(campaign)), 0);
    }

    function testRefundAfterCancellationAndDoubleRefundProtection() public {
        vm.prank(alice);
        campaign.contribute(500e6);
        vm.prank(creator);
        campaign.cancelCampaign();
        vm.prank(alice);
        campaign.claimRefund();

        vm.prank(alice);
        vm.expectRevert(FundingCampaign.NothingToRefund.selector);
        campaign.claimRefund();
    }

    function testRejectsRefundWhileActiveOrSuccessful() public {
        vm.prank(alice);
        campaign.contribute(10_000e6);

        vm.prank(alice);
        vm.expectRevert(FundingCampaign.InvalidStatus.selector);
        campaign.claimRefund();

        vm.warp(deadline);
        campaign.finalizeCampaign();
        vm.prank(alice);
        vm.expectRevert(FundingCampaign.InvalidStatus.selector);
        campaign.claimRefund();
    }

    function testMetadataCanOnlyChangeBeforeFirstContribution() public {
        vm.prank(creator);
        campaign.updateMetadataURI("https://example.com/updated.json");
        assertEq(campaign.metadataURI(), "https://example.com/updated.json");

        vm.prank(alice);
        campaign.contribute(1e6);
        vm.prank(creator);
        vm.expectRevert(FundingCampaign.MetadataLocked.selector);
        campaign.updateMetadataURI("https://example.com/locked.json");
    }

    function testRemainingTimeBoundary() public {
        assertEq(campaign.remainingTime(), 7 days);
        vm.warp(deadline);
        assertEq(campaign.remainingTime(), 0);
    }
}
