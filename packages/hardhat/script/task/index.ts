import { task } from "hardhat/config";
import { spawn, spawnSync } from "child_process";
import WebSocket from "ws";

import { SupportChainIds } from "../types";

enum Task {
  dev = "dev", // only run local
  mining = "mining", // only run local
}

// npx hardhat mining
task(Task.mining, "run hardhat node mining")
  .addOptionalParam("interval", "mining interval(ms)", "1000")
  .setAction(async ({ interval }, hre) => {
    if (hre.network.config.chainId !== SupportChainIds.LOCALHOST) {
      throw new Error("only run local");
    }

    console.log(`${interval}ms 블록생성 시작`);
    await hre.network.provider.send("evm_setIntervalMining", [
      Number(interval),
    ]);
  });

// npx hardhat dev
task(Task.dev, "override npx hardhat node task").setAction(
  async (taskArgs, hre) => {
    if (hre.network.config.chainId !== SupportChainIds.LOCALHOST) {
      throw new Error("only run local");
    }

    console.log("\n🚀 Hardhat 노드를 실행합니다...");

    const hardhatProcess = spawn("npx", ["hardhat", "node"], {
      stdio: "inherit", // ✅ 부모 프로세스의 stdout/stderr을 그대로 사용
      shell: true, // ✅ 쉘을 통해 실행
    });

    (function nodeHealthChecker() {
      const ws = new WebSocket("ws://localhost:8545");

      ws.on("open", async () => {
        console.log("✅ hardhat node 인식완료, 1s block 생성을 시작합니다.");

        spawnSync("npx", ["hardhat", Task.mining, "--network", "localhost"], {
          stdio: "inherit",
          shell: true,
        });

        console.log(
          "✅ 1s block 생성 완료, ignition 으로 컨트랙트를 배포합니다.",
        );

        spawnSync(
          "npx",
          [
            "hardhat",
            "ignition",
            "deploy",
            "ignition/modules/Lock.ts",
            "--network",
            "localhost",
          ],
          {
            stdio: "inherit",
            shell: true,
          },
        );

        console.log("✅ ignition 으로 컨트랙트 배포를 마쳤습니다.");
      });

      ws.on("error", (err: { message: string }) => {
        console.error("❌ hardhat node 인식 실패, ", err.message);
        setTimeout(nodeHealthChecker, 1000);
      });
    })();

    // ✅ Hardhat 노드가 백그라운드로 넘어가지 않도록 `await` 사용
    await new Promise((resolve) => {
      hardhatProcess.on("close", resolve); // Hardhat 종료될 때까지 대기
    });
  },
);
