// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IArcMemo {
    event BeforeMemo(uint256 indexed memoIndex);
    event Memo(
        address indexed sender,
        address indexed target,
        bytes32 callDataHash,
        bytes32 indexed memoId,
        bytes memo,
        uint256 memoIndex
    );

    function memo(address target, bytes calldata data, bytes32 memoId, bytes calldata memoData)
        external;
}

