/**
 * Lightweight EN/ES internationalization for StreetRise's public UI chrome.
 *
 * Scope: static interface strings (nav, footer, homepage hero, map controls,
 * booking form). Database-driven content — resource names/descriptions, FAQ,
 * blog, category labels — is stored in English only and is NOT translated
 * here; it renders as-is regardless of language.
 *
 * Usage:
 *   const { t, lang, setLang } = useI18n()
 *   <span>{t('nav.findResources')}</span>
 *
 * A missing key falls back to English, then to the raw key, so a partially
 * translated string never renders blank.
 */
import { useLangStore } from '@/lib/store'

export type Lang = 'en' | 'es'

export const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
]

type Dict = Record<string, string>

const en: Dict = {
  // Nav / chrome
  'nav.findResources': 'Find Resources',
  'nav.workExchange': 'Work Exchange',
  'nav.donate': 'Donate',
  'nav.faq': 'FAQ',
  'nav.becomeProvider': 'Become a Provider',
  'nav.providerLogin': 'Provider Login',
  'nav.toggleMenu': 'Toggle menu',
  'nav.closeMenu': 'Close menu',
  'lang.switch': 'Switch language',
  'cta.getHelpNow': 'Get Help Now',
  'cta.getHelpAria': 'Get Help Now — find resources near you',

  // Footer
  'footer.brandBlurb': 'Free for everyone in need. Connecting people with real local services across Florida.',
  'footer.contactSupport': 'Contact & Support',
  'footer.contactPage': 'Contact page',
  'footer.company': 'Company',
  'footer.about': 'About',
  'footer.blog': 'Blog',
  'footer.communityVoices': 'Community Voices',
  'footer.partner': 'Partner With Us',
  'footer.forProviders': 'For Providers',
  'footer.providerBlurb': 'Are you a shelter, food pantry, clinic, or community org? List your services for free.',
  'footer.privacy': 'Privacy',
  'footer.terms': 'Terms',
  'footer.accessibility': 'Accessibility',

  // Homepage hero
  'home.eyebrow': 'Real-time local resources',
  'home.h1': 'Find Real Shelter, Food & Support in Tampa Bay, Orlando & Miami',
  'home.subhead': 'A free app that connects you to verified local resources — updated by the organizations that provide them.',
  'home.findHelp': 'Find Help',
  'home.donate': 'Give Hope (Donate)',
  'home.freeNoSignup': 'Free. No sign-up required.',

  // Map controls
  'map.homeAria': 'StreetRise home',
  'map.searchPlaceholder': 'Search by name, city, or ZIP',
  'map.searchAria': 'Search resources',
  'map.clearSearch': 'Clear search',
  'map.openFilters': 'Open filters',
  'map.findLocation': 'Find my location',
  'map.expandMap': 'Expand map',
  'map.shrinkMap': 'Shrink map',
  'map.fitResults': 'Fit map to results',
  'map.noMatch': 'No places match yet',
  'map.loadError': "Couldn't load resources.",
  'map.loadErrorHint': 'Check your connection and try again.',
  'map.retry': 'Retry',

  // Booking form
  'booking.backTo': 'Back to',
  'booking.askQuestion': 'Ask a Question',
  'booking.requestSpot': 'Request a Spot',
  'booking.requestHelp': 'Request Help',
  'booking.joinWaitlist': 'Join the Waitlist',
  'booking.questionNotice': 'Your question goes to this provider. Replies are not instant — call them if you need help today.',
  'booking.requestNotice': 'This is a request, not a confirmed reservation.',
  'booking.yourName': 'Your name',
  'booking.namePlaceholder': 'First and last name',
  'booking.phone': 'Phone',
  'booking.phonePlaceholder': 'Phone number',
  'booking.email': 'Email',
  'booking.emailPlaceholder': 'Email address',
  'booking.contactPreference': 'Contact preference',
  'booking.either': 'Either',
  'booking.bestContactTime': 'Best contact time',
  'booking.bestContactPlaceholder': 'Weekdays after 3 PM',
  'booking.partySize': 'Party size',
  'booking.dates': 'Dates',
  'booking.yourQuestion': 'Your question',
  'booking.needsDetails': 'Needs / details',
  'booking.questionPlaceholder': 'What would you like to ask them?',
  'booking.consent': 'I agree that StreetRise or the listed provider may contact me using the phone number or email I provide about this request.',
  'booking.sendingQuestion': 'Sending question…',
  'booking.sendingRequest': 'Sending request…',
  'booking.sendQuestion': 'Send Question',
  'booking.questionSent': 'Question sent!',
  'booking.requestSent': 'Request sent!',
  'booking.sentToQuestion': 'Your question has been sent to',
  'booking.sentToRequest': 'Your request has been sent to',
  'booking.replyNotInstant': 'A staff member will reply using the contact details you gave. Replies are not instant.',
  'booking.findMore': 'Find More Resources',
  'booking.returnHome': 'Return Home',
  // Booking validation messages
  'booking.err.name': 'Name required',
  'booking.err.email': 'Enter a valid email',
  'booking.err.consent': 'Contact consent is required',
  'booking.err.adult': 'At least 1 adult',
  'booking.err.contactRequired': 'Phone or email required',
  'booking.err.questionRequired': 'Type your question so the provider can answer it',
}

