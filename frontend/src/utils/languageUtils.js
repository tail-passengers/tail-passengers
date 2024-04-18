export function getCurrentLanguage() {
  return (
    document.cookie.replace(
      /(?:(?:^|.*;\s*)language\s*=\s*([^;]*).*$)|^.*$/,
      "$1"
    ) || "en"
  );
}

export function setLanguageCookie(language) {
  document.cookie = `language=${language}`;
}

export function changeLanguage(language) {
  setLanguageCookie(language);
  const languageChangeEvent = new Event("languageChange");
  window.dispatchEvent(languageChangeEvent);
}
