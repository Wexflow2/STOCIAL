import { useState, useEffect, useMemo } from "react";
import {
  User,
  Bell,
  Lock,
  Palette,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Shield,
  Accessibility,
  ArrowLeft,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { useLocale, localeTranslations } from "@/context/LocaleContext";

type NotificationPrefs = {
  push: boolean;
  email: boolean;
  messages: boolean;
};

type LocalSettings = {
  theme: "light" | "dark";
  language: string;
  textScale: number;
  highContrast: boolean;
  notifications: NotificationPrefs;
   privacy: {
    showStatus: boolean;
    allowTags: boolean;
    suggestProfile: boolean;
  };
};

const SETTINGS_KEY = "stocial_settings";

const DEFAULT_SETTINGS: LocalSettings = {
  theme: "light",
  language: "es",
  textScale: 1,
  highContrast: false,
  notifications: {
    push: true,
    email: true,
    messages: true,
  },
  privacy: {
    showStatus: true,
    allowTags: true,
    suggestProfile: true,
  },
};

const translations: Record<string, Record<string, string>> = {
  es: {
    settings: "Configuración",
    darkMode: "Modo oscuro",
    activated: "Activado",
    deactivated: "Desactivado",
    appearance: "Apariencia",
    themeLanguage: "Tema, idioma",
    language: "Idioma",
    theme: "Tema",
    light: "Claro",
    dark: "Oscuro",
    notifications: "Notificaciones",
    push: "Push",
    email: "Email",
    messages: "Mensajes",
    accessibility: "Accesibilidad",
    textSize: "Tamaño de texto",
    highContrast: "Alto contraste",
    moreLegibility: "Más legibilidad en fondos y bordes.",
    privacy: "Privacidad",
    privateAccount: "Cuenta privada",
    publicAccount: "Cuenta pública",
    privacyDesc: "Cuando tu cuenta es privada, solo las personas que apruebas pueden ver tus publicaciones y seguidores.",
    account: "Cuenta",
    editProfile: "Editar perfil",
    editProfileDesc: "Nombre, bio, foto de perfil",
    help: "Ayuda",
    helpDesc: "Centro de ayuda, reportar problema",
    back: "Volver",
    status: "Mostrar actividad",
    tags: "Permitir etiquetas",
    suggest: "Aparecer en recomendaciones",
    appearancePage: "Personaliza colores y lenguaje de la app.",
    notificationsPage: "Gestiona cómo te avisamos.",
    accessibilityPage: "Ajustes de lectura y contraste.",
    logout: "Cerrar sesión",
    modeLabel: "Modo",
    languageSaved: "Idioma guardado",
  },
  en: {
    settings: "Settings",
    darkMode: "Dark mode",
    activated: "On",
    deactivated: "Off",
    appearance: "Appearance",
    themeLanguage: "Theme, language",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    notifications: "Notifications",
    push: "Push",
    email: "Email",
    messages: "Messages",
    accessibility: "Accessibility",
    textSize: "Text size",
    highContrast: "High contrast",
    moreLegibility: "Better readability on backgrounds and borders.",
    privacy: "Privacy",
    privateAccount: "Private account",
    publicAccount: "Public account",
    privacyDesc: "Only approved people can see your posts and followers when private.",
    account: "Account",
    editProfile: "Edit profile",
    editProfileDesc: "Name, bio, profile photo",
    help: "Help",
    helpDesc: "Help center, report a problem",
    back: "Back",
    status: "Show activity status",
    tags: "Allow tags",
    suggest: "Show in suggestions",
    appearancePage: "Customize colors and language.",
    notificationsPage: "Manage how we notify you.",
    accessibilityPage: "Reading and contrast settings.",
    logout: "Log out",
    modeLabel: "Mode",
    languageSaved: "Language saved",
  },
  pt: {
    settings: "Configurações",
    darkMode: "Modo escuro",
    activated: "Ativado",
    deactivated: "Desativado",
    appearance: "Aparência",
    themeLanguage: "Tema, idioma",
    language: "Idioma",
    theme: "Tema",
    light: "Claro",
    dark: "Escuro",
    notifications: "Notificações",
    push: "Push",
    email: "Email",
    messages: "Mensagens",
    accessibility: "Acessibilidade",
    textSize: "Tamanho do texto",
    highContrast: "Alto contraste",
    moreLegibility: "Mais legibilidade em fundos e bordas.",
    privacy: "Privacidade",
    privateAccount: "Conta privada",
    publicAccount: "Conta pública",
    privacyDesc: "Somente pessoas aprovadas podem ver suas publicações e seguidores quando privada.",
    account: "Conta",
    editProfile: "Editar perfil",
    editProfileDesc: "Nome, bio, foto de perfil",
    help: "Ajuda",
    helpDesc: "Central de ajuda, reportar problema",
    back: "Voltar",
    status: "Mostrar atividade",
    tags: "Permitir marcações",
    suggest: "Aparecer em sugestões",
    appearancePage: "Personalize cores e idioma.",
    notificationsPage: "Gerencie como notificamos você.",
    accessibilityPage: "Configurações de leitura e contraste.",
    logout: "Sair",
    modeLabel: "Modo",
    languageSaved: "Idioma salvo",
  },
};

const Settings = () => {
  const { dbUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLocale();
  const prefersDark = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }, []);

  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const [isPrivate, setIsPrivate] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [currentSection, setCurrentSection] = useState<"main" | "privacy" | "notifications" | "appearance" | "accessibility">("main");

  const persistSettings = (next: LocalSettings) => {
    setSettings(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    }
    if (next.language !== language) {
      setLanguage(next.language as any);
    }
  };

  useEffect(() => {
    // Hydrate settings
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(SETTINGS_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        const hydrated = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications || {}) },
          privacy: { ...DEFAULT_SETTINGS.privacy, ...(parsed.privacy || {}) },
        };
        persistSettings(hydrated);
        if (hydrated.language && hydrated.language !== language) {
          setLanguage(hydrated.language as any);
        }
      } else {
        persistSettings({
          ...DEFAULT_SETTINGS,
          theme: prefersDark ? "dark" : "light",
        });
      }
    } catch (err) {
      console.error("Error loading settings", err);
      persistSettings(DEFAULT_SETTINGS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dbUser) {
      setIsPrivate(dbUser.is_private || false);
    }
  }, [dbUser]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.lang = settings.language || "es";
    root.style.fontSize = `${16 * settings.textScale}px`;

    if (settings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
  }, [settings]);

  const toggleTheme = () => {
    persistSettings({
      ...settings,
      theme: settings.theme === "dark" ? "light" : "dark",
    });
  };

  const togglePrivacy = async () => {
    if (!dbUser?.id) return;
    
    setSavingPrivacy(true);
    try {
      const response = await fetch(`http://localhost:5000/api/users/${dbUser.id}/privacy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_private: !isPrivate })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setIsPrivate(updatedUser.is_private);
        await refreshUser();
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2 text-muted-foreground mb-6">
      <button
        onClick={() => setCurrentSection("main")}
        className="p-2 rounded-lg hover:bg-accent/60 transition-colors"
        aria-label={t("back")}
      >
        <ArrowLeft size={18} />
      </button>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/70 text-muted-foreground ml-auto">
        {t("languageSaved")}: {settings.language.toUpperCase()}
      </span>
    </div>
  );

  const renderPrivacySection = () => (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
        <SectionHeader title={t("privacy")} />
        <h1 className="text-2xl font-bold">{t("privacy")}</h1>
        <p className="text-sm text-muted-foreground">{t("privacyDesc")}</p>

        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{t("privacy")}</p>
              <p className="text-sm text-muted-foreground">
                {isPrivate ? t("privateAccount") : t("publicAccount")}
              </p>
            </div>
            <button
              onClick={togglePrivacy}
              disabled={savingPrivacy}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative flex-shrink-0",
                isPrivate ? "bg-foreground" : "bg-muted",
                savingPrivacy && "opacity-60 cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full transition-all",
                  isPrivate ? "right-1 bg-background" : "left-1 bg-card"
                )}
              />
            </button>
          </div>
          {[
            { key: "showStatus", label: t("status") },
            { key: "allowTags", label: t("tags") },
            { key: "suggestProfile", label: t("suggest") },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <p className="text-sm font-medium">{item.label}</p>
              <button
                onClick={() =>
                  persistSettings({
                    ...settings,
                    privacy: {
                      ...settings.privacy,
                      [item.key]: !settings.privacy[item.key as keyof LocalSettings["privacy"]],
                    },
                  })
                }
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  settings.privacy[item.key as keyof LocalSettings["privacy"]] ? "bg-foreground" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-5 h-5 rounded-full transition-all",
                    settings.privacy[item.key as keyof LocalSettings["privacy"]] ? "right-1 bg-background" : "left-1 bg-card"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );

  const renderNotificationsSection = () => (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
        <SectionHeader title={t("notifications")} />
        <h1 className="text-2xl font-bold">{t("notifications")}</h1>
        <p className="text-sm text-muted-foreground">{t("notificationsPage")}</p>

        <div className="glass-card p-4 space-y-2">
          {[
            { key: "push", label: t("push") },
            { key: "email", label: t("email") },
            { key: "messages", label: t("messages") },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <p className="text-sm font-medium">{item.label}</p>
              <button
                onClick={() =>
                  persistSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      [item.key]: !settings.notifications[item.key as keyof NotificationPrefs],
                    },
                  })
                }
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  settings.notifications[item.key as keyof NotificationPrefs] ? "bg-foreground" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-5 h-5 rounded-full transition-all",
                    settings.notifications[item.key as keyof NotificationPrefs] ? "right-1 bg-background" : "left-1 bg-card"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );

  const renderAppearanceSection = () => (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
        <SectionHeader title={t("appearance")} />
        <h1 className="text-2xl font-bold">{t("appearance")}</h1>
        <p className="text-sm text-muted-foreground">{t("appearancePage")}</p>

        <div className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
              <div>
                <p className="font-semibold">{t("darkMode")}</p>
                <p className="text-sm text-muted-foreground">
                  {settings.theme === "dark" ? t("activated") : t("deactivated")}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                settings.theme === "dark" ? "bg-foreground" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full transition-all",
                  settings.theme === "dark" ? "right-1 bg-background" : "left-1 bg-card"
                )}
              />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("language")}</p>
            <div className="glass-input rounded-lg px-3 py-2">
              <select
                value={settings.language}
                onChange={(e) =>
                  persistSettings({
                    ...settings,
                    language: e.target.value,
                  })
                }
                className="bg-transparent outline-none w-full text-sm"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("theme")}</p>
            <div className="flex gap-2">
              {[
                { id: "light", label: t("light") },
                { id: "dark", label: t("dark") },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => persistSettings({ ...settings, theme: option.id as "light" | "dark" })}
                  className={cn(
                    "flex-1 border rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                    settings.theme === option.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );

  const renderAccessibilitySection = () => (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
        <SectionHeader title={t("accessibility")} />
        <h1 className="text-2xl font-bold">{t("accessibility")}</h1>
        <p className="text-sm text-muted-foreground">{t("accessibilityPage")}</p>

        <div className="glass-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <p>{t("textSize")}</p>
              <span className="text-muted-foreground">{Math.round(settings.textScale * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.9}
              max={1.2}
              step={0.05}
              value={settings.textScale}
              onChange={(e) =>
                persistSettings({ ...settings, textScale: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{t("highContrast")}</p>
              <p className="text-xs text-muted-foreground">{t("moreLegibility")}</p>
            </div>
            <button
              onClick={() => persistSettings({ ...settings, highContrast: !settings.highContrast })}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                settings.highContrast ? "bg-foreground" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full transition-all",
                  settings.highContrast ? "right-1 bg-background" : "left-1 bg-card"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );

  if (currentSection === "privacy") return renderPrivacySection();
  if (currentSection === "notifications") return renderNotificationsSection();
  if (currentSection === "appearance") return renderAppearanceSection();
  if (currentSection === "accessibility") return renderAccessibilitySection();

  const settingsGroups = [
    {
      title: t("account"),
      items: [
        { 
          icon: User, 
          label: t("editProfile"), 
          description: t("editProfileDesc"),
          onClick: () => navigate('/profile')
        },
        { 
          icon: Lock, 
          label: t("privacy"),
          description: isPrivate ? t("privateAccount") : t("publicAccount"),
          onClick: () => setCurrentSection("privacy")
        },
        { 
          icon: Bell, 
          label: t("notifications"),
          description: t("notificationsPage"),
          onClick: () => setCurrentSection("notifications")
        },
      ],
    },
    {
      title: t("appearance"),
      items: [
        { 
          icon: Palette, 
          label: t("appearance"), 
          description: t("themeLanguage"),
          onClick: () => setCurrentSection("appearance")
        },
      ],
    },
    {
      title: t("accessibility"),
      items: [
        { 
          icon: Accessibility, 
          label: t("accessibility"), 
          description: t("accessibilityPage"),
          onClick: () => setCurrentSection("accessibility")
        },
      ],
    },
    {
      title: t("help"),
      items: [
        { icon: HelpCircle, label: t("help"), description: t("helpDesc") },
      ],
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center gap-3 mb-2 text-muted-foreground">
          <span className="text-sm">{t("darkMode")}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/70 text-muted-foreground">
            {settings.theme === "dark" ? t("activated") : t("deactivated")}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-6">{t("settings")}</h1>

        <div className="space-y-6">
          {/* Theme Toggle */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {settings.theme === "dark" ? <Moon size={22} /> : <Sun size={22} />}
                <div>
                  <p className="font-medium">{t("darkMode")}</p>
                  <p className="text-sm text-muted-foreground">
                    {settings.theme === "dark" ? t("activated") : t("deactivated")}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  settings.theme === "dark" ? "bg-foreground" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-5 h-5 rounded-full transition-all",
                    settings.theme === "dark" ? "right-1 bg-background" : "left-1 bg-card"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Settings Groups */}
          {settingsGroups.map((group) => (
            <div key={group.title} className="glass-card overflow-hidden">
              <div className="px-4 py-3 bg-accent/50">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {group.title}
                </h2>
              </div>
              <div className="divide-y divide-border">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <item.icon size={22} className="text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className="glass-card w-full flex items-center gap-4 p-4 text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={22} />
            <span className="font-medium">{t("logout")}</span>
          </button>

          {/* Version */}
          <p className="text-center text-sm text-muted-foreground">
            Sotiale v1.0.0
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
