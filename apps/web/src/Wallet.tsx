import { useState } from "react";

import { ActionButtonList } from "./components/ActionButtonList";
import { SmartContractActionButtonList } from "./components/SmartContractActionButtonList";
import { InfoList } from "./components/InfoList";

function App() {
  const [transactionHash, setTransactionHash] = useState<
    `0x${string}` | undefined
  >(undefined);
  const [signedMsg, setSignedMsg] = useState("");
  const [balance, setBalance] = useState("");

  const receiveHash = (hash: `0x${string}`) => {
    setTransactionHash(hash); // Update the state with the transaction hash
  };

  const receiveSignedMsg = (signedMsg: string) => {
    setSignedMsg(signedMsg); // Update the state with the transaction hash
  };

  const receivebalance = (balance: string) => {
    setBalance(balance);
  };

  return (
    <>
      <button id="open-connect-modal">Open Modal Custom Button</button>
      <button id="open-network-modal">Open Networks Custom Button</button>
      <appkit-button />
      <ActionButtonList
        sendHash={receiveHash}
        sendSignMsg={receiveSignedMsg}
        sendBalance={receivebalance}
      />
      <SmartContractActionButtonList />
      <div className="advice">
        <p>
          This projectId only works on localhost. <br />
          Go to{" "}
          <a
            href="https://cloud.reown.com"
            target="_blank"
            className="link-button"
            rel="Reown Cloud"
          >
            Reown Cloud
          </a>{" "}
          to get your own.
        </p>
      </div>
      <InfoList
        hash={transactionHash}
        signedMsg={signedMsg}
        balance={balance}
      />
    </>
  );
}

export default App;
