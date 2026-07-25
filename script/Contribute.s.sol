// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Script } from "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { FundingCampaign } from "../contracts/FundingCampaign.sol";

contract Contribute is Script {
    function run() external {
        FundingCampaign campaign = FundingCampaign(vm.envAddress("FUNDING_CAMPAIGN_ADDRESS"));
        uint256 amount = vm.envUint("CONTRIBUTION_BASE_UNITS");

        vm.startBroadcast();
        IERC20(address(campaign.usdc())).approve(address(campaign), amount);
        campaign.contribute(amount);
        vm.stopBroadcast();
    }
}

