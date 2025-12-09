import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const isMessagesPage = location.pathname.startsWith('/messages');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Mobile Header */}
      <MobileHeader />

      {/* Main Content */}
      <main
        className={cn(
          "lg:ml-[72px] flex-1 flex flex-col min-h-0",
          isMessagesPage ? "pb-0" : "pb-16 lg:pb-0"
        )}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {!isMessagesPage && <BottomNav />}
    </div>
  );
}
