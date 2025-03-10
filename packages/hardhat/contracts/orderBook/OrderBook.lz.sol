// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "hardhat/console.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";

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

    // event CreateOrder();
    // event UpdateOrderStatus();
}

contract OrderBookWithLz is IOrderBook, OApp, OAppOptionsType3 {
    uint32 public srcEid;

    uint256 public orderId;
    // mapping(orderId => Order)
    mapping(uint256 => Order) public srcOrder;
    // mapping(keccak256(abi.encodePacked(orderId, eid)) => Order)
    mapping(bytes32 => Order) public dstOrder;

    constructor(
        address _endpoint,
        address _delegate,
        uint32 _srcEid
    ) OApp(_endpoint, _delegate) Ownable(_delegate) {
        srcEid = _srcEid;
    }

    function getOrder(uint256 _orderId) external view returns (Order memory) {
        return srcOrder[_orderId];
    }

    function getOrder(uint256 _orderId, uint32 _dstEid) external view returns (Order memory) {
        bytes32 dstOrderId = keccak256(abi.encodePacked(
            _orderId,
            _dstEid
        ));
        return dstOrder[dstOrderId];
    }

    function createOrder(
        uint32 _dstEid,
        uint256 _depositAmount,
        uint256 _desiredAmount,
        bytes calldata _options
    ) external payable {
        require(_desiredAmount > 0, "Receive amount must be greater than zero");
        require(srcOrder[orderId].status == OrderStatus.no, "order status must be 0(OrderStatus.no)");

        bytes memory payload = abi.encodePacked(
            bytes4(keccak256("CreateOrder")),
            abi.encode(orderId, msg.sender, srcEid, _depositAmount, _dstEid, _desiredAmount)
        );
        MessagingFee memory fee = _quote(_dstEid, payload, _options, false);

        require(msg.value >= fee.nativeFee, "Insufficient funds fee");
        uint256 lockedAmount = msg.value - fee.nativeFee;
        require(_depositAmount == lockedAmount, "dif _depositAmount & lockedAmount");

        srcOrder[orderId] = Order({
            maker: payable(msg.sender),
            taker: payable(address(0)),
            depositAmount: _depositAmount,
            desiredAmount: _desiredAmount,
            timelock: 0,
            status: OrderStatus.createOrder
        });

        _lzSend(_dstEid, payload, _options, fee, payable(msg.sender));

        orderId++;
    }

    function cancelOrder(uint256 _orderId, uint32 _dstEid, bytes calldata _options) external payable {
        Order storage order = srcOrder[_orderId];

        require(order.status == OrderStatus.createOrder, "order status must be 1(OrderStatus.createOrder)");
        require(order.maker == msg.sender, "msg.sender is not maker");

        bytes memory payload = abi.encodePacked(
            bytes4(keccak256("cancelOrder")), abi.encode(_orderId, msg.sender, srcEid)
        );
        MessagingFee memory fee = _quote(_dstEid, payload, _options, false);
        require(msg.value == fee.nativeFee, "dif msg.value & fee.nativeFee");

        order.status = OrderStatus.canceled;
        payable(order.maker).transfer(order.depositAmount);

        _lzSend(_dstEid, payload, _options, fee, payable(msg.sender));
    }

    /**
     * @param _timelock _lzSend 가 전달되기 전 최소 시간 설정이라, timestamp 값을 직접 넣는게 아니라, 해당 트랜잭션이 통과된 후 부터 timelock
     */
    function executeOrder(
        uint256 _orderId,
        uint32 _dstEid,
        uint256 _paymentAmount,
        uint256 _desiredAmount,
        uint256 _timelock,
        bytes calldata _options
    ) external payable {
        require(msg.sender != address(0), "taker must not be zero address");
        require(_timelock >= 3600, "Requires a timelock of at least 60 minutes");

        bytes32 dstOrderId = keccak256(abi.encodePacked(
            _orderId,
            _dstEid
        ));
        Order storage order = dstOrder[dstOrderId];

        require(order.taker == address(0), "Order already filled");
        require(order.desiredAmount == _paymentAmount, "dif desiredAmount & _paymentAmount");
        require(order.status == OrderStatus.createOrderLzReceive, "Order status must be 2(OrderStatus.createOrderLzReceive)");

        order.taker = payable(msg.sender);
        order.timelock = block.timestamp + _timelock;
        order.status = OrderStatus.executeOrder;

        bytes memory payload = abi.encodePacked(
            bytes4(keccak256("executeOrder")),
            abi.encode(_orderId, msg.sender, srcEid, _paymentAmount, _dstEid, _desiredAmount, order.timelock)
        );
        MessagingFee memory fee = _quote(_dstEid, payload, _options, false);
        require(msg.value >= fee.nativeFee, "Insufficient funds fee");
        uint256 lockedAmount = msg.value - fee.nativeFee;
        require(_paymentAmount == lockedAmount, "dif _paymentAmount & lockedAmount");

        _lzSend(_dstEid, payload, _options, fee, payable(msg.sender));
    }

    function claim(uint256 _orderId, uint32 _dstEid, bytes calldata _options) external payable {
        Order storage order = srcOrder[_orderId];

        require(order.maker == msg.sender, "msg.sender is not maker");
        require(order.status == OrderStatus.executeOrderLzReceive, "order status must be 4(OrderStatus.executeOrderLzReceive)");

        order.status = OrderStatus.claim;

        bytes memory payload = abi.encodePacked(
            bytes4(keccak256("claim")),
            abi.encode(_orderId, msg.sender, srcEid)
        );
        MessagingFee memory fee = _quote(_dstEid, payload, _options, false);
        require(msg.value == fee.nativeFee, "dif msg.value & fee.nativeFee");

        _lzSend(_dstEid, payload, _options, fee, payable(msg.sender));
    }

    function emergencyRefundDstOrder(uint256 _orderId, uint32 _dstEid) external onlyOwner {
        bytes32 dstOrderId = keccak256(abi.encodePacked(
            _orderId,
            _dstEid
        ));
        Order storage order = dstOrder[dstOrderId];

        require(order.taker != address(0), "taker must not be a zero address");
        require(order.timelock < block.timestamp, "Not yet expired");
        require(order.status == OrderStatus.executeOrder, "oder status is not cancelable");

        payable(order.taker).transfer(order.desiredAmount);
        order.status = OrderStatus.canceledLzReceive;
    }

    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        bytes4 messageType;

        assembly {
            let ptr := mload(0x40)  // 메모리 빈 공간 포인터 가져오기
            calldatacopy(ptr, _payload.offset, 4)  // calldata에서 4바이트 복사
            messageType := mload(ptr)  // 복사한 데이터 로드
        }

        if (messageType == bytes4(keccak256("CreateOrder"))) {
            (uint256 _orderId, address _maker, uint32 _dstEid, uint256 _depositAmount, uint32 _srcEid, uint256 _desiredAmount)
            = abi.decode(_payload[4:], (uint256, address, uint32, uint256, uint32, uint256));

            require(_maker != address(0), "maker must not be zero address");
            require(_srcEid == srcEid, "invalid src endpoint id, with payload");
            require(_origin.srcEid == _dstEid, "invalid src endpoint id, with payload");

            bytes32 dstOrderId = keccak256(abi.encodePacked(
                _orderId,
                _dstEid
            ));

            require(dstOrder[dstOrderId].maker == address(0), "Order already filled");
            require(dstOrder[dstOrderId].status == OrderStatus.no, "order status must be zero(OrderStatus.no)");

            dstOrder[dstOrderId] = Order({
                maker: payable(_maker),
                taker: payable(address(0)),
                depositAmount: _depositAmount,
                desiredAmount: _desiredAmount,
                timelock: 0,
                status: OrderStatus.createOrderLzReceive
            });
        } else if (messageType == bytes4(keccak256("executeOrder"))) {
            (uint256 _orderId, address _taker, uint32 _dstEid, , uint32 _srcEid, , uint256 _timelock)
            = abi.decode(_payload[4:], (uint256, address, uint32, uint256, uint32, uint256, uint256));

            require(srcOrder[_orderId].maker != address(0), "order does not exist");
            require(_srcEid == srcEid, "invalid src endpoint id, with payload");
            require(_origin.srcEid == _dstEid, "invalid src endpoint id, with payload");
            require(_timelock >= block.timestamp, "order has expired");
            require(srcOrder[_orderId].status == OrderStatus.createOrder, "src order status must be 1(OrderStatus.createOrder)");

            srcOrder[_orderId].timelock = _timelock;
            srcOrder[_orderId].taker = payable(_taker);
            srcOrder[_orderId].status = OrderStatus.executeOrderLzReceive;

            payable(_taker).transfer(srcOrder[_orderId].depositAmount);
        } else if (messageType == bytes4(keccak256("claim"))) {
            (uint256 _orderId, address _maker, uint32 _dstEid) = abi.decode(_payload[4:], (uint256, address, uint32));
            require(_origin.srcEid == _dstEid, "invalid src endpoint id, with payload");

            bytes32 dstOrderId = keccak256(abi.encodePacked(
                _orderId,
                _dstEid
            ));

            require(dstOrder[dstOrderId].maker == _maker, "msg sender is not maker, with payload");
            require(dstOrder[dstOrderId].status == OrderStatus.executeOrder, "status must be 3(OrderStatus.executeOrder)");

            dstOrder[dstOrderId].status = OrderStatus.claimLzReceive;
            payable(_maker).transfer(dstOrder[dstOrderId].desiredAmount);
        } else if (messageType == bytes4(keccak256("cancelOrder"))) {
            (uint256 _orderId, address _maker, uint32 _dstEid) = abi.decode(_payload[4:], (uint256, address, uint32));
            require(_origin.srcEid == _dstEid, "invalid src endpoint id, with payload");

            bytes32 dstOrderId = keccak256(abi.encodePacked(
                _orderId,
                _dstEid
            ));
            require(dstOrder[dstOrderId].maker == _maker, "msg sender is not maker, with payload");

            if (dstOrder[dstOrderId].taker != address(0) && dstOrder[dstOrderId].status == OrderStatus.executeOrder) {
                payable(dstOrder[dstOrderId].taker).transfer(dstOrder[dstOrderId].desiredAmount);
            }
            dstOrder[dstOrderId].status = OrderStatus.canceledLzReceive;
        } else {
            revert("Invalid message type");
        }
    }


    function quote(
        uint32 _dstEid,
        bytes memory _payload,
        bytes memory _options,
        bool _payInLzToken
    ) external view returns (MessagingFee memory fee) {
        fee = _quote(_dstEid, _payload, _options, _payInLzToken);
    }

    function _payNative(uint256 _nativeFee) internal override returns (uint256 nativeFee) {
        require(msg.value >= _nativeFee, "Not enough native tokens");
        return _nativeFee;
    }
}
