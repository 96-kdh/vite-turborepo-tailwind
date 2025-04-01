import { HardhatRuntimeEnvironment } from "hardhat/types";
import pc from "picocolors";
import readline from "readline-sync";
import { encodeAbiParameters, keccak256, toHex } from "viem";

export const isYes = (str: string): boolean => {
   return str.toLowerCase() === "y" || str.toLowerCase() === "yes";
};

export const beforeTaskAction = async (
   taskArgs: { [key: string]: string } | NonNullable<unknown>,
   hre: HardhatRuntimeEnvironment,
   afterTaskAction: () => Promise<void>,
) => {
   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
   // @ts-expect-error
   if (taskArgs["autoapprove"] === "true") return await afterTaskAction();

   console.log("\n트랜잭션을 실행 전, 다음과 같은 사항들이 올바른지 체크해주세요.\n");

   const [owner] = await hre.viem.getWalletClients(); // hardhat config accounts 0 index
   console.log(`selected network: [${pc.red(hre.network.name)}]`);
   console.log(`selected address: [${pc.red(owner.account.address)}]`);

   if (!taskArgs) console.log("\n전달된 taskArgs 가 없습니다.");
   else {
      console.log("\n전달된 taskArgs 는 아래와 같습니다.", "\n{");
      for (const [key, value] of Object.entries(taskArgs)) {
         let _value = value;
         try {
            _value = JSON.parse(value);
         } catch (e) {
            //
         }
         console.log(`   ${pc.blue(key)}: `, _value);
      }
      console.log("}");
   }

   let answer = ""; // user input value
   answer = readline.question(`진행하시겠습니까 ? (Y/N) `);

   if (!isYes(answer)) return console.log("\n진행하지 않습니다. 종료합니다.");

   await afterTaskAction();
};

export const encodePayloadViem = () => {
   const CreateOrder = ({
      orderId,
      sender,
      srcEid,
      depositAmount,
      dstEid,
      desiredAmount,
   }: {
      orderId: bigint;
      sender: `0x${string}`;
      srcEid: number;
      depositAmount: bigint;
      dstEid: number;
      desiredAmount: bigint;
   }): string => {
      const functionSelector = keccak256(toHex("CreateOrder")).slice(0, 10);
      const encodedData = encodeAbiParameters(
         [
            { type: "uint256" },
            { type: "address" },
            { type: "uint32" },
            { type: "uint256" },
            { type: "uint32" },
            { type: "uint256" },
         ],
         [orderId, sender, srcEid, depositAmount, dstEid, desiredAmount],
      );
      return functionSelector + encodedData.slice(2);
   };

   const executeOrder = ({
      orderId,
      sender,
      srcEid,
      paymentAmount,
      dstEid,
      desiredAmount,
      timelock,
   }: {
      orderId: bigint;
      sender: `0x${string}`;
      srcEid: number;
      paymentAmount: bigint;
      dstEid: number;
      desiredAmount: bigint;
      timelock: bigint;
   }): string => {
      const functionSelector = keccak256(toHex("executeOrder")).slice(0, 10);
      const encodedData = encodeAbiParameters(
         [
            { type: "uint256" },
            { type: "address" },
            { type: "uint32" },
            { type: "uint256" },
            { type: "uint32" },
            { type: "uint256" },
            { type: "uint256" },
         ],
         [orderId, sender, srcEid, paymentAmount, dstEid, desiredAmount, timelock],
      );
      return functionSelector + encodedData.slice(2);
   };

   const claim = ({ orderId, sender, srcEid }: { orderId: bigint; sender: `0x${string}`; srcEid: number }): string => {
      const functionSelector = keccak256(toHex("claim")).slice(0, 10);
      const encodedData = encodeAbiParameters(
         [{ type: "uint256" }, { type: "address" }, { type: "uint32" }],
         [orderId, sender, srcEid],
      );
      return functionSelector + encodedData.slice(2);
   };

   const canceled = ({
      orderId,
      sender,
      srcEid,
   }: {
      orderId: bigint;
      sender: `0x${string}`;
      srcEid: number;
   }): string => {
      const functionSelector = keccak256(toHex("canceled")).slice(0, 10);
      const encodedData = encodeAbiParameters(
         [{ type: "uint256" }, { type: "address" }, { type: "uint32" }],
         [orderId, sender, srcEid],
      );
      return functionSelector + encodedData.slice(2);
   };

   return { CreateOrder, executeOrder, claim, canceled };
};
