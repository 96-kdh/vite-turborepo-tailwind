import { createRoot } from "react-dom/client";

import "@repo/tailwind-config/main.css";
import Action from "./action.js";

const App = () => <Action />;

createRoot(document.getElementById("app")!).render(<App />);
