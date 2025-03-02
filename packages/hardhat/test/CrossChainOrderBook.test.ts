import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { padHex, parseEther } from "viem";
import { Options } from "@layerzerolabs/lz-v2-utilities";

describe("CrossChainOrderBook Test", function () {
  // LayerZero Mock Endpoint IDs (Ethereum ↔ BNB)
  const eidA = 1; // Ethereum
  const eidB = 2; // BNB

  async function deployFixture() {
    // Get wallet clients (signers)
    const [ownerA, ownerB, endpointOwner] = await hre.viem.getWalletClients();

    // ✅ LayerZero Mock Endpoint 배포 (A 체인, B 체인)
    const mockEndpointV2A = await hre.viem.deployContract(
      "EndpointV2Mock",
      [eidA],
      { client: { wallet: endpointOwner } },
    );

    const mockEndpointV2B = await hre.viem.deployContract(
      "EndpointV2Mock",
      [eidB],
      { client: { wallet: endpointOwner } },
    );

    // ✅ CrossChainOrderBook 배포 (Ethereum, BNB)
    const orderBookA = await hre.viem.deployContract(
      "CrossChainOrderBook",
      [mockEndpointV2A.address, ownerA.account.address],
      { client: { wallet: ownerA } },
    );

    const orderBookB = await hre.viem.deployContract(
      "CrossChainOrderBook",
      [mockEndpointV2B.address, ownerB.account.address],
      { client: { wallet: ownerB } },
    );

    // ✅ LayerZero Endpoint 연결 설정
    await mockEndpointV2A.write.setDestLzEndpoint([
      orderBookB.address,
      mockEndpointV2B.address,
    ]);
    await mockEndpointV2B.write.setDestLzEndpoint([
      orderBookA.address,
      mockEndpointV2A.address,
    ]);

    // ✅ Peer 설정
    await orderBookA.write.setPeer([
      eidB,
      padHex(orderBookB.address, { size: 32 }),
    ]);
    await orderBookB.write.setPeer([
      eidA,
      padHex(orderBookA.address, { size: 32 }),
    ]);

    return {
      orderBookA,
      orderBookB,
      ownerA,
      ownerB,
      mockEndpointV2A,
      mockEndpointV2B,
    };
  }

  describe("Order Management", function () {
    it("should create an order and propagate to destination chain", async function () {
      const { orderBookA, orderBookB, ownerA } =
        await loadFixture(deployFixture);

      const orderAmountGive = parseEther("1"); // 1 ETH
      const orderAmountReceive = parseEther("2"); // 2 BNB

      // LayerZero 실행 옵션
      const options = Options.newOptions()
        .addExecutorLzReceiveOption(200000, 0)
        .toHex()
        .toString();

      // // 크로스체인 수수료 견적
      // const { nativeFee } = (await orderBookA.read.estimateFees([
      //   eidB,
      //   orderAmountGive,
      // ])) as { nativeFee: bigint; lzTokenFee: bigint };

      await orderBookA.write.createOrder([eidB, orderAmountReceive], {
        value: orderAmountGive, // 1 ETH 전송
        account: ownerA.account.address,
      });
      //
      // // ✅ 주문 생성 실행 (Ethereum 체인에서)
      // await expect(
      //   orderBookA.write.createOrder([eidB, orderAmountReceive], {
      //     value: orderAmountGive, // 1 ETH 전송
      //     account: ownerA.account.address,
      //   }),
      // )
      //   .to.emit(orderBookA, "OrderCreated")
      //   .withArgs(
      //     0,
      //     ownerA.account.address,
      //     orderAmountGive,
      //     eidA,
      //     orderAmountReceive,
      //     eidB,
      //   );
      //
      // // ✅ LayerZero 메시지 이후, B 체인에서도 주문 정보가 저장되어야 함
      // const order = await orderBookB.read.orders([0]);
      // expect(order.creator).to.equal(ownerA.account.address);
      // expect(order.amountGive).to.equal(orderAmountGive);
      // expect(order.amountReceive).to.equal(orderAmountReceive);
    });

    // it("should accept an order and complete cross-chain transfer", async function () {
    //   const { orderBookA, orderBookB, ownerA, ownerB } =
    //     await loadFixture(deployFixture);
    //
    //   const orderAmountGive = hre.viem.parseEther("1"); // 1 ETH
    //   const orderAmountReceive = hre.viem.parseEther("2"); // 2 BNB
    //
    //   // ✅ A 체인에서 주문 생성
    //   await orderBookA.write.createOrder([eidB, orderAmountReceive], {
    //     value: orderAmountGive,
    //     account: ownerA.account.address,
    //   });
    //
    //   // ✅ LayerZero 실행 옵션
    //   const options = Options.newOptions()
    //     .addExecutorLzReceiveOption(200000, 0)
    //     .toHex()
    //     .toString();
    //
    //   // ✅ B 체인에서 주문 체결 실행
    //   await expect(
    //     orderBookB.write.acceptOrder([0], {
    //       value: orderAmountReceive, // 2 BNB 전송
    //       account: ownerB.account.address,
    //     }),
    //   )
    //     .to.emit(orderBookB, "OrderFilled")
    //     .withArgs(0, ownerB.account.address, eidA);
    //
    //   // ✅ A 체인에서 주문이 체결되었는지 확인
    //   const order = await orderBookA.read.orders([0]);
    //   expect(order.isFilled).to.be.true;
    //   expect(order.taker).to.equal(ownerB.account.address);
    // });
  });

  // describe("LayerZero Message Processing", function () {
  //   it("should process _lzReceive for CreateOrder", async function () {
  //     const { orderBookB, ownerA } = await loadFixture(deployFixture);
  //
  //     const orderAmountGive = hre.viem.parseEther("1");
  //     const orderAmountReceive = hre.viem.parseEther("2");
  //
  //     // ✅ LayerZero 메시지 수신 시뮬레이션 (_lzReceive 실행)
  //     const payload = hre.viem.encodeAbiParameters(
  //       [
  //         { type: "uint256", name: "orderId" },
  //         { type: "address", name: "creator" },
  //         { type: "uint256", name: "amountGive" },
  //         { type: "uint32", name: "chainGive" },
  //         { type: "uint256", name: "amountReceive" },
  //         { type: "uint32", name: "chainReceive" },
  //       ],
  //       [
  //         0,
  //         ownerA.account.address,
  //         orderAmountGive,
  //         eidA,
  //         orderAmountReceive,
  //         eidB,
  //       ],
  //     );
  //
  //     await orderBookB.write._lzReceive(
  //       [eidA, "0x0", payload, "0x0", "0x0"],
  //       {
  //         account: ownerA.account.address,
  //       },
  //     );
  //
  //     // ✅ B 체인에서 주문이 저장되었는지 확인
  //     const order = await orderBookB.read.orders([0]);
  //     expect(order.creator).to.equal(ownerA.account.address);
  //     expect(order.amountGive).to.equal(orderAmountGive);
  //     expect(order.amountReceive).to.equal(orderAmountReceive);
  //   });
  //
  //   it("should process _lzReceive for AcceptOrder", async function () {
  //     const { orderBookA, ownerB } = await loadFixture(deployFixture);
  //
  //     // ✅ LayerZero 메시지 수신 시뮬레이션 (_lzReceive 실행)
  //     const payload = hre.viem.encodeAbiParameters(
  //       [
  //         { type: "uint256", name: "orderId" },
  //         { type: "address", name: "taker" },
  //       ],
  //       [0, ownerB.account.address],
  //     );
  //
  //     await orderBookA.write._lzReceive(
  //       [eidB, "0x0", payload, "0x0", "0x0"],
  //       {
  //         account: ownerB.account.address,
  //       },
  //     );
  //
  //     // ✅ A 체인에서 주문이 체결되었는지 확인
  //     const order = await orderBookA.read.orders([0]);
  //     expect(order.isFilled).to.be.true;
  //     expect(order.taker).to.equal(ownerB.account.address);
  //   });
  // });
});
