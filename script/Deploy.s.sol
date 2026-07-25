// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Script, console2 } from "forge-std/Script.sol";
import { CampaignFactory } from "../contracts/CampaignFactory.sol";

contract Deploy is Script {
    uint256 internal constant ARC_TESTNET_CHAIN_ID = 5_042_002;
    address internal constant OFFICIAL_ARC_TESTNET_USDC =
        0x3600000000000000000000000000000000000000;

    function run() external returns (CampaignFactory factory) {
        require(block.chainid == ARC_TESTNET_CHAIN_ID, "Arc Testnet only");
        address configuredUsdc = vm.envOr("ARC_USDC_ADDRESS", OFFICIAL_ARC_TESTNET_USDC);
        require(configuredUsdc == OFFICIAL_ARC_TESTNET_USDC, "Unexpected USDC address");

        vm.startBroadcast();
        factory = new CampaignFactory(configuredUsdc);
        vm.stopBroadcast();

        console2.log("Network: Arc Testnet");
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", msg.sender);
        console2.log("Official USDC:", configuredUsdc);
        console2.log("CampaignFactory:", address(factory));
        console2.log("Use broadcast/ artifacts for the deployment transaction hash.");
    }
}

