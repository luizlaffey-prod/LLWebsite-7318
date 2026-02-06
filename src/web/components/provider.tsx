import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import { Metadata } from "./metadata";

interface ProviderProps {
  children: React.ReactNode;
}

export function Provider({ children }: ProviderProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <Metadata />
      {children}
    </I18nextProvider>
  );
}