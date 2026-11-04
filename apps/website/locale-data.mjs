export const LOCALES = ['en', 'es'];
export const DEFAULT_LOCALE = 'en';

export const PAGE_SEO = {
  home: {
    en: { title: 'Travel and parcels | Encore Transport', description: 'Plan your next trip, explore published routes and follow your parcel with Encore Transport.' },
    es: { title: 'Viajes y paquetería | Encore Transport', description: 'Planifica tu próximo viaje, descubre rutas y sigue tus encomiendas con Encore Transport.' },
  },
  routes: {
    en: { title: 'Routes and destinations | Encore Transport', description: 'Explore published routes, destinations, departure points and schedules from Encore Transport.' },
    es: { title: 'Rutas y destinos | Encore Transport', description: 'Consulta rutas, destinos, horarios publicados y terminales de Encore Transport.' },
  },
  trips: {
    en: { title: 'Find a trip | Encore Transport', description: 'Search Encore Transport departures by origin, destination, date and passengers.' },
    es: { title: 'Buscar viajes | Encore Transport', description: 'Busca salidas de Encore Transport por origen, destino, fecha y pasajeros.' },
  },
  packages: {
    en: { title: 'Parcel services | Encore Transport', description: 'Learn about parcel requirements, pricing and tracking with Encore Transport.' },
    es: { title: 'Paquetería | Encore Transport', description: 'Información, requisitos y tarifas de paquetería Encore Transport.' },
  },
  services: {
    en: { title: 'Services | Encore Transport', description: 'Discover Encore Transport services for regional travel and parcel delivery.' },
    es: { title: 'Servicios | Encore Transport', description: 'Conoce los servicios públicos de Encore Transport para viajes y paquetería.' },
  },
  live: {
    en: { title: 'Encore Live | Encore Transport', description: 'View authorized recent network locations with Encore Live.' },
    es: { title: 'Encore Live | Encore Transport', description: 'Consulta Encore Live y las ubicaciones autorizadas de la red Encore Transport.' },
  },
  about: {
    en: { title: 'About Encore Transport', description: 'Learn about the purpose and service approach of Encore Transport.' },
    es: { title: 'Nosotros | Encore Transport', description: 'Conoce el propósito y la forma de trabajar de Encore Transport.' },
  },
  contact: {
    en: { title: 'Contact | Encore Transport', description: 'Find the right way to get help before you travel or send a parcel.' },
    es: { title: 'Contacto | Encore Transport', description: 'Encuentra cómo contactar a Encore Transport antes de viajar o enviar un paquete.' },
  },
  help: {
    en: { title: 'Help | Encore Transport', description: 'Answers about trips, seats, tickets, parcels and accessibility at Encore Transport.' },
    es: { title: 'Ayuda | Encore Transport', description: 'Preguntas frecuentes sobre viajes, asientos, boletos, paquetería y accesibilidad en Encore Transport.' },
  },
};

