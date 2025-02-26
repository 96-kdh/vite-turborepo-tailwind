import { task } from "hardhat/config";
import readline from "readline-sync";
import pc from "picocolors";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { spawnSync } from "child_process";
import { Worker, isMainThread, parentPort } from "worker_threads";

import { isYes } from "../utils";
import WebSocket from "ws";

enum Task {
  dev = "dev",
}

const beforeTaskAction = async (
  taskArgs: { [key: string]: string } | undefined,
  hre: HardhatRuntimeEnvironment,
  afterTaskAction: () => Promise<void>,
) => {
  console.log(
    "\n트랜잭션을 실행 전, 다음과 같은 사항들이 올바른지 체크해주세요.\n",
  );

  const [owner] = await hre.viem.getWalletClients(); // hardhat config accounts 0 index
  console.log(`selected network: [${pc.red(hre.network.name)}]`);
  console.log(`selected address: [${pc.red(owner.account.address)}]`);

  if (!taskArgs) {
    console.log("\n전달된 taskArgs 가 없습니다.");
  } else {
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

// npx hardhat dev
task(Task.dev, "override npx hardhat node task").setAction(
  async (taskArgs, hre) =>
    beforeTaskAction(taskArgs, hre, async () => {
      if (isMainThread) {
        const worker = new Worker(__filename, {
          execArgv: ["-r", "ts-node/register"],
        });

        (function nodeHealthChecker() {
          const ws = new WebSocket("ws://localhost:8545");

          ws.on("open", async () => {
            console.log("✅ node 실행 완료, 1000ms 블록생성 시작");
            await hre.network.provider.send("evm_setIntervalMining", [1000]);

            ws.close();

            let answer = "";

            answer = readline.question(`\n진행하시겠습니까 ? (Y/N) `);

            if (!isYes(answer)) {
              return console.log("\n실행하지 않습니다. 종료합니다.");
            }
            // npx hardhat ignition deploy ignition/modules/index.ts --network localhost

            console.log("실행한 후 종료합니다.");
          });

          ws.on("error", (err: { message: string }) => {
            console.error("❌ 아직 노드 실행되지 않음, ", err.message);
            setTimeout(nodeHealthChecker, 1000);
          });
        })();

        worker.on("exit", () => {
          console.log("Hardhat 노드 실행이 종료되었습니다.");
        });
      } else {
        // Worker 스레드에서 Hardhat 실행
        spawnSync("npx", ["hardhat", "node"], {
          stdio: "inherit", // ✅ 부모 프로세스의 stdout과 stderr를 그대로 사용
          shell: true, // ✅ 실제 쉘에서 실행 (Windows에서도 정상 작동)
          // detached: false, // ✅ 부모 프로세스 종료 시 자식 프로세스도 종료됨
        });
      }

      parentPort?.postMessage("done");
    }),
);
