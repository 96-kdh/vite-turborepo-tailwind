// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

interface IOrderBook {
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

    function getOrder(uint256 _orderId) external view returns (Order memory);
    function getOrder(uint256 _orderId, uint32 _dstEid) external view returns (Order memory);
    function createOrder(uint32 _dstEid, uint256 _depositAmount, uint256 _desiredAmount, bytes calldata _options) external payable;
    function cancelOrder(uint256 _orderId, uint32 _dstEid, bytes calldata _options) external payable;
    function executeOrder(uint256 _orderId, uint32 _dstEid, uint256 _paymentAmount, uint256 _desiredAmount, bytes calldata _options) external payable;
    function claim(uint256 _orderId, uint32 _dstEid, bytes calldata _options) external payable;
    function quote(uint32 _dstEid, bytes memory _payload, bytes memory _options, bool _payInLzToken) external view returns (MessagingFee memory fee);

    event CreateSrcOrder(uint256 indexed orderId, address indexed maker, uint256 depositAmount, uint256 desiredAmount, uint32 dstEid);
    event UpdateSrcOrder(uint256 indexed orderId, address indexed maker, address indexed taker, uint256 depositAmount, uint256 desiredAmount, OrderStatus orderStatus, uint32 dstEid);

    event CreateDstOrder(uint256 indexed srcOrderId, address indexed maker, uint256 depositAmount, uint256 desiredAmount, uint32 dstEid);
    event UpdateDstOrder(uint256 indexed srcOrderId, address indexed maker, address indexed taker, uint256 depositAmount, uint256 desiredAmount, OrderStatus orderStatus, uint32 dstEid);
}
