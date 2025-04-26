import React from "react";

import { SidebarProvider } from "@workspace/ui/components/shadcn-ui/sidebar";

import AppHeader from "@/components/_layout/Header";
import AppSidebar from "@/components/_layout/SideNavBar";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
   return (
      <SidebarProvider>
         <AppSidebar />
         <main className="relative min-h-dvh w-full">
            <AppHeader />
            <section className="h-full max-h-[calc(100dvh-4rem)] w-full">{children}</section>
         </main>
      </SidebarProvider>
   );
};

export default AppLayout;
