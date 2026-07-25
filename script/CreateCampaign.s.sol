// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Script, console2 } from "forge-std/Script.sol";
import { CampaignFactory } from "../contracts/CampaignFactory.sol";

contract CreateCampaign is Script {
    function run() external returns (address campaign) {
        CampaignFactory factory = CampaignFactory(vm.envAddress("CAMPAIGN_FACTORY_ADDRESS"));
        string memory title = vm.envString("CAMPAIGN_TITLE");
        string memory metadataURI = vm.envString("CAMPAIGN_METADATA_URI");
        uint256 goal = vm.envUint("CAMPAIGN_GOAL_BASE_UNITS");
        uint64 deadline = uint64(vm.envUint("CAMPAIGN_DEADLINE"));
        address beneficiary = vm.envAddress("CAMPAIGN_BENEFICIARY");

        vm.startBroadcast();
        campaign = factory.createCampaign(title, metadataURI, goal, deadline, beneficiary);
        vm.stopBroadcast();
        console2.log("FundingCampaign:", campaign);
    }
}

