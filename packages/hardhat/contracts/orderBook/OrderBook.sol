// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CrossChainOrderBook2 {
    struct Order {
        address maker;     // 주문 생성자
        uint256 srcAmount; // 보내려는 네이티브 토큰 수량
        uint256 dstAmount; // 받으려는 네이티브 토큰 수량
        uint32 srcEid;     // 보내려는 체인의 ID
        uint32 dstEid;     // 받으려는 체인의 ID
        bytes32 hashLock;  // 해시락 (HTLC)
        uint256 expiration; // 주문 만료 시간
        address taker;     // 주문 체결자
        bool isFilled;     // 주문 체결 여부
    }

    mapping(uint256 => Order) public orders;
    mapping(bytes32 => bool) public secretsUsed;
    uint256 public orderCounter;

    event OrderCreated(uint256 indexed orderId, address indexed maker, uint256 srcAmount, uint256 dstAmount, uint32 srcEid, uint32 dstEid, bytes32 hashLock, uint256 expiration);
    event OrderAccepted(uint256 indexed orderId, address indexed taker);
    event OrderCompleted(uint256 indexed orderId, address indexed recipient);
    event OrderCancelled(uint256 indexed orderId, address indexed maker);
    event OrderRefunded(uint256 indexed orderId, address indexed taker);

    /**
     * @notice 주문 생성 (ETH 또는 BNB 예치)
     */
    function createOrder(uint32 _dstEid, uint256 _dstAmount, bytes32 _hashLock, uint256 _expiration) external payable {
        require(msg.value > 0, "Must send native token");
        require(_expiration > block.timestamp, "Expiration must be in the future");

        uint256 orderId = orderCounter++;

        orders[orderId] = Order({
            maker: msg.sender,
            srcAmount: msg.value,
            dstAmount: _dstAmount,
            srcEid: uint32(block.chainid),
            dstEid: _dstEid,
            hashLock: _hashLock,
            expiration: _expiration,
            taker: address(0),
            isFilled: false
        });

        emit OrderCreated(orderId, msg.sender, msg.value, _dstAmount, uint32(block.chainid), _dstEid, _hashLock, _expiration);
    }

    /**
     * @notice 주문 체결 (체결자가 BNB 또는 ETH 예치)
     */
    function acceptOrder(uint256 _orderId) external payable {
        Order storage order = orders[_orderId];

        require(order.maker != address(0), "Order does not exist");
        require(!order.isFilled, "Order already filled");
        require(order.dstEid == uint32(block.chainid), "Order must be executed on destination chain");
        require(msg.value == order.dstAmount, "Incorrect amount sent");

        order.taker = msg.sender;
        order.isFilled = true;

        emit OrderAccepted(_orderId, msg.sender);
    }

    /**
     * @notice 주문 체결자가 ETH 또는 BNB를 수령 (비밀 키 제출)
     */
    function completeOrder(uint256 _orderId, string memory _secret) external {
        Order storage order = orders[_orderId];
        require(order.isFilled, "Order not filled");
        require(keccak256(abi.encodePacked(_secret)) == order.hashLock, "Invalid secret");
        require(!secretsUsed[order.hashLock], "Secret already used");

        secretsUsed[order.hashLock] = true;

        if (order.srcEid == uint32(block.chainid)) {
            // ✅ 주문 체결자(B)에게 ETH 전송 (체인 A → 체인 B)
            payable(order.taker).transfer(order.srcAmount);
        } else {
            // ✅ 주문 생성자(A)에게 BNB 전송 (체인 B → 체인 A)
            payable(order.maker).transfer(order.dstAmount);
        }

        emit OrderCompleted(_orderId, msg.sender);
    }

    /**
     * ✅ **(추가) 주문 취소 함수**
     * 주문이 체결되지 않았을 경우 주문을 취소하고 `maker`에게 환불
     */
    function cancelOrder(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(order.maker == msg.sender, "Not order creator");
        require(!order.isFilled, "Order already filled");

        order.isFilled = true;

        // ✅ 주문 생성자(A)에게 환불
        payable(msg.sender).transfer(order.srcAmount);

        emit OrderCancelled(_orderId, msg.sender);
    }

    /**
     * ✅ **(추가) 주문 체결자 환불 함수**
     * 주문 체결자가 BNB 또는 ETH를 예치했지만, 주문이 만료되었을 경우 환불 가능
     */
    function refundOrder(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(order.taker == msg.sender, "Not order taker");
        require(order.isFilled, "Order not filled");
        require(order.expiration < block.timestamp, "Order not expired");

        order.isFilled = false;

        // ✅ 주문 체결자(B)에게 환불
        payable(order.taker).transfer(order.dstAmount);

        emit OrderRefunded(_orderId, msg.sender);
    }
}
