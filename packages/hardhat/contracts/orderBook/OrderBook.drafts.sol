// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "hardhat/console.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";

contract IOrderBookDrafts {
    struct Order {
        address payable maker;      // The party that locked funds.
        address payable taker;      // Set when the taker executes the swap.
        uint256 depositAmount;       // Amount of native tokens locked by the maker.
        uint256 desiredAmount;      // The amount the maker expects from the taker.
        uint256 timelock;           // Expiration timestamp (Unix epoch).
        bool executed;              // True when the order has been executed (confirmed).
        bool canceled;              // True if the order has been canceled.
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

contract OrderBookDrafts is IOrderBookDrafts, OApp, OAppOptionsType3 {
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

    function createOrder(
        uint32 _dstEid,
        uint256 _depositAmount,
        uint256 _desiredAmount,
        bytes calldata _options
    ) external payable {
        require(msg.value > 0, "Must send native token");
        require(_desiredAmount > 0, "Receive amount must be greater than zero");

        // Record the swap order on the local chain.
        srcOrder[orderId] = Order({
            maker: payable(msg.sender),
            taker: payable(address(0)),
            depositAmount: _depositAmount,
            desiredAmount: _desiredAmount,
            timelock: 0,
            executed: false,
            canceled: false
        });

        bytes memory payload = abi.encodePacked(
            bytes4(keccak256("CreateOrder")),
            abi.encode(orderId, msg.sender, srcEid, _depositAmount, _dstEid, _desiredAmount)
        );
        MessagingFee memory fee = _quote(_dstEid, payload, _options, false);
        require(msg.value >= fee.nativeFee, "Insufficient funds fee");
        uint256 lockedAmount = msg.value - fee.nativeFee;
        require(_depositAmount == lockedAmount, "dif _depositAmount & lockedAmount");

        _lzSend(_dstEid, payload, _options, fee, payable(msg.sender));

        orderId++;
    }

    function cancelOrder(bytes32 _orderId) external {}
    function executeOrder(
        uint256 _orderId,
        uint32 _dstEid,
        uint256 _paymentAmount,
        uint256 _desiredAmount,
        uint256 _timelock,
        bytes calldata _options
    ) external payable {
        bytes32 dstOrderId = keccak256(abi.encodePacked(
            _orderId,
            _dstEid
        ));

        Order storage order = dstOrder[dstOrderId];

        order.taker = payable(msg.sender);
        order.desiredAmount  = _paymentAmount;
        order.timelock = _timelock;
        order.executed = true;

        bytes memory payload = abi.encodePacked(
            bytes4(keccak256("executeOrder")),
            abi.encode(_orderId, msg.sender, srcEid, _paymentAmount, _dstEid, _desiredAmount, _timelock)
        );
        MessagingFee memory fee = _quote(_dstEid, payload, _options, false);
        require(msg.value >= fee.nativeFee, "Insufficient funds fee");
        uint256 lockedAmount = msg.value - fee.nativeFee;
        require(_paymentAmount == lockedAmount, "dif _paymentAmount & lockedAmount");

        _lzSend(_dstEid, payload, _options, fee, payable(msg.sender));
    }
    function claim(uint256 _orderId, uint32 _dstEid) external {
        bytes32 dstOrderId = keccak256(abi.encodePacked(
            _orderId,
            _dstEid
        ));

        Order storage order = dstOrder[dstOrderId];

        payable(order.maker).transfer(order.desiredAmount);
    }



    function _confirmExecution(bytes32 _orderId, address _taker) internal {}

    function _lzReceive(
        Origin calldata /*_origin*/,
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
            (uint256 _orderId, address _maker, uint32 _dstEid, uint256 _depositAmount, uint32 _srcEid, uint256 _desiredAmount)
            = abi.decode(_payload[4:], (uint256, address, uint32, uint256, uint32, uint256));

            bytes32 dstOrderId = keccak256(abi.encodePacked(
                _orderId,
                _dstEid
            ));

            dstOrder[dstOrderId] = Order({
                maker: payable(_maker),
                taker: payable(address(0)),
                depositAmount: _depositAmount,
                desiredAmount: _desiredAmount,
                timelock: 0,
                executed: false,
                canceled: false
            });
        } else if (messageType == bytes4(keccak256("executeOrder"))) {
            (uint256 _orderId, address _taker, uint32 _dstEid, uint256 _depositAmount, uint32 _srcEid, uint256 _desiredAmount, uint256 _timelock)
            = abi.decode(_payload[4:], (uint256, address, uint32, uint256, uint32, uint256, uint256));

            srcOrder[_orderId].timelock = _timelock;
            srcOrder[_orderId].taker = payable(_taker);
            srcOrder[_orderId].executed = true;

            payable(_taker).transfer(srcOrder[_orderId].depositAmount);
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
