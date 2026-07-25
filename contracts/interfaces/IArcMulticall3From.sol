// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IArcMulticall3From {
    struct Call3 {
        address target;
        bool allowFailure;
        bytes callData;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    function aggregate3(Call3[] calldata calls) external returns (Result[] memory returnData);
}