const es: Dict = {
  // Nav / chrome
  'nav.findResources': 'Buscar Recursos',
  'nav.workExchange': 'Intercambio de Trabajo',
  'nav.donate': 'Donar',
  'nav.faq': 'Preguntas',
  'nav.becomeProvider': 'Ser Proveedor',
  'nav.providerLogin': 'Acceso Proveedores',
  'nav.toggleMenu': 'Abrir menú',
  'nav.closeMenu': 'Cerrar menú',
  'lang.switch': 'Cambiar idioma',
  'cta.getHelpNow': 'Obtener Ayuda',
  'cta.getHelpAria': 'Obtener ayuda — encuentra recursos cerca de ti',

  // Footer
  'footer.brandBlurb': 'Gratis para todos los que lo necesitan. Conectamos a las personas con servicios locales reales en toda Florida.',
  'footer.contactSupport': 'Contacto y Ayuda',
  'footer.contactPage': 'Página de contacto',
  'footer.company': 'Organización',
  'footer.about': 'Acerca de',
  'footer.blog': 'Blog',
  'footer.communityVoices': 'Voces de la Comunidad',
  'footer.partner': 'Colabora con Nosotros',
  'footer.forProviders': 'Para Proveedores',
  'footer.providerBlurb': '¿Eres un refugio, despensa de alimentos, clínica u organización comunitaria? Publica tus servicios gratis.',
  'footer.privacy': 'Privacidad',
  'footer.terms': 'Términos',
  'footer.accessibility': 'Accesibilidad',

  // Homepage hero
  'home.eyebrow': 'Recursos locales en tiempo real',
  'home.h1': 'Encuentra refugio, comida y apoyo reales en Tampa Bay, Orlando y Miami',
  'home.subhead': 'Una aplicación gratuita que te conecta con recursos locales verificados, actualizados por las organizaciones que los ofrecen.',
  'home.findHelp': 'Buscar Ayuda',
  'home.donate': 'Da Esperanza (Donar)',
  'home.freeNoSignup': 'Gratis. Sin registro.',

  // Map controls
  'map.homeAria': 'Inicio de StreetRise',
  'map.searchPlaceholder': 'Busca por nombre, ciudad o código postal',
  'map.searchAria': 'Buscar recursos',
  'map.clearSearch': 'Borrar búsqueda',
  'map.openFilters': 'Abrir filtros',
  'map.findLocation': 'Encontrar mi ubicación',
  'map.expandMap': 'Ampliar mapa',
  'map.shrinkMap': 'Reducir mapa',
  'map.fitResults': 'Ajustar mapa a los resultados',
  'map.noMatch': 'Aún no hay lugares que coincidan',
  'map.loadError': 'No se pudieron cargar los recursos.',
  'map.loadErrorHint': 'Revisa tu conexión e inténtalo de nuevo.',
  'map.retry': 'Reintentar',

  // Booking form
  'booking.backTo': 'Volver a',
  'booking.askQuestion': 'Hacer una Pregunta',
  'booking.requestSpot': 'Solicitar un Lugar',
  'booking.requestHelp': 'Solicitar Ayuda',
  'booking.joinWaitlist': 'Unirse a la Lista de Espera',
  'booking.questionNotice': 'Tu pregunta va a este proveedor. Las respuestas no son inmediatas; llámalos si necesitas ayuda hoy.',
  'booking.requestNotice': 'Esto es una solicitud, no una reserva confirmada.',
  'booking.yourName': 'Tu nombre',
  'booking.namePlaceholder': 'Nombre y apellido',
  'booking.phone': 'Teléfono',
  'booking.phonePlaceholder': 'Número de teléfono',
  'booking.email': 'Correo electrónico',
  'booking.emailPlaceholder': 'Dirección de correo',
  'booking.contactPreference': 'Preferencia de contacto',
  'booking.either': 'Cualquiera',
  'booking.bestContactTime': 'Mejor hora de contacto',
  'booking.bestContactPlaceholder': 'Días laborables después de las 3 PM',
  'booking.partySize': 'Tamaño del grupo',
  'booking.dates': 'Fechas',
  'booking.yourQuestion': 'Tu pregunta',
  'booking.needsDetails': 'Necesidades / detalles',
  'booking.questionPlaceholder': '¿Qué te gustaría preguntarles?',
  'booking.consent': 'Acepto que StreetRise o el proveedor indicado pueda contactarme por el teléfono o correo que proporciono sobre esta solicitud.',
  'booking.sendingQuestion': 'Enviando pregunta…',
  'booking.sendingRequest': 'Enviando solicitud…',
  'booking.sendQuestion': 'Enviar Pregunta',
  'booking.questionSent': '¡Pregunta enviada!',
  'booking.requestSent': '¡Solicitud enviada!',
  'booking.sentToQuestion': 'Tu pregunta ha sido enviada a',
  'booking.sentToRequest': 'Tu solicitud ha sido enviada a',
  'booking.replyNotInstant': 'Un miembro del personal responderá usando los datos de contacto que diste. Las respuestas no son inmediatas.',
  'booking.findMore': 'Buscar Más Recursos',
  'booking.returnHome': 'Volver al Inicio',
  // Booking validation messages
  'booking.err.name': 'Se requiere el nombre',
  'booking.err.email': 'Introduce un correo válido',
  'booking.err.consent': 'Se requiere el consentimiento de contacto',
  'booking.err.adult': 'Al menos 1 adulto',
  'booking.err.contactRequired': 'Se requiere teléfono o correo',
  'booking.err.questionRequired': 'Escribe tu pregunta para que el proveedor pueda responderla',
}

export const translations: Record<Lang, Dict> = { en, es }

/** Translate a key in the given language, falling back to English then the key. */
export function translate(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key
}

/** Hook: current language, a setter, and a bound `t()` translator. */
export function useI18n() {
  const lang = useLangStore((s) => s.lang)
  const setLang = useLangStore((s) => s.setLang)
  const t = (key: string) => translate(lang, key)
  return { lang, setLang, t }
}
