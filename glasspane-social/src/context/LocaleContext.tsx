import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type SupportedLang = "es" | "en" | "pt";

type LocaleContextType = {
  language: SupportedLang;
  setLanguage: (lang: SupportedLang) => void;
  t: (key: string) => string;
};

const SETTINGS_KEY = "stocial_settings";

const translations: Record<SupportedLang, Record<string, string>> = {
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
    home: "Inicio",
    explore: "Explorar",
    create: "Crear",
    stories: "Historias",
    profile: "Perfil",
    settingsNav: "Ajustes",
    yourStory: "Tu historia",
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
    home: "Home",
    explore: "Explore",
    create: "Create",
    stories: "Stories",
    profile: "Profile",
    settingsNav: "Settings",
    yourStory: "Your story",
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
    home: "Início",
    explore: "Explorar",
    create: "Criar",
    stories: "Stories",
    profile: "Perfil",
    settingsNav: "Configurações",
    yourStory: "Sua história",
  },
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLang>("es");

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(SETTINGS_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.language && ["es", "en", "pt"].includes(parsed.language)) {
          setLanguageState(parsed.language as SupportedLang);
        }
      }
    } catch (err) {
      console.error("Error hydrating language", err);
    }
  }, []);

  const setLanguage = (lang: SupportedLang) => {
    setLanguageState(lang);
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...parsed, language: lang }));
    } catch (err) {
      console.error("Error saving language", err);
    }
    document.documentElement.lang = lang;
  };

  const t = (key: string) => translations[language]?.[key] || translations.es[key] || key;

  const value = useMemo(() => ({ language, setLanguage, t }), [language]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
};

export const localeTranslations = translations;