export const COPY = {
  en: {
    nav: { home: 'Home', trips: 'Trips', packages: 'Packages', tracking: 'Tracking', company: 'Company & help', signIn: 'Sign in', myTrips: 'My trips', language: 'Language', open: 'Open navigation', close: 'Close navigation' },
    travel: { routes: 'Routes and destinations', routesHint: 'Explore published routes', search: 'Find a trip', searchHint: 'Schedules and available seats', terminals: 'Terminals', terminalsHint: 'Departure points along the route' },
    packages: { info: 'Parcel information', infoHint: 'Requirements and process', services: 'Services', servicesHint: 'Travel and shipping in one place', track: 'Track a parcel', trackHint: 'Check a recorded update' },
    tracking: { live: 'Encore Live', liveHint: 'Authorized network locations', packages: 'Parcel tracking', packagesHint: 'Track by reference' },
    company: { about: 'About us', aboutHint: 'Our purpose and approach', contact: 'Contact', contactHint: 'Ways to get help', help: 'Frequently asked questions', helpHint: 'Answers for planning' },
    footer: { lead: 'Regional travel and clear tracking, from search to ticket or delivery.', signature: 'Encore Transport · clear journeys', intro: 'Useful information, one step closer.', contactLabel: 'Need help?', contactAction: 'Open contact options', sitemap: 'Site map', services: 'Travel and parcels', nextLabel: 'Your next move', nextTitle: 'Ready when you are.', nextText: 'Plan a trip, follow a parcel or find the answer that keeps you moving.', plan: 'Plan a trip', travel: 'Travel', packages: 'Packages', company: 'Company & help', information: 'Information', accessibility: 'Accessibility', privacy: 'Privacy', terms: 'Terms', privacyText: 'We use account and booking information to operate Encore Transport, support travelers and protect the service.', termsText: 'Bookings follow the route, fare and cancellation rules shown before confirmation.', accessibilityText: 'The site supports keyboard navigation, readable contrast, labels and responsive layouts.', bottom: 'Travel, seats and parcels.', staff: 'Staff access' },
  },
  es: {
    nav: { home: 'Inicio', trips: 'Viajes', packages: 'Paquetería', tracking: 'Seguimiento', company: 'Empresa y ayuda', signIn: 'Iniciar sesión', myTrips: 'Mis viajes', language: 'Idioma', open: 'Abrir navegación', close: 'Cerrar navegación' },
    travel: { routes: 'Rutas y destinos', routesHint: 'Explora recorridos publicados', search: 'Buscar viajes', searchHint: 'Horarios y asientos disponibles', terminals: 'Terminales', terminalsHint: 'Puntos de salida del recorrido' },
    packages: { info: 'Información de paquetería', infoHint: 'Requisitos y proceso', services: 'Servicios', servicesHint: 'Viajes y envíos en un solo lugar', track: 'Rastrear paquete', trackHint: 'Consulta el estado registrado' },
    tracking: { live: 'Encore Live', liveHint: 'Red y ubicaciones autorizadas', packages: 'Rastreo de paquetes', packagesHint: 'Seguimiento por referencia' },
    company: { about: 'Nosotros', aboutHint: 'Propósito y forma de trabajar', contact: 'Contacto', contactHint: 'Canales para recibir ayuda', help: 'Preguntas frecuentes', helpHint: 'Respuestas para planificar' },
    footer: { lead: 'Viajes regionales y seguimiento claro, desde la búsqueda hasta el boleto o la entrega.', signature: 'Encore Transport · recorridos claros', intro: 'Información útil, un paso más cerca.', contactLabel: '¿Necesitas ayuda?', contactAction: 'Ver opciones de contacto', sitemap: 'Mapa del sitio', services: 'Viajes y paquetería', nextLabel: 'Tu siguiente paso', nextTitle: 'Listo cuando tú estés.', nextText: 'Planifica un viaje, sigue un envío o encuentra la respuesta que necesitas para avanzar.', plan: 'Planificar un viaje', travel: 'Viajes', packages: 'Paquetería', company: 'Empresa y ayuda', information: 'Información', accessibility: 'Accesibilidad', privacy: 'Privacidad', terms: 'Términos', privacyText: 'Usamos la información de cuenta y reservas para operar Encore Transport, dar soporte y proteger el servicio.', termsText: 'Las reservas siguen la ruta, tarifa y reglas de cancelación mostradas antes de confirmar.', accessibilityText: 'El sitio mantiene navegación por teclado, contraste legible, etiquetas y diseño responsive.', bottom: 'Viajes, asientos y paquetería.', staff: 'Acceso de personal' },
  },
};

