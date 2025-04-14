import { useEffect } from "react";
import { createAppKit } from "@reown/appkit/react";

import { generalConfig, wagmiAdapter } from "@/lib";
import AppSidebar from "@/components/_layout/SideNavBar";
import AppHeader from "@/components/_layout/Header";

import { SidebarProvider } from "@workspace/ui/components/shadcn-ui/sidebar";

// Create modal
const modal = createAppKit({
   ...generalConfig,
   adapters: [wagmiAdapter],
   features: {
      analytics: true, // Optional - defaults to your Cloud configuration
   },
});

const AppLayout = ({ children }: { children: React.ReactNode }) => {
   useEffect(() => {
      const openConnectModalBtn = document.getElementById("open-connect-modal");
      const openNetworkModalBtn = document.getElementById("open-network-modal");

      openConnectModalBtn?.addEventListener("click", () => modal.open());
      openNetworkModalBtn?.addEventListener("click", () => modal.open({ view: "Networks" }));
   }, []);

   return (
      <div>
         <SidebarProvider>
            <AppSidebar />
            <main className="w-full">
               <AppHeader />
               {children}
            </main>
         </SidebarProvider>
      </div>
   );
};

export default AppLayout;
