import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, Heart, User, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/explore", icon: Search, label: "Explorar" },
  { path: "/create", icon: PlusSquare, label: "Crear" },
  { path: "/notifications", icon: Heart, label: "Notificaciones" },
  { path: "/messages", icon: MessageCircle, label: "Mensajes" },
  { path: "/profile", icon: User, label: "Perfil" },
];

export function BottomNav() {
  const location = useLocation();
  const { dbUser, user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-card border-t border-glass-border backdrop-blur-xl bg-background/80">
      <div className="flex items-center justify-around h-16 px-2 safe-area-bottom">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
                "active:scale-95 transition-transform"
              )}
            >
              {item.path === "/profile" && dbUser?.profile_picture_url ? (
                <div className={cn(
                  "w-7 h-7 rounded-full overflow-hidden border-2 transition-all",
                  isActive ? "border-foreground scale-110" : "border-transparent"
                )}>
                  <img
                    src={dbUser.profile_picture_url || dbUser.avatar_url || user?.photoURL || "https://via.placeholder.com/100"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <Icon
                  size={26}
                  className={cn(
                    "transition-all",
                    isActive
                      ? "text-foreground scale-110"
                      : "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  fill={isActive && item.path === "/notifications" ? "currentColor" : "none"}
                />
              )}
              {isActive && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-foreground" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
