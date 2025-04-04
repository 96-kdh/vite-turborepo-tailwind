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
        OrderStatus status;
    }


    event CreateSrcOrder(uint256 indexed orderId, address indexed maker, uint256 depositAmount, uint256 desiredAmount, uint32 dstEid);
    event UpdateSrcOrder(uint256 indexed orderId, address indexed maker, address indexed taker, uint256 depositAmount, uint256 desiredAmount, OrderStatus orderStatus, uint32 dstEid);

    event CreateDstOrder(uint256 indexed srcOrderId, address indexed maker, uint256 depositAmount, uint256 desiredAmount, uint32 dstEid);
    event UpdateDstOrder(uint256 indexed srcOrderId, address indexed maker, address indexed taker, uint256 depositAmount, uint256 desiredAmount, OrderStatus orderStatus, uint32 dstEid);
}
