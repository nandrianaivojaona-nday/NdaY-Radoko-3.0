
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Language } from './types';
import * as translations from './translations';

type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
  /** True when this locale’s clinical strings are still drafts. */
  isClinicalDraft: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: TranslationKey): string => {
    return (translations as any)[language]?.[key] ?? translations.en[key] ?? key;
  };

  const isClinicalDraft = language !== 'en' && language !== 'fr';


  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isClinicalDraft }}>
      {children}
    </LanguageContext.Provider>
  );
};
export const useTranslations = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslations must be used within a LanguageProvider');
  return context;
};
