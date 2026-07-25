// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IArcMulticall3From } from "../interfaces/IArcMulticall3From.sol";

/// @dev A local EVM cannot reproduce Arc CallFrom sender preservation.
/// This mock intentionally uses normal calls and exists only for failure-policy tests.
contract MockMulticall3From is IArcMulticall3From {
    error CallFailed(uint256 index, bytes reason);

    function aggregate3(Call3[] calldata calls) external returns (Result[] memory results) {
        results = new Result[](calls.length);
        for (uint256 i; i < calls.length; ++i) {
            (bool success, bytes memory returnData) = calls[i].target.call(calls[i].callData);
            if (!success && !calls[i].allowFailure) {
                revert CallFailed(i, returnData);
            }
            results[i] = Result({ success: success, returnData: returnData });
        }
    }
}

