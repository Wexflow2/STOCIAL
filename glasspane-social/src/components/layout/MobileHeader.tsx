import { useLocation } from "react-router-dom";
import { Bell, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Sotiale";
      case "/explore":
        return "Explorar";
      case "/notifications":
        return "Notificaciones";
      case "/messages":
        return "Mensajes";
      case "/profile":
        return "Perfil";
      case "/settings":
        return "Configuración";
      default:
        return "Sotiale";
    }
  };

  // Don't show on create page
  if (location.pathname === "/create") {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 lg:hidden glass-card rounded-none border-b border-glass-border backdrop-blur-xl bg-background/90 shadow-sm safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-lg font-bold">{getPageTitle()}</h1>
        
        <div className="flex items-center gap-3">
          {location.pathname === "/" && (
            <>
              <button
                onClick={() => navigate("/notifications")}
                className="p-2 hover:bg-accent rounded-full transition-colors relative"
              >
                <Bell size={22} strokeWidth={1.8} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button
                onClick={() => navigate("/messages")}
                className="p-2 hover:bg-accent rounded-full transition-colors"
              >
                <MessageCircle size={22} strokeWidth={1.8} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
