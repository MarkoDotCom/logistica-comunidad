import './styles.scss';

// URL de la app (Angular). En dev es localhost:4201; en producción se fija con VITE_APP_URL.
const appUrl = import.meta.env.VITE_APP_URL ?? 'http://localhost:4201/';
for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-app-link]')) {
  link.href = appUrl;
}
