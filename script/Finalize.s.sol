// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Script } from "forge-std/Script.sol";
import { FundingCampaign } from "../contracts/FundingCampaign.sol";

contract Finalize is Script {
    function run() external {
        FundingCampaign campaign = FundingCampaign(vm.envAddress("FUNDING_CAMPAIGN_ADDRESS"));
        vm.startBroadcast();
        campaign.finalizeCampaign();
        vm.stopBroadcast();
    }
}