const STATIC_ES = {
  'Skip to content': 'Saltar al contenido',
  'Regional travel, made simpler': 'Viajes regionales, más simples',
  'Your next trip,': 'Tu próximo viaje,',
  'clear from the start.': 'claro desde el inicio.',
  'Find a departure, compare schedules and choose your seat with confidence.': 'Encuentra una salida, compara horarios y elige tu asiento con tranquilidad.',
  'Published departures': 'Salidas publicadas', 'Seat selection': 'Selección de asientos', 'Clear tracking': 'Seguimiento claro',
  'Routes': 'Rutas', 'published': 'publicadas', 'Departures': 'Salidas', 'available': 'disponibles', 'Checking service': 'Comprobando servicio',
  'Start here': 'Empieza aquí', 'Where are you going?': '¿A dónde quieres ir?',
  'Choose an origin, destination, date and passengers. Then compare departures and choose your seat.': 'Elige origen, destino, fecha y pasajeros. Después podrás comparar salidas y escoger tu asiento.',
  'Ready when you are.': 'Listo cuando tú estés.', 'Origin': 'Origen', 'Destination': 'Destino', 'Date': 'Fecha', 'Passengers': 'Pasajeros',
  'Departure point': 'Punto de salida', 'Swap origin and destination': 'Intercambiar origen y destino', 'Loading origins…': 'Cargando orígenes…', 'Loading destinations…': 'Cargando destinos…', 'Find trips': 'Encontrar viajes', 'Recent searches': 'Búsquedas recientes',
  'Parcels': 'Paquetería', 'Every shipment has a clear next step.': 'Cada envío tiene un siguiente paso claro.', 'Check the latest recorded update with your parcel reference.': 'Consulta la última actualización registrada con la referencia de tu paquete.', 'Track a parcel': 'Rastrear paquete',
  'Routes and destinations': 'Rutas y destinos', 'Explore published journeys.': 'Explora los recorridos publicados.', 'Review available routes and continue directly to their departures.': 'Revisa los trayectos disponibles y continúa directamente a las salidas correspondientes.', 'Availability': 'Disponibilidad', 'Loading routes…': 'Cargando rutas…', 'See all routes and terminals →': 'Ver todas las rutas y terminales →',
  'Network layer': 'Capa de red', 'Every route leaves a trace.': 'Cada ruta deja un rastro.', 'This abstract view is built from published routes. It helps you read the network before choosing a departure.': 'Esta vista abstracta se construye con rutas publicadas. Te ayuda a leer la red antes de elegir una salida.', 'Waiting for route data': 'Esperando datos de rutas', 'Explore the route book →': 'Explorar el libro de rutas →', 'Abstract view of published routes': 'Vista abstracta de las rutas publicadas', 'published\nroutes': 'rutas\npublicadas',
  'A quick view of the network.': 'Una vista resumida de la red.', 'See authorized locations and open the full view when you need more context.': 'Consulta las ubicaciones autorizadas disponibles y abre la vista completa cuando necesites más contexto.', 'Vehicles in view': 'Vehículos en vista', 'Preparing live network': 'Preparando red en vivo', 'Latest signal': 'Última señal', 'All routes': 'Todas las rutas', 'Choose a route': 'Elegir una ruta', 'Encore Live network map': 'Mapa de la red Encore Live', 'Loading route map…': 'Cargando mapa de rutas…', 'Preparing current locations.': 'Preparando ubicaciones actuales.', 'Buses with recent signals': 'Autobuses con señal reciente',
  'Services': 'Servicios', 'Everything you need to travel and send.': 'Todo lo que necesitas para viajar y enviar.', 'Find a departure, check your parcels and get clear guidance at every step.': 'Encuentra una salida, consulta tus envíos y recibe orientación clara en cada paso.', 'Travel': 'Viajes', 'Search and book': 'Buscar y reservar', 'Compare departures, review details and choose your seats.': 'Compara salidas, revisa los detalles y elige tus asientos.', 'Find a trip →': 'Buscar viajes →', 'Send and track': 'Enviar y rastrear', 'Prepare your shipment, review requirements and follow its journey.': 'Prepara tu envío, consulta los requisitos y sigue su recorrido.', 'View parcel services →': 'Ver paquetería →', 'Help': 'Ayuda', 'Find an answer': 'Resolver una duda', 'Get practical answers about trips, tickets and parcels.': 'Encuentra respuestas prácticas sobre viajes, boletos y encomiendas.', 'Open help →': 'Ir a ayuda →',
  'Essential help': 'Ayuda esencial', 'Answers before you go.': 'Respuestas antes de salir.', 'Visit Help for the complete guide.': 'Para la guía completa, visita Ayuda.', 'Open help center →': 'Abrir centro de ayuda →', 'How do I find a trip?': '¿Cómo busco un viaje?', 'Where can I find my tickets?': '¿Dónde veo mis boletos?', 'How do I track a parcel?': '¿Cómo rastreo un paquete?',
  'About us': 'Nosotros', 'Travel and shipping designed for real life.': 'Viajes y envíos pensados para la vida real.', 'Encore Transport connects destinations, people and parcels with clear information so you can make confident decisions.': 'Encore Transport acerca destinos, personas y encomiendas con información clara para que puedas decidir con confianza.', 'Plan a trip →': 'Planificar un viaje →', 'Explore parcel services': 'Conocer paquetería', 'Closer on every journey': 'Cercanía en cada recorrido', 'Booking, traveling and sending should feel simple from the first glance.': 'Queremos que reservar, viajar y enviar sea sencillo desde el primer vistazo.', 'What guides us': 'Lo que nos guía', 'A clear experience from start to finish.': 'Una experiencia clara, de principio a fin.', 'Purpose': 'Propósito', 'Make the next step easy.': 'Hacer fácil tu próximo paso.', 'Routes, schedules and seats presented directly so you can plan without detours.': 'Rutas, horarios y asientos presentados de forma directa para que planifiques sin rodeos.', 'Confidence': 'Confianza', 'Information you can check.': 'Información que puedes consultar.', 'Availability, tracking and updates visible when you need them.': 'Disponibilidad, seguimiento y novedades visibles cuando los necesitas.', 'Care': 'Cuidado', 'People behind the service.': 'Personas detrás del servicio.', 'A prepared team to guide you before, during and after a trip or shipment.': 'Un equipo preparado para orientarte antes, durante y después de tu viaje o envío.', 'Next step': 'Siguiente paso', 'Discover where you can go.': 'Descubre a dónde puedes llegar.', 'Explore routes →': 'Explorar rutas →',
  'Company & help · contact': 'Empresa y ayuda · contacto', 'We are here to help you keep moving.': 'Estamos para ayudarte a seguir.', 'Choose the topic you need to resolve and go straight to the right place: a booking, a shipment or a general question.': 'Elige el tema que necesitas resolver y llegarás al lugar indicado: una reserva, un envío o una pregunta general.', 'Already have a reference?': '¿Ya tienes una referencia?', 'Open public tracking →': 'Consulta el rastreo público →', 'Choose an option': 'Elige una opción', 'Help without the runaround.': 'Atención sin vueltas.', 'Official channels': 'Canales oficiales', 'Contact information is being prepared.': 'Información de contacto en preparación.', 'We do not publish fictional email addresses, WhatsApp numbers or phone numbers. A confirmed official channel will appear here when it is ready.': 'No publicamos correos, WhatsApp ni teléfonos ficticios. Cuando exista un canal oficial confirmado, aparecerá aquí para que puedas usarlo con seguridad.',
  'Clear answers for travel and shipping.': 'Respuestas claras para viajar y enviar.', 'Find practical guidance about bookings, tickets, parcels and accessibility.': 'Encuentra orientación práctica sobre reservas, boletos, encomiendas y accesibilidad.', 'Ready to search?': '¿Listo para buscar?', 'Go to Find a trip →': 'Ir a Buscar viajes →', 'Frequently asked questions': 'Preguntas frecuentes', 'Trips and tickets': 'Viajes y boletos', 'How do I find a departure?': '¿Cómo busco una salida?', 'Can I choose my seat?': '¿Puedo elegir mi asiento?', 'Where is my ticket?': '¿Dónde está mi boleto?', 'Tracking and delivery': 'Seguimiento y entrega', 'Which statuses will I see?': '¿Qué estados veré?', 'Where are requirements and prices?': '¿Dónde veo requisitos y tarifas?', 'Designed for keyboard and mobile.': 'Diseñado para teclado y móvil.', 'Contact us about accessibility →': 'Contactar sobre accesibilidad →',
  'Tracking · Encore Live': 'Seguimiento · Encore Live', 'See the network in motion.': 'Mira el movimiento de la red.', 'View recent locations available for your route. It is a useful reference while you wait, not a replacement for the published schedule.': 'Consulta las ubicaciones recientes que están disponibles para tu ruta. Es una referencia útil mientras esperas, no un reemplazo del horario.', 'Network status': 'Estado de la red', 'Network map': 'Mapa de red', 'Information available': 'Información disponible', 'A helpful view while you wait': 'Una ayuda para esperar', 'Looking for a parcel?': '¿Buscas tu paquete?',
  'Parcel services': 'Paquetería', 'Send with a reference you can follow.': 'Envía con una referencia que puedas seguir.', 'Prepare your parcel, learn what to bring before handing it over and check every update with a secure reference.': 'Prepara tu encomienda, conoce lo necesario antes de entregarla y consulta cada actualización con una referencia segura.', 'Track a parcel →': 'Rastrear un paquete →', 'Ask before sending': 'Consultar antes de enviar', 'Your price depends on the shipment': 'La tarifa depende de tu envío', 'How it works': 'Así funciona', 'From registration to delivery.': 'Del registro a la entrega.', 'Prepare': 'Prepara', 'Send': 'Envía', 'Receive': 'Recibe', 'Before handing it over': 'Antes de entregar', 'Information worth having ready': 'Información que conviene tener lista', 'Prices': 'Tarifas', 'Check the amount for your case.': 'Consulta el importe de tu caso.', 'Contact Encore →': 'Contactar con Encore →',
  'Travel · routes and destinations': 'Viajes · rutas y destinos', 'Know the journey before you book.': 'Conoce el recorrido antes de reservar.', 'Explore published routes, departure points and options available for your next date.': 'Explora los trayectos publicados, los lugares de salida y las opciones disponibles para tu próxima fecha.', 'Know your origin and destination?': '¿Ya sabes tu origen y destino?', 'Open trip search →': 'Abre la búsqueda de viajes →', 'Available routes': 'Rutas disponibles', 'Destinations for your next trip': 'Destinos para tu próximo viaje', 'Departure points': 'Puntos de salida', 'Where the journey begins': 'Lugares donde comienza el recorrido', 'Schedules': 'Horarios', 'Find a departure for your date.': 'Encuentra una salida para tu fecha.', 'Search by date →': 'Buscar por fecha →', 'Search routes': 'Buscar rutas', 'Origin or destination': 'Origen o destino', 'Clear route search': 'Limpiar búsqueda de rutas', 'Clear search': 'Limpiar búsqueda',
  'Find a departure that fits.': 'Encuentra una salida que encaje contigo.', 'Select a route and compare schedules, details, seats and prices before confirming.': 'Selecciona un trayecto y compara horarios, detalles, asientos y precios antes de confirmar.', 'Your search, kept simple': 'Tu búsqueda, sin rodeos', 'Find departures': 'Buscar salidas', 'After you search': 'Después de buscar', 'Everything important before you confirm.': 'Todo lo importante antes de confirmar.', 'Compare departures': 'Compara salidas', 'Choose your place': 'Elige tu lugar', 'Confirm with confidence': 'Confirma con calma',
};

