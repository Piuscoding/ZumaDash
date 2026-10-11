import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { translate, LANG_OPTIONS, getDict } from '../i18n/translations';

const STORAGE_KEY = 'zumadash_lang';

const I18nContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  langs: LANG_OPTIONS,
  dict: getDict('en'),
});

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ['en', 'ha', 'yo', 'pcm'].includes(saved)) return saved;
    } catch (_) {}
    return 'en';
  });

  const setLang = useCallback((code) => {
    const next = ['en', 'ha', 'yo', 'pcm'].includes(code) ? code : 'en';
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (_) {}
    try {
      document.documentElement.lang = next === 'pcm' ? 'en' : next;
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = lang === 'pcm' ? 'en' : lang;
    } catch (_) {}
  }, [lang]);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t, langs: LANG_OPTIONS, dict: getDict(lang) }),
    [lang, setLang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);

export default I18nContext;
