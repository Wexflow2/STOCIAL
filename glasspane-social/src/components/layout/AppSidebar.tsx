import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

const navItems = [
  {
    label: "home", path: "/", icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        {active && <path d="M9 22V12h6v10" fill="currentColor" stroke="none" />}
      </svg>
    )
  },
  {
    label: "explore", path: "/explore", icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    )
  },
  {
    label: "create", path: "/create", icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    )
  },
  {
    label: "stories", path: "/stories", icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="2" y1="7" x2="7" y2="7" />
        <line x1="2" y1="17" x2="7" y2="17" />
        <line x1="17" y1="17" x2="22" y2="17" />
        <line x1="17" y1="7" x2="22" y2="7" />
      </svg>
    )
  },
  {
    label: "notifications", path: "/notifications", icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    )
  },
  {
    label: "messages", path: "/messages", icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
      </svg>
    )
  },
  {
    label: "profile", path: "/profile", icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" fill={active ? "currentColor" : "none"} />
        <path d="M20 21a8 8 0 1 0-16 0" />
      </svg>
    )
  },
  {
    label: "settingsNav", path: "/settings", icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  },
];

export function AppSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const { dbUser, user } = useAuth();
  const { t } = useLocale();

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full z-50 glass-sidebar transition-all duration-300 ease-out",
          isExpanded ? "w-56" : "w-[72px]",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-glass-border gap-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
              <picture>
                <source srcSet="/sidebar-logo-dark.png" media="(prefers-color-scheme: dark)" />
                <img
                  src="/sidebar-logo-light.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </picture>
            </div>
            {isExpanded && (
              <span className="font-bold text-sm text-foreground">Sotiale</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 h-12 px-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  {item.icon(isActive)}
                </div>
                <span
                  className={cn(
                    "font-medium text-sm transition-all duration-300 whitespace-nowrap",
                    isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  )}
                >
                  {t(item.label)}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="p-3 border-t border-glass-border">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0 overflow-hidden">
              <img
                src={dbUser?.profile_picture_url || dbUser?.avatar_url || user?.photoURL || "https://via.placeholder.com/100"}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className={cn(
                "transition-all duration-300 min-w-0",
                isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              )}
            >
              <p className="text-sm font-medium text-foreground truncate">@{dbUser?.username || "usuario"}</p>
            </div>
          </div>
          <div className="flex justify-center mt-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-10 h-10 rounded-xl hover:bg-accent flex items-center justify-center text-foreground transition-colors"
              aria-label={isExpanded ? "Cerrar sidebar" : "Abrir sidebar"}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {isExpanded ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <line x1="4" y1="8" x2="20" y2="8" />
                    <line x1="4" y1="16" x2="20" y2="16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
