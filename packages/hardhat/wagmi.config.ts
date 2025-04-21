import { defineConfig } from "@wagmi/cli";
import fs from "fs";
import path from "path";

// 특정 디렉토리 내의 모든 .sol 파일을 재귀적으로 찾는 함수
function findSolFiles(dir: string): string[] {
   let results: string[] = [];
   const list = fs.readdirSync(dir, { withFileTypes: true });

   list.forEach((dirent) => {
      const fullPath = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
         results = results.concat(findSolFiles(fullPath));
      } else if (dirent.isFile() && !dirent.name.endsWith("dbg.json") && dirent.name.endsWith(".json")) {
         results.push(fullPath);
      }
   });

   return results;
}

// artifacts/contracts 디렉토리에서 모든 .sol 파일 찾기
const solFiles = findSolFiles("./artifacts/contracts");

// 각 .sol 파일에 대해 ABI 추출
const contracts = solFiles
   .map((filePath) => {
      const artifact = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return {
         name: artifact.contractName,
         abi: artifact.abi,
      };
   })
   .filter((v) => v.name && v.abi);

export default defineConfig({
   out: "script/constants/abis.ts",
   contracts,
});