const ADDITIONAL_ES = {
  'Preparing your journey…': 'Preparando tu viaje…',
  'About Encore': 'Sobre Encore',
  'Move people and parcels with less uncertainty.': 'Mueve personas y encomiendas con menos incertidumbre.',
  'Encore Transport brings routes, reservations, tickets and shipment updates into one clear journey — from the first decision to the final arrival.': 'Encore Transport reúne rutas, reservas, boletos y actualizaciones de envíos en un recorrido claro, desde la primera decisión hasta la llegada final.',
  'Send a parcel': 'Enviar una encomienda',
  'Useful information should arrive before the next question does.': 'La información útil debe llegar antes de la siguiente pregunta.',
  'Plan': 'Planifica',
  'Travel': 'Viaja',
  'Send': 'Envía',
  'A service that explains itself.': 'Un servicio que se explica por sí mismo.',
  'Every important step should be visible, understandable and connected to the action that comes next.': 'Cada paso importante debe ser visible, comprensible y estar conectado con la siguiente acción.',
  'Make the next step obvious.': 'Haz evidente el siguiente paso.',
  'Routes, departures and seats are presented so planning does not feel like a detour.': 'Las rutas, salidas y asientos se presentan para que planificar no se sienta como un desvío.',
  'Show what can be checked.': 'Muestra lo que se puede comprobar.',
  'Availability, tracking and status updates stay close to the decision they support.': 'La disponibilidad, el rastreo y los estados permanecen cerca de la decisión que respaldan.',
  'Keep people in the loop.': 'Mantén a las personas informadas.',
  'Clear guidance helps passengers and senders feel prepared before, during and after the journey.': 'La orientación clara ayuda a pasajeros y remitentes a sentirse preparados antes, durante y después del recorrido.',
  'Start with a real destination': 'Empieza con un destino real',
  'See where Encore can take you.': 'Descubre hasta dónde puede llevarte Encore.',
  'Start with the answer you need.': 'Empieza con la respuesta que necesitas.',
  'Choose the path that matches your situation. Each one takes you to the information or action that can move it forward.': 'Elige el camino que corresponde a tu situación. Cada uno te lleva a la información o acción que puede hacerla avanzar.',
  'next step': 'siguiente paso',
  'Choose a starting point': 'Elige un punto de partida',
  'Where should we take you?': '¿A dónde debemos llevarte?',
  'Review or continue a booking': 'Revisa o continúa una reserva',
  'Departures, seats, passengers, payments and tickets.': 'Salidas, asientos, pasajeros, pagos y boletos.',
  'Check a shipment': 'Consulta un envío',
  'Use the reference you received to see its latest available update.': 'Usa la referencia recibida para ver su última actualización disponible.',
  'Read practical answers': 'Lee respuestas prácticas',
  'Guidance about dates, seats, tickets, parcels and accessibility.': 'Orientación sobre fechas, asientos, boletos, encomiendas y accesibilidad.',
  'We publish contact details only when they are confirmed.': 'Publicamos datos de contacto solo cuando están confirmados.',
  'No fictional email, WhatsApp or phone number is shown here. Use the verified paths above while official channels are being prepared.': 'Aquí no mostramos correos, WhatsApp ni teléfonos ficticios. Usa las rutas verificadas mientras se preparan los canales oficiales.',
  'Find the answer. Keep moving.': 'Encuentra la respuesta. Sigue avanzando.',
  'Short, practical guidance for the moments that matter: choosing a departure, finding a ticket or following a parcel.': 'Orientación breve y práctica para los momentos importantes: elegir una salida, encontrar un boleto o seguir una encomienda.',
  'Jump to': 'Ir a',
  'Trips & tickets': 'Viajes y boletos',
  'Tracking & delivery': 'Seguimiento y entrega',
  '01 · Travel': '01 · Viajes',
  '02 · Parcels': '02 · Paquetería',
  'From finding a departure to opening the ticket you already bought.': 'Desde encontrar una salida hasta abrir el boleto que ya compraste.',
  'See the reference, status and next available action without exposing private data.': 'Consulta la referencia, el estado y la siguiente acción disponible sin exponer datos privados.',
  'Open parcel tracking ↗': 'Abrir rastreo de paquetes ↗',
  'Route signal': 'Señal de ruta',
  'Latest update': 'Última actualización',
  'Waiting for a route': 'Esperando una ruta',
};

