import { HardhatRuntimeEnvironment } from "hardhat/types";
import pc from "picocolors";
import readline from "readline-sync";

export const isYes = (str: string): boolean => {
  return str.toLowerCase() === "y" || str.toLowerCase() === "yes";
};

export const beforeTaskAction = async (
  taskArgs: { [key: string]: string } | NonNullable<unknown>,
  hre: HardhatRuntimeEnvironment,
  afterTaskAction: () => Promise<void>,
) => {
  console.log(
    "\n트랜잭션을 실행 전, 다음과 같은 사항들이 올바른지 체크해주세요.\n",
  );

  const [owner] = await hre.viem.getWalletClients(); // hardhat config accounts 0 index
  console.log(`selected network: [${pc.red(hre.network.name)}]`);
  console.log(`selected address: [${pc.red(owner.account.address)}]`);

  console.log(taskArgs === "{}");
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
