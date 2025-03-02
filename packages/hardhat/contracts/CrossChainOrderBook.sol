// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

contract CrossChainOrderBook is OApp, ReentrancyGuard {
    struct Order {
        address creator;  // 주문 생성자
        uint256 amountGive;  // 보내려는 네이티브 토큰 수량
        uint32 chainGive;  // 보내려는 토큰이 있는 체인 ID
        uint256 amountReceive;  // 받으려는 네이티브 토큰 수량
        uint32 chainReceive;  // 받으려는 토큰이 있는 체인 ID
        address taker;  // 주문 체결자
        bool isFilled;  // 주문 체결 여부
    }

    mapping(uint256 => Order) public orders;
    mapping(uint256 => bool) public orderLocked;  // 주문 체결 "락(lock)"
    uint256 public orderCounter;  // Order ID 카운터

    event OrderCreated(uint256 indexed orderId, address creator, uint256 amountGive, uint32 chainGive, uint256 amountReceive, uint32 chainReceive);
    event OrderFilled(uint256 indexed orderId, address taker, uint32 chainGive);
    event OrderCancelled(uint256 indexed orderId, address creator);

    /**
     * @notice CrossChainOrderBook 생성자 (LayerZero 초기화)
     * @param _layerZeroEndpoint LayerZero 엔드포인트 주소
     * @param _delegate 컨트랙트 관리 주소
     */
    constructor(address _layerZeroEndpoint, address _delegate)
    OApp(_layerZeroEndpoint, _delegate)
    Ownable(_delegate)
    {}

    /**
     * @notice 크로스체인 주문 생성 (ETH/BNB 등 네이티브 토큰 전송)
     * @param _chainReceive 받으려는 체인 ID
     * @param _amountReceive 받으려는 토큰 수량
     */
    function createOrder(uint32 _chainReceive, uint256 _amountReceive) external payable nonReentrant {
        require(msg.value > 0, "Must send native token");
        require(_amountReceive > 0, "Receive amount must be greater than zero");

        uint256 orderId = orderCounter;
        orders[orderId] = Order({
            creator: msg.sender,
            amountGive: msg.value,
            chainGive: uint32(block.chainid),
            amountReceive: _amountReceive,
            chainReceive: _chainReceive,
            taker: address(0),
            isFilled: false
        });

        orderCounter++;

        emit OrderCreated(orderId, msg.sender, msg.value, uint32(block.chainid), _amountReceive, _chainReceive);

        // ✅ B 체인의 컨트랙트에도 주문 정보 저장을 요청하는 LayerZero 메시지 전송
        bytes memory payload = abi.encodePacked(
            bytes4(keccak256("CreateOrder")),
            abi.encode(orderId, msg.sender, msg.value, uint32(block.chainid), _amountReceive, _chainReceive)
        );
        MessagingFee memory fee = MessagingFee(msg.value, 0);

        _lzSend(_chainReceive, payload, "", fee, payable(msg.sender));
    }

    /**
     * @notice Order를 수락하여 체결 (체인 B에서 실행)
     * @param _orderId 체결할 Order의 ID
     */
    function acceptOrder(uint256 _orderId) external payable nonReentrant {
        Order storage order = orders[_orderId];

        require(order.creator != address(0), "Order does not exist");
        require(!order.isFilled, "Order already filled");
        require(!orderLocked[_orderId], "Order is being processed");  // ✅ 동시 체결 방지
        require(order.chainReceive == uint32(block.chainid), "Order must be executed on the destination chain");
        require(msg.value == order.amountReceive, "Incorrect amount sent");

        orderLocked[_orderId] = true;  // ✅ 락 활성화 (한 명만 체결 가능)
        order.isFilled = true;
        order.taker = msg.sender;

        emit OrderFilled(_orderId, msg.sender, order.chainGive);

        // ✅ 주문 생성자(A)에게 체결된 금액(2 BNB) 전송
        payable(order.creator).transfer(msg.value);

        // ✅ A 체인의 컨트랙트에 주문 체결 완료 메시지 전송
        bytes memory payload = abi.encodePacked(
            bytes4(keccak256("AcceptOrder")),
            abi.encode(_orderId, msg.sender)
        );
        MessagingFee memory fee = MessagingFee(msg.value, 0);

        _lzSend(order.chainGive, payload, "", fee, payable(msg.sender));
    }

    /**
     * @notice LayerZero 메시지를 수신하여 주문 정보를 저장하거나 업데이트
     * @param _payload Order 정보를 포함한 메시지
     */
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

    /**
     * @notice 주문 생성 메시지를 처리 (B 체인에서 실행)
     */
    function _handleCreateOrder(bytes calldata _payload) internal {
        (uint256 orderId, address creator, uint256 amountGive, uint32 chainGive, uint256 amountReceive, uint32 chainReceive)
        = abi.decode(_payload[4:], (uint256, address, uint256, uint32, uint256, uint32));

        // ✅ B 체인의 컨트랙트에 동일한 주문 정보 저장
        orders[orderId] = Order({
            creator: creator,
            amountGive: amountGive,
            chainGive: chainGive,
            amountReceive: amountReceive,
            chainReceive: chainReceive,
            taker: address(0),
            isFilled: false
        });

        emit OrderCreated(orderId, creator, amountGive, chainGive, amountReceive, chainReceive);
    }

    /**
     * @notice 주문 체결 메시지를 처리 (A 체인에서 실행)
     */
    function _handleAcceptOrder(bytes calldata _payload) internal {
        (uint256 orderId, address taker) = abi.decode(_payload[4:], (uint256, address));

        Order storage order = orders[orderId];
        require(order.creator != address(0), "Order does not exist");
        require(!order.isFilled, "Order already filled");

        // ✅ 주문을 체결된 것으로 업데이트
        order.isFilled = true;
        order.taker = taker;

        emit OrderFilled(orderId, taker, order.chainGive);

        // ✅ 주문 체결자(B)에게 ETH 전송
        payable(taker).transfer(order.amountGive);
    }
}
