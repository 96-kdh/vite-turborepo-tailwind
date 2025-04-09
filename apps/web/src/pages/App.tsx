import { Routes, Route } from "react-router-dom";
import AppLayout from "./Layout";

import Order from "@/pages/Order";

function App() {
   return (
      <Routes>
         <Route element={<AppLayout />}>
            <Route path="/" element={<Order />} />
         </Route>
      </Routes>
   );
}

export default App;
