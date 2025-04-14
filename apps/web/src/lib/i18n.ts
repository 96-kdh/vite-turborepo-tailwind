import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export enum SupportedLanguage {
   en = "en",
   ko = "ko",
}

// 번역 리소스 정의
const resources = {
   [SupportedLanguage.en]: {
      translation: {
         lang: "Language",
         en: "English",
         ko: "Korean",
      },
   },
   [SupportedLanguage.ko]: {
      translation: {
         lang: "언어",
         en: "영어",
         ko: "한국어",
      },
   },
};

i18n
   // 브라우저 언어 감지 플러그인 사용 (옵션)
   .use(LanguageDetector)
   // react-i18next 바인딩 적용
   .use(initReactI18next)
   .init({
      resources,
      fallbackLng: "en", // 감지 실패 시 사용할 기본 언어
      debug: true, // 개발 단계에서 콘솔에 디버그 정보를 출력 (배포 시 false)
      interpolation: {
         escapeValue: false, // React는 기본적으로 XSS 공격에 안전함
      },
   });

export default i18n;
