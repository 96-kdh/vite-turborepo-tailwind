import { useAppKitAccount } from "@reown/appkit/react";
import {
   ChevronRight,
   Menu,
   Moon,
   MoreHorizontal,
   PanelLeft,
   PanelRight,
   Sun,
   TriangleAlert,
   Wallet,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { SupportChainIds } from "@workspace/hardhat";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/shadcn-ui";
import { Button } from "@workspace/ui/components/shadcn-ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/shadcn-ui/popover";
import { useSidebar } from "@workspace/ui/components/shadcn-ui/sidebar";

import { useAppKitWrap } from "@/hooks/useAppKitWrap";
import { useTheme } from "@/hooks/useTheme";
import { SupportedLanguage } from "@/lib";
import { shortenAddress } from "@/utils";

const AppHeader = () => {
   const { toggleSidebar, state, isMobile } = useSidebar();
   const { setTheme, theme } = useTheme();
   const { t, i18n } = useTranslation();
   const { open, chainId } = useAppKitWrap();

   const { address, isConnected } = useAppKitAccount(); // AppKit hook to get the account information

   const selectRef = React.useRef<HTMLSelectElement>(null);

   const handleClick = (e: React.MouseEvent<HTMLLabelElement>) => {
      e.preventDefault();
      // 직접 select에 포커스를 주고, mousedown 이벤트를 강제로 디스패치하여 네이티브 드롭다운이 열리도록 시도
      selectRef.current?.focus();
      const event = new MouseEvent("mousedown", {
         view: window,
         bubbles: true,
         cancelable: true,
      });
      selectRef.current?.dispatchEvent(event);
   };

   return (
      <header className="dark:bg-sidebar bg-sidebar border-b-1 flex h-16 w-full items-center justify-between px-4">
         {/* 왼쪽: 사이드 네비게이션 토글 아이콘 */}
         <button onClick={toggleSidebar} className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-600">
            {isMobile ? (
               <Menu className="h-6 w-6" />
            ) : state === "collapsed" ? (
               <PanelRight className="h-6 w-6" />
            ) : (
               <PanelLeft className="h-6 w-6" />
            )}
         </button>

         {/* 오른쪽: Wallet 버튼 및 '더보기' 팝오버 */}
         <div className="flex items-center space-x-4">
            {!(chainId in SupportChainIds) && (
               <TooltipProvider>
                  <Tooltip>
                     <TooltipTrigger id="open-network-modal">
                        <TriangleAlert color="red" />
                     </TooltipTrigger>
                     <TooltipContent>
                        <span>
                           현재 접속하신 네트워크는 지원되지 않는 네트워크입니다. 데이터 표기가 일부 올바르지 않을 수
                           있습니다.
                        </span>
                     </TooltipContent>
                  </Tooltip>
               </TooltipProvider>
            )}

            {/* 더보기 아이콘 및 팝오버 */}
            <Popover>
               <PopoverTrigger>
                  <div className="hover:bg-accent hover:text-accent-foreground rounded-md p-2 dark:hover:bg-gray-700">
                     <MoreHorizontal className="h-6 w-6" />
                  </div>
               </PopoverTrigger>
               <PopoverContent align="end" className="w-64 p-4">
                  {/* 실제 UI 구조 */}
                  <div className="space-y-6">
                     {/* 테마 설정 영역 */}
                     <div>
                        <div className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">테마</div>
                        <div className="flex items-center space-x-2">
                           {/* 자동 버튼 */}
                           <button
                              onClick={() => setTheme("system")}
                              className={`h-8 flex-1 rounded-full border text-sm font-medium ${
                                 theme === "system"
                                    ? "bg-gray-200 dark:bg-gray-700"
                                    : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                              } `}
                           >
                              Auto
                           </button>
                           {/* 라이트 버튼 */}
                           <button
                              onClick={() => setTheme("light")}
                              className={`flex h-8 flex-1 items-center justify-center gap-1 rounded-full border text-sm font-medium ${
                                 theme === "light"
                                    ? "bg-gray-200 dark:bg-gray-700"
                                    : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                              } `}
                           >
                              <Sun className="h-4 w-4" />
                           </button>
                           {/* 다크 버튼 */}
                           <button
                              onClick={() => setTheme("dark")}
                              className={`flex h-8 flex-1 items-center justify-center gap-1 rounded-full border text-sm font-medium ${
                                 theme === "dark"
                                    ? "bg-gray-200 dark:bg-gray-700"
                                    : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                              } `}
                           >
                              <Moon className="h-4 w-4" />
                           </button>
                        </div>
                     </div>

                     {/* 언어 설정 영역 */}
                     <label
                        onClick={handleClick}
                        className="relative flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                     >
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("lang")}</span>
                        <div className="flex items-center space-x-1">
                           <span className="text-sm text-gray-700 dark:text-gray-300">{t(i18n.language)}</span>
                           <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <select
                           ref={selectRef}
                           id="language"
                           defaultValue={i18n.language}
                           className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                           onChange={(e) => i18n.changeLanguage(e.target.value)}
                        >
                           {Object.values(SupportedLanguage).map((language) => {
                              return (
                                 <option key={language} value={language}>
                                    {t(language)}
                                 </option>
                              );
                           })}
                        </select>
                     </label>
                  </div>
               </PopoverContent>
            </Popover>

            {/* Wallet 연결 버튼 */}

            <Button variant="brand" className="flex items-center px-4 py-2" onClick={() => open()}>
               {isConnected && address ? (
                  shortenAddress(address)
               ) : (
                  <>
                     <Wallet className="mr-2 h-5 w-5" />
                     Connect Wallet
                  </>
               )}
            </Button>
         </div>
      </header>
   );
};

export default AppHeader;
