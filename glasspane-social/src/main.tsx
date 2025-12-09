import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { LocaleProvider } from "@/context/LocaleContext";

const SETTINGS_KEY = "stocial_settings";
const DEFAULT_SETTINGS = {
  theme: "light",
  language: "es",
  textScale: 1,
  highContrast: false,
};

const bootstrapPreferences = () => {
  const root = document.documentElement;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const settings = { ...DEFAULT_SETTINGS, ...parsed };

    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.lang = settings.language || "es";
    root.style.fontSize = `${16 * (settings.textScale || 1)}px`;

    if (settings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
  } catch (err) {
    console.error("Error applying stored preferences", err);
  }
};

bootstrapPreferences();

createRoot(document.getElementById("root")!).render(
  <LocaleProvider>
    <App />
  </LocaleProvider>
);
