import { network } from "hardhat";
import { spawn } from "child_process";
import WebSocket from "ws";
import readline from "readline-sync";

import { SupportChainIds } from "./types";

(async function main() {
  console.log("run");

  const chainId = network.config.chainId as SupportChainIds;
  console.log(chainId);
  // if (chainId === SupportChainIds.LOCALHOST) {
  //   await network.provider.send("evm_setIntervalMining", [1000]);
  // }
  //
  // console.log(await network.provider.send("eth_blockNumber"));
  // await network.provider.send("evm_mine");
  // console.log(await network.provider.send("eth_blockNumber"));

  const process = spawn("npx", ["hardhat", "node"]);

  process.stdout.on("data", (data) => {
    console.log(`Output: ${data}`);
  });

  process.stderr.on("data", (data) => {
    console.error(`Error: ${data}`);
  });

  process.on("close", (code) => {
    console.log(`Process exited with code ${code}`);
  });

  console.log("run2");

  function tick() {
    try {
      const ws = new WebSocket("ws://localhost:8545");

      ws.on("open", () => {
        console.log("✅ WebSocket 서버가 정상 실행되었습니다!");
        ws.close();

        let answer = "";

        answer = readline.question(`\n진행하시겠습니까 ? (Y/N) `);

        if (answer !== "Y") console.log("\n실행하지 않습니다. 종료합니다.");
        else console.log("실행한 후 종료합니다.");
      });

      ws.on("error", (err: { message: any }) => {
        console.error("❌ WebSocket 연결 실패:", err.message);
        setTimeout(tick, 1000);
      });
    } catch (err) {
      console.error(err);
    }
  }

  tick();
})();