export function applyStaticLocale(locale = DEFAULT_LOCALE) {
  if (locale !== 'es' || typeof document === 'undefined') return;
  const translations = { ...STATIC_ES, ...ADDITIONAL_ES };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (/^(SCRIPT|STYLE|SELECT)$/i.test(node.parentElement?.tagName ?? '')) continue;
    const value = node.nodeValue ?? '';
    const trimmed = value.trim();
    if (translations[trimmed]) node.nodeValue = value.replace(trimmed, translations[trimmed]);
  }
  for (const element of document.querySelectorAll('[aria-label], [alt], [title], [placeholder]')) {
    for (const attribute of ['aria-label', 'alt', 'title', 'placeholder']) {
      const value = element.getAttribute(attribute);
      if (value && translations[value]) element.setAttribute(attribute, translations[value]);
    }
  }
}

export function getPageKey(pathname = '') {
  if (/\/website\/routes\//.test(pathname)) return 'routes';
  if (/\/website\/trips\//.test(pathname)) return 'trips';
  if (/\/website\/packages\//.test(pathname)) return 'packages';
  if (/\/website\/services\//.test(pathname)) return 'services';
  if (/\/website\/live\//.test(pathname)) return 'live';
  if (/\/website\/about\//.test(pathname)) return 'about';
  if (/\/website\/contact\//.test(pathname)) return 'contact';
  if (/\/website\/help\//.test(pathname)) return 'help';
  return 'home';
}

export function pageSeo(pageKey, locale = DEFAULT_LOCALE) {
  return PAGE_SEO[pageKey]?.[locale] ?? PAGE_SEO.home[DEFAULT_LOCALE];
}

export function copy(locale = DEFAULT_LOCALE) {
  return COPY[LOCALES.includes(locale) ? locale : DEFAULT_LOCALE];
}
