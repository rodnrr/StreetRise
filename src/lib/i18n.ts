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

  // Instant-answer FAQ panel (Ask a Question)
  'booking.faq.title': 'Ask about this listing',
  'booking.faq.subtitle': "Try hours, distance, requirements, or contact info — we'll answer instantly from what we know.",
  'booking.faq.placeholder': 'e.g. How late are you open?',
  'booking.faq.noMatch': "We don't have an instant answer for that — send it to them below and they'll reply directly.",
  'booking.faq.stillAsk': 'Still want to ask them directly?',
  'booking.faq.fillIn': 'Fill this into my question below',
  'booking.faq.suggest.hours': 'Hours',
  'booking.faq.suggest.hoursQuery': 'What time do they open and close today?',
  'booking.faq.suggest.distance': 'Distance',
  'booking.faq.suggest.distanceQuery': 'How far is this from me?',
  'booking.faq.suggest.address': 'Address',
  'booking.faq.suggest.addressQuery': 'Where are they located?',
  'booking.faq.suggest.contact': 'Contact',
  'booking.faq.suggest.contactQuery': 'What is their phone number?',
  'booking.faq.suggest.requirements': 'Requirements',
  'booking.faq.suggest.requirementsQuery': 'Do I need an ID or referral, or can I just walk in?',
  'booking.faq.suggest.availability': 'Availability',
  'booking.faq.suggest.availabilityQuery': 'Do they have space available right now?',

  // Instant-answer FAQ: rule labels and generated answer sentences (@/lib/resourceFaq).
  // gender_policy/population_focus labels stay in mapFilters.ts and are NOT
  // translated here, matching how those same badges render English-only
  // everywhere else in the app (map chips, ResourceSheet, category pages).
  'faq.label.hours': 'Hours',
  'faq.label.availability': 'Availability',
  'faq.label.distance': 'Distance',
  'faq.label.location': 'Location',
  'faq.label.contact': 'Contact',
  'faq.label.eligibility': 'Who it serves',
  'faq.label.intake': 'Getting in',
  'faq.label.showers': 'Showers',
  'faq.label.restrooms': 'Restrooms',
  'faq.label.meals': 'Meals',
  'faq.label.laundry': 'Laundry',
  'faq.label.pets': 'Pets',
  'faq.label.accessibility': 'Accessibility',
  'faq.label.transit': 'Transit',
  'faq.label.languages': 'Languages',
  'faq.label.about': 'About',

  'faq.day.sunday': 'Sunday',
  'faq.day.monday': 'Monday',
  'faq.day.tuesday': 'Tuesday',
  'faq.day.wednesday': 'Wednesday',
  'faq.day.thursday': 'Thursday',
  'faq.day.friday': 'Friday',
  'faq.day.saturday': 'Saturday',

  'faq.common.callPhone': 'call {phone}',
  'faq.common.contactThem': 'contact them',

  'faq.hours.closedNotice': "They're currently marked closed — check before planning around this schedule.",
  'faq.hours.closedOn': "They're closed on {day}.",
  'faq.hours.openOn': 'On {day} they’re open {open}–{close}.',
  'faq.hours.noHoursFor': 'No hours are published for {day}.',
  'faq.hours.closedToday': "They're closed today ({day}).",
  'faq.hours.todayWindow': 'Today ({day}) they’re open {open}–{close}',
  'faq.hours.rightNowOpen': ' — open right now.',
  'faq.hours.rightNowClosed': ' — closed right now.',
  'faq.hours.openedYesterday': 'They opened yesterday ({day}) at {open} and are open until {close}',
  'faq.hours.yesterdayClosedSuffix': ', but they are currently marked closed.',
  'faq.hours.stillOpenLastNight': "They're currently open from last night's hours, until {close}.",

  'faq.distance.confidential': "This isn't a walk-in location, so distance doesn't apply — {contact} to get connected.",
  'faq.distance.noOrigin': "We don't have your location yet — share it on the map (the locate button) to see the distance here, or use Directions on the listing.",
  'faq.distance.result': '{name} is about {distance} from your current location.',

  'faq.location.hidden': "For safety, this address isn't published — {contact} for the location and intake details.",
  'faq.location.noWalkInAddress': "They don't publish a walk-in address — {contact} to get started.",
  'faq.location.result': "They're located at {address}.",

  'faq.contact.callPhone': 'call them at {phone}',
  'faq.contact.emailThem': 'email them at {email}',
  'faq.contact.visitWebsite': 'visit their website ({website})',
  'faq.contact.or': 'or',
  'faq.contact.wrap': 'You can {bits}.',

  'faq.eligibility.serves': 'Serves: {tags}',
  'faq.eligibility.ages': 'Ages {range}',

  'faq.intake.noWalkInsCallAhead': 'No walk-ins — call ahead',
  'faq.intake.noWalkInsContact': 'No walk-ins — contact them to arrange access',
  'faq.intake.walkInsAccepted': 'Walk-ins are accepted',
  'faq.intake.idRequired': 'ID is required',
  'faq.intake.noIdRequired': 'No ID required',
  'faq.intake.referralRequired': 'A referral is required',
  'faq.intake.noReferralRequired': 'No referral needed',
  'faq.intake.callBeforeVisiting': 'Call before visiting',
  'faq.intake.noNeedToCallFirst': 'No need to call first',

  'faq.availability.available': "They're currently marked open / available.",
  'faq.availability.limited': 'Availability is currently marked as limited.',
  'faq.availability.full': "They're currently marked full.",
  'faq.availability.closed': "They're currently marked closed.",
  'faq.availability.unknown': "Availability isn't currently confirmed for this listing.",
  'faq.availability.bedsKnown': '{available} of {total} beds are currently listed as available.',
  'faq.availability.bedsUnknown': "Bed availability isn't currently listed ({total} beds total).",
  'faq.availability.availableNoCount': "They're currently marked open / available, though the exact bed count isn't listed ({total} beds total).",
  'faq.availability.limitedNoCount': "Availability is currently marked as limited, though the exact bed count isn't listed ({total} beds total).",

  'faq.facility.showersYes': 'Yes, showers are available.',
  'faq.facility.showersNo': "They don't list showers as available.",
  'faq.facility.restroomsYes': 'Yes, restrooms are available.',
  'faq.facility.restroomsNo': "They don't list restrooms as available.",
  'faq.facility.mealsYes': 'Yes, meals are served here.',
  'faq.facility.mealsNo': "They don't list meals as served here.",
  'faq.facility.laundryYes': 'Yes, laundry is available.',
  'faq.facility.laundryNo': "They don't list laundry as available.",
  'faq.facility.petsYes': 'Yes, pets are welcome.',
  'faq.facility.petsNo': "They don't list themselves as pet-friendly.",
  'faq.facility.accessibilityYes': 'Yes, this location is wheelchair accessible.',
  'faq.facility.accessibilityNo': "They don't list wheelchair accessibility.",
  'faq.facility.transitYes': "Yes, it's near public transit.",
  'faq.facility.transitNo': "They don't list themselves as near public transit.",

  'faq.languages.spoken': 'Languages spoken: {list}.',
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

  // Panel de respuestas instantáneas (Hacer una Pregunta)
  'booking.faq.title': 'Pregunta sobre este lugar',
  'booking.faq.subtitle': 'Prueba con horarios, distancia, requisitos o datos de contacto — responderemos al instante con lo que sabemos.',
  'booking.faq.placeholder': 'Ej. ¿Hasta qué hora están abiertos?',
  'booking.faq.noMatch': 'No tenemos una respuesta instantánea para eso — envíala abajo y te responderán directamente.',
  'booking.faq.stillAsk': '¿Aún quieres preguntarles directamente?',
  'booking.faq.fillIn': 'Usar esto como mi pregunta abajo',
  'booking.faq.suggest.hours': 'Horario',
  'booking.faq.suggest.hoursQuery': '¿A qué hora abren y cierran hoy?',
  'booking.faq.suggest.distance': 'Distancia',
  'booking.faq.suggest.distanceQuery': '¿Qué tan lejos está de mí?',
  'booking.faq.suggest.address': 'Dirección',
  'booking.faq.suggest.addressQuery': '¿Dónde están ubicados?',
  'booking.faq.suggest.contact': 'Contacto',
  'booking.faq.suggest.contactQuery': '¿Cuál es su número de teléfono?',
  'booking.faq.suggest.requirements': 'Requisitos',
  'booking.faq.suggest.requirementsQuery': '¿Necesito identificación o referencia, o puedo llegar sin cita?',
  'booking.faq.suggest.availability': 'Disponibilidad',
  'booking.faq.suggest.availabilityQuery': '¿Tienen espacio disponible ahora mismo?',

  // Respuestas instantáneas del FAQ: etiquetas y oraciones generadas (@/lib/resourceFaq).
  'faq.label.hours': 'Horario',
  'faq.label.availability': 'Disponibilidad',
  'faq.label.distance': 'Distancia',
  'faq.label.location': 'Ubicación',
  'faq.label.contact': 'Contacto',
  'faq.label.eligibility': 'A quién atienden',
  'faq.label.intake': 'Cómo ingresar',
  'faq.label.showers': 'Duchas',
  'faq.label.restrooms': 'Baños',
  'faq.label.meals': 'Comidas',
  'faq.label.laundry': 'Lavandería',
  'faq.label.pets': 'Mascotas',
  'faq.label.accessibility': 'Accesibilidad',
  'faq.label.transit': 'Transporte',
  'faq.label.languages': 'Idiomas',
  'faq.label.about': 'Acerca de',

  'faq.day.sunday': 'domingo',
  'faq.day.monday': 'lunes',
  'faq.day.tuesday': 'martes',
  'faq.day.wednesday': 'miércoles',
  'faq.day.thursday': 'jueves',
  'faq.day.friday': 'viernes',
  'faq.day.saturday': 'sábado',

  'faq.common.callPhone': 'llama al {phone}',
  'faq.common.contactThem': 'contáctalos',

  'faq.hours.closedNotice': 'Actualmente están marcados como cerrados — confirma antes de planear tu visita según este horario.',
  'faq.hours.closedOn': 'Están cerrados el {day}.',
  'faq.hours.openOn': 'El {day} abren de {open} a {close}.',
  'faq.hours.noHoursFor': 'No hay horario publicado para el {day}.',
  'faq.hours.closedToday': 'Hoy ({day}) están cerrados.',
  'faq.hours.todayWindow': 'Hoy ({day}) abren de {open} a {close}',
  'faq.hours.rightNowOpen': ' — abiertos en este momento.',
  'faq.hours.rightNowClosed': ' — cerrados en este momento.',
  'faq.hours.openedYesterday': 'Abrieron ayer ({day}) a las {open} y están abiertos hasta las {close}',
  'faq.hours.yesterdayClosedSuffix': ', pero actualmente están marcados como cerrados.',
  'faq.hours.stillOpenLastNight': 'Todavía están abiertos por el horario de anoche, hasta las {close}.',

  'faq.distance.confidential': 'Este no es un lugar al que se puede llegar directamente, así que la distancia no aplica — {contact} para conectarte con ellos.',
  'faq.distance.noOrigin': 'Aún no tenemos tu ubicación — compártela en el mapa (el botón de ubicación) para ver la distancia aquí, o usa Direcciones en el listado.',
  'faq.distance.result': '{name} está a unos {distance} de tu ubicación actual.',

  'faq.location.hidden': 'Por seguridad, esta dirección no se publica — {contact} para conocer la ubicación y el proceso de admisión.',
  'faq.location.noWalkInAddress': 'No publican una dirección para visitas — {contact} para comenzar.',
  'faq.location.result': 'Están ubicados en {address}.',

  'faq.contact.callPhone': 'llamarlos al {phone}',
  'faq.contact.emailThem': 'escribirles a {email}',
  'faq.contact.visitWebsite': 'visitar su sitio web ({website})',
  'faq.contact.or': 'o',
  'faq.contact.wrap': 'Puedes {bits}.',

  'faq.eligibility.serves': 'Atienden a: {tags}',
  'faq.eligibility.ages': 'Edades {range}',

  'faq.intake.noWalkInsCallAhead': 'No se aceptan visitas sin cita — llama antes',
  'faq.intake.noWalkInsContact': 'No se aceptan visitas sin cita — contáctalos para coordinar el acceso',
  'faq.intake.walkInsAccepted': 'Se aceptan visitas sin cita',
  'faq.intake.idRequired': 'Se requiere identificación',
  'faq.intake.noIdRequired': 'No se requiere identificación',
  'faq.intake.referralRequired': 'Se requiere una referencia',
  'faq.intake.noReferralRequired': 'No se requiere referencia',
  'faq.intake.callBeforeVisiting': 'Llama antes de visitar',
  'faq.intake.noNeedToCallFirst': 'No es necesario llamar antes',

  'faq.availability.available': 'Actualmente están marcados como abiertos / disponibles.',
  'faq.availability.limited': 'La disponibilidad está marcada como limitada actualmente.',
  'faq.availability.full': 'Actualmente están marcados como llenos.',
  'faq.availability.closed': 'Actualmente están marcados como cerrados.',
  'faq.availability.unknown': 'La disponibilidad no está confirmada actualmente para este lugar.',
  'faq.availability.bedsKnown': '{available} de {total} camas están listadas como disponibles actualmente.',
  'faq.availability.bedsUnknown': 'La disponibilidad de camas no está listada actualmente ({total} camas en total).',
  'faq.availability.availableNoCount': 'Actualmente están marcados como abiertos / disponibles, aunque no se indica el número exacto de camas ({total} camas en total).',
  'faq.availability.limitedNoCount': 'La disponibilidad está marcada como limitada actualmente, aunque no se indica el número exacto de camas ({total} camas en total).',

  'faq.facility.showersYes': 'Sí, hay duchas disponibles.',
  'faq.facility.showersNo': 'No indican que haya duchas disponibles.',
  'faq.facility.restroomsYes': 'Sí, hay baños disponibles.',
  'faq.facility.restroomsNo': 'No indican que haya baños disponibles.',
  'faq.facility.mealsYes': 'Sí, aquí se sirven comidas.',
  'faq.facility.mealsNo': 'No indican que sirvan comidas aquí.',
  'faq.facility.laundryYes': 'Sí, hay lavandería disponible.',
  'faq.facility.laundryNo': 'No indican que haya lavandería disponible.',
  'faq.facility.petsYes': 'Sí, se admiten mascotas.',
  'faq.facility.petsNo': 'No indican que admitan mascotas.',
  'faq.facility.accessibilityYes': 'Sí, este lugar es accesible para sillas de ruedas.',
  'faq.facility.accessibilityNo': 'No indican accesibilidad para sillas de ruedas.',
  'faq.facility.transitYes': 'Sí, está cerca del transporte público.',
  'faq.facility.transitNo': 'No indican estar cerca del transporte público.',

  'faq.languages.spoken': 'Idiomas que hablan: {list}.',
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
