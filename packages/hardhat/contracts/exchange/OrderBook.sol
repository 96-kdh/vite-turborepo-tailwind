// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

import "hardhat/console.sol";

contract IOrderBook {
    struct Order {
        address maker;  // 주문 생성자
        uint256 srcAmount;  // 보내려는 네이티브 토큰 수량
//        uint32 sendChainId;  // 보내려는 토큰이 있는 체인 ID
        uint256 dstAmount;  // 받으려는 네이티브 토큰 수량
        uint32 dstChainId;  // 받으려는 토큰이 있는 체인 ID
        address taker;  // 주문 체결자
        bool isFilled;  // 주문 체결 여부
    }

    event UpdateOrder(uint256 indexed orderId, address indexed maker, uint256 sendAmount, uint32 sendChainId, uint256 receiveAmount, uint32 receiveChainId, address indexed taker);
}

contract OrderBook is IOrderBook, OApp, ReentrancyGuard {
    // mapping(chainId => mapping (orderId => order))
    mapping(uint32 => mapping(uint256 => Order)) public orders;
    uint256 public orderId;  // Order ID 카운터

    constructor(address _layerZeroEndpoint, address _delegate)
        OApp(_layerZeroEndpoint, _delegate) Ownable(_delegate) {}

    function createOrder(uint256 _sendAmount, uint32 _receiveChainId, uint256 _receiveAmount, bytes calldata _options) external payable nonReentrant {
        require(msg.value > 0, "Must send native token");
        require(_receiveAmount > 0, "Receive amount must be greater than zero");

        uint256 orderId = orderId;

        bytes memory payload = abi.encodePacked(
            bytes4(keccak256("CreateOrder")),
            abi.encode(orderId, msg.sender, _sendAmount, uint32(block.chainid), _receiveAmount, _receiveChainId)
        );
        MessagingFee memory fee = _quote(_receiveChainId, payload, _options, false);

        // ✅ `fee.nativeFee` 만큼 수수료로 사용하고, 나머지는 컨트랙트에 Lock
        uint256 lockedAmount = msg.value - fee.nativeFee;
        require(lockedAmount > 0, "Insufficient funds after fee");
        require(_sendAmount == lockedAmount, "dif _sendAmount & lockedAmount");

        _lzSend(_receiveChainId, payload, _options, fee, payable(msg.sender));

        orders[orderId] = Order({
            maker: msg.sender,
            sendAmount: lockedAmount,
            sendChainId: uint32(block.chainid),
            receiveAmount: _receiveAmount,
            receiveChainId: _receiveChainId,
            taker: address(0),
            isFilled: false
        });

        orderId++;
        emit UpdateOrder(orderId, msg.sender, lockedAmount, uint32(block.chainid), _receiveAmount, _receiveChainId, address(0));
    }

    function acceptOrder(uint256 _orderId) external payable nonReentrant {

    }

    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // 메시지 타입 확인 (주문 생성 vs 주문 체결 완료)
        bytes4 messageType;
        assembly {
            let ptr := mload(0x40)  // 메모리 빈 공간 포인터 가져오기
            calldatacopy(ptr, _payload.offset, 4)  // calldata에서 4바이트 복사
            messageType := mload(ptr)  // 복사한 데이터 로드
        }

        if (messageType == bytes4(keccak256("CreateOrder"))) {
            _handleCreateOrder(_payload);
        } else if (messageType == bytes4(keccak256("AcceptOrder"))) {
            _handleAcceptOrder(_payload);
        } else {
            revert("Invalid message type");
        }
    }

    function _handleCreateOrder(bytes calldata _payload) internal {
        (uint256 orderId, address creator, uint256 amountGive, uint32 chainGive, uint256 amountReceive, uint32 chainReceive)
        = abi.decode(_payload[4:], (uint256, address, uint256, uint32, uint256, uint32));

        // ✅ B 체인의 컨트랙트에 동일한 주문 정보 저장
        orders[orderId] = Order({
            maker: creator,
            sendAmount: amountGive,
            sendChainId: chainGive,
            receiveAmount: amountReceive,
            receiveChainId: chainReceive,
            taker: address(0),
            isFilled: false
        });

//        emit OrderCreated(orderId, creator, amountGive, chainGive, amountReceive, chainReceive);
    }

    function _handleAcceptOrder(bytes calldata _payload) internal {
        (uint256 orderId, address taker) = abi.decode(_payload[4:], (uint256, address));

        Order storage order = orders[orderId];
        require(order.maker != address(0), "Order does not exist");
        require(!order.isFilled, "Order already filled");

        // ✅ 주문을 체결된 것으로 업데이트
        order.isFilled = true;
        order.taker = taker;

//        emit OrderFilled(orderId, taker, order.chainGive);

        // ✅ 주문 체결자(B)에게 ETH 전송
        payable(taker).transfer(order.sendAmount);
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
