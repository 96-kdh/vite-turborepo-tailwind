// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract IOrderBook {
    enum OrderStatus {
        no,
        createOrder,
        createOrderLzReceive,
        executeOrder,
        executeOrderLzReceive,
        claim,
        claimLzReceive,
        canceled,
        canceledLzReceive
    }

    struct Order {
        address payable maker;      // The party that locked funds.
        address payable taker;      // Set when the taker executes the swap.
        uint256 depositAmount;       // Amount of native tokens locked by the maker.
        uint256 desiredAmount;      // The amount the maker expects from the taker.
        uint256 timelock;           // Expiration timestamp (Unix epoch).
        OrderStatus status;
    }

    event OrderCreated(
        bytes32 indexed orderId,
        address indexed maker,
        uint256 makerDeposit,
        uint256 desiredAmount,
        uint256 timelock
    );
    event OrderCanceled(bytes32 indexed orderId);
    event OrderExecuted(
        bytes32 indexed orderId,
        address indexed taker
    );
}
