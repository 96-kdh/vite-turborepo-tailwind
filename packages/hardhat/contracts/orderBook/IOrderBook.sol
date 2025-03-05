// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract IOrderBook {
    struct Order {
        address maker;  // 주문 생성자
        uint32 srcEid; // 보내려는 토큰이 있는 체인 ID
        uint256 srcAmount;  // 보내려는 네이티브 토큰 수량
        uint32 dstEid;  // 받으려는 토큰이 있는 체인 ID
        uint256 dstAmount;  // 받으려는 네이티브 토큰 수량
        address taker;  // 주문 체결자
        bool isFilled;  // 주문 체결 여부
    }

    event CreateOrder(uint256 indexed orderId, address indexed maker, uint32 srcEid, uint256 srcAmount, uint32 dstEid, uint256 dstAmount);
    event OpenOrder(uint256 indexed orderId, address indexed maker, uint32 srcEid, uint256 srcAmount, uint32 dstEid, uint256 dstAmount);
    event CloseOrder(uint256 indexed orderId, address indexed maker, uint256 sendAmount, uint32 sendChainId, uint256 receiveAmount, uint32 receiveChainId, address indexed taker);
}
