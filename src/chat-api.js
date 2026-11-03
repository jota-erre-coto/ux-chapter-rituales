// Adaptador de la Chat API para lo que no es una respuesta directa a un evento:
// leer los miembros de un espacio y enviar mensajes en nombre de la app.
//
// La voz de la app es la cuenta de servicio CUENTA_SERVICIO_APP. No tiene claves:
// la app pide un token temporal con la sesión de quien la usa, que necesita el rol
// «Creador de tokens de cuenta de servicio» sobre ella (hoy, jcoto y el suplente).

const CHAT_API = 'https://chat.googleapis.com/v1';
const MINUTOS_CACHE_MIEMBROS = 60;

// Miembros humanos del espacio como [{ email, nombre }], ordenados por nombre.
// Se leen con la sesión de quien usa la app y se guardan en caché una hora.
function miembrosDelEspacio_(espacio) {
  const cache = CacheService.getScriptCache();
  const clave = `miembros:${espacio}`;
  const guardado = cache.get(clave);
  if (guardado) return JSON.parse(guardado);

  const ids = [];
  let pagina = '';
  do {
    const url = `${CHAT_API}/${espacio}/members?pageSize=100${pagina ? `&pageToken=${pagina}` : ''}`;
    const respuesta = pedir_(url, ScriptApp.getOAuthToken());
    (respuesta.memberships || [])
      .filter((m) => m.member && m.member.type === 'HUMAN')
      .forEach((m) => ids.push(m.member.name.replace('users/', '')));
    pagina = respuesta.nextPageToken || '';
  } while (pagina);

  const miembros = personasPorId_(ids).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  cache.put(clave, JSON.stringify(miembros), MINUTOS_CACHE_MIEMBROS * 60);
  return miembros;
}

// Traduce IDs de usuario de Chat a email y nombre con el directorio de la organización.
function personasPorId_(ids) {
  if (!ids.length) return [];
  const consulta = ids.map((id) => `resourceNames=people/${id}`).join('&');
  const url =
    `https://people.googleapis.com/v1/people:batchGet?${consulta}` +
    '&personFields=names,emailAddresses&sources=READ_SOURCE_TYPE_PROFILE' +
    '&sources=READ_SOURCE_TYPE_DOMAIN_CONTACT';
  const respuesta = pedir_(url, ScriptApp.getOAuthToken());
  return (respuesta.responses || [])
    .map((r) => r.person || {})
    .map((p) => {
      const email = ((p.emailAddresses || [])[0] || {}).value || '';
      const nombre = ((p.names || [])[0] || {}).displayName || email;
      return { email: email.toLowerCase(), nombre };
    })
    .filter((p) => p.email);
}

// Envía un mensaje privado de la app a una persona. Devuelve false si esa persona
// todavía no ha abierto nunca un chat directo con la app.
function enviarPrivado_(email, mensaje) {
  const token = tokenApp_();
  let espacio;
  try {
    espacio = pedir_(`${CHAT_API}/spaces:findDirectMessage?name=users/${email}`, token).name;
  } catch (error) {
    if (String(error.message).includes('404')) return false;
    throw error;
  }
  pedir_(`${CHAT_API}/${espacio}/messages`, token, mensaje);
  return true;
}

// Token de la cuenta de servicio con el permiso de app de Chat, cacheado por usuario.
function tokenApp_() {
  const cache = CacheService.getUserCache();
  const guardado = cache.get('tokenApp');
  if (guardado) return guardado;
  const url =
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
    `${CUENTA_SERVICIO_APP}:generateAccessToken`;
  const respuesta = pedir_(url, ScriptApp.getOAuthToken(), {
    scope: ['https://www.googleapis.com/auth/chat.bot'],
    lifetime: '600s',
  });
  cache.put('tokenApp', respuesta.accessToken, 540);
  return respuesta.accessToken;
}

// GET si no hay cuerpo, POST con JSON si lo hay. Lanza un error con el código HTTP.
function pedir_(url, token, cuerpo) {
  const opciones = {
    method: cuerpo ? 'post' : 'get',
    headers: { Authorization: `Bearer ${token}` },
    muteHttpExceptions: true,
  };
  if (cuerpo) {
    opciones.contentType = 'application/json';
    opciones.payload = JSON.stringify(cuerpo);
  }
  const respuesta = UrlFetchApp.fetch(url, opciones);
  const codigo = respuesta.getResponseCode();
  if (codigo >= 300) throw new Error(`HTTP ${codigo} en ${url.split('?')[0]}: ${respuesta.getContentText()}`);
  return JSON.parse(respuesta.getContentText() || '{}');
}
