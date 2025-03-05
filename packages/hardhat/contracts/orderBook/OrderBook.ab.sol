// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

contract CrossChainOrderBook is OApp, ReentrancyGuard {
    struct Order {
        address maker;      // 주문 생성자
        uint256 srcAmount;  // 보내려는 네이티브 토큰 수량
        uint256 dstAmount;  // 받으려는 네이티브 토큰 수량
        uint32 srcEid;      // 보내려는 체인 ID
        uint32 dstEid;      // 받으려는 체인 ID
        address taker;      // 주문 체결자
        bool isFilled;      // 주문 체결 여부
        bool isRefunded;    // 주문 환불 여부
    }

    // mapping(orderId => Order)
    mapping(uint256 => Order) public orders;
    // mapping(eid => mapping(orderId) => bool)
    mapping(uint32 => mapping(uint256 => bool)) public dstOrders;  // dst 체인의 주문 존재 여부
    uint256 public orderIdCounter;

    event OrderCreated(uint256 indexed orderId, address indexed maker, uint256 srcAmount, uint256 dstAmount, uint32 srcEid, uint32 dstEid);
    event OrderAccepted(uint256 indexed orderId, address indexed taker);
    event OrderCompleted(uint256 indexed orderId, address indexed recipient);
    event OrderRefunded(uint256 indexed orderId, address indexed recipient);

    constructor(address _lzEndpoint, address _owner) OApp(_lzEndpoint, _owner) Ownable(_owner) {}

    /**
     * @notice src 체인에서 주문 생성
     * @param _dstEid 받으려는 체인 ID
     * @param _dstAmount 받으려는 토큰 수량
     */
    function createOrder(uint32 _dstEid, uint256 _dstAmount) external payable nonReentrant {
        require(msg.value > 0, "Must send native token");

        uint256 orderId = orderIdCounter++;
        orders[orderId] = Order({
            maker: msg.sender,
            srcAmount: msg.value,
            dstAmount: _dstAmount,
            srcEid: uint32(block.chainid),
            dstEid: _dstEid,
            taker: address(0),
            isFilled: false,
            isRefunded: false
        });

        emit OrderCreated(orderId, msg.sender, msg.value, _dstAmount, uint32(block.chainid), _dstEid);
    }

    /**
     * @notice dst 체인에서 주문 체결 (src 오더북 업데이트 요청)
     * @param _orderId 체결할 주문의 ID
     */
    function acceptOrder(uint32 _dstEid, uint256 _dstOrderId) external payable nonReentrant {
        require(!dstOrders[_dstEid][_dstOrderId], "Order already exists on dst chain");
        dstOrders[_dstEid][_dstOrderId] = true;

        bytes memory payload = abi.encode(_dstOrderId, msg.sender, _dstEid);
        MessagingFee memory fee = MessagingFee(msg.value, 0);

        _lzSend(_dstEid, payload, "", fee, payable(msg.sender));

        emit OrderAccepted(_dstOrderId, msg.sender);
    }

    /**
     * @notice LayerZero 메시지 수신 (src 체인에서 실행)
     */
    function _lzReceive(Origin calldata _origin, bytes32 /*_guid*/, bytes calldata _payload, address /*_executor*/, bytes calldata /*_extraData*/) internal override {
        (uint256 orderId, address taker, uint32 srcEid) = abi.decode(_payload, (uint256, address, uint32));

        Order storage order = orders[orderId];
        require(order.maker != address(0), "Order does not exist");
        require(!order.isFilled, "Order already filled");

        order.isFilled = true;
        order.taker = taker;

        emit OrderCompleted(orderId, taker);
    }

    /**
     * @notice 체결된 주문을 가져가기 (src 체인: taker / dst 체인: maker)
     * @param _orderId 주문 ID
     */
    function claimAssets(uint256 _orderId) external nonReentrant {
        Order storage order = orders[_orderId];
        require(order.isFilled, "Order not completed");

        if (order.srcEid == uint32(block.chainid)) {
            require(order.taker == msg.sender, "Not the taker");
            payable(order.taker).transfer(order.srcAmount);
        } else {
            require(order.maker == msg.sender, "Not the maker");
            payable(order.maker).transfer(order.dstAmount);
        }

        emit OrderCompleted(_orderId, msg.sender);
    }

    /**
     * @notice 주문 환불 (만료되었거나 취소된 경우)
     * @param _orderId 주문 ID
     */
    function refund(uint256 _orderId) external nonReentrant {
        Order storage order = orders[_orderId];
        require(!order.isFilled, "Order already filled");
        require(!order.isRefunded, "Already refunded");

        order.isRefunded = true;

        if (order.srcEid == uint32(block.chainid)) {
            require(order.maker == msg.sender, "Not order creator");
            payable(order.maker).transfer(order.srcAmount);
        } else {
            require(order.taker == msg.sender, "Not order taker");
            payable(order.taker).transfer(order.dstAmount);
        }

        emit OrderRefunded(_orderId, msg.sender);
    }


    function quote(
        uint32 _dstEid,
        bytes memory _payload,
        bytes memory _options,
        bool _payInLzToken
    ) public view returns (MessagingFee memory fee) {
        fee = _quote(_dstEid, _payload, _options, _payInLzToken);
    }

    function _payNative(uint256 _nativeFee) internal override returns (uint256 nativeFee) {
        require(msg.value >= _nativeFee, "Not enough native tokens");
        return _nativeFee;
    }
}
