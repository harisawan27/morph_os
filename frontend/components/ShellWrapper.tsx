"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TempModeBanner from "./TempModeBanner";

// Pages that need their own vertical scroll (not the chat layout)
const SCROLL_PAGES = ["/settings", "/artifacts"];

export default function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const needsScroll = SCROLL_PAGES.some(p => pathname.startsWith(p));

  return (
    <>
      <Sidebar />
      <main
        className={`flex-1 h-screen-dvh min-w-0 md:pl-[60px] ${
          needsScroll ? "overflow-y-auto morph-scrollbar" : "overflow-hidden"
        }`}
      >
        {children}
      </main>
      <TempModeBanner />
    </>
  );
}
