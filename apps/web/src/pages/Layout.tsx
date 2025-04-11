import { SidebarProvider, SidebarTrigger } from "@workspace/ui/components/shadcn-ui/sidebar";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/SideNavBar";

const Layout = () => {
   return (
      <div>
         <SidebarProvider>
            <AppSidebar />
            <main>
               <SidebarTrigger />
               <Outlet />
            </main>
         </SidebarProvider>
      </div>
   );
};

export default Layout;
