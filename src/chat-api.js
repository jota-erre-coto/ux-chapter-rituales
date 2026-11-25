// Adaptador de la Chat API para lo que no es una respuesta directa a un evento:
// leer los miembros de un espacio y enviar mensajes en nombre de la app.
//
// La voz de la app es la cuenta de servicio CUENTA_SERVICIO_APP. No tiene claves:
// la app pide un token temporal con la sesión de quien la usa, que necesita el rol
// «Creador de tokens de cuenta de servicio» sobre ella. Lo tienen jcoto y el suplente;
// el resto de personas solo llega aquí a través del servicio del registro, que se
// ejecuta como su dueño.

const CHAT_API = 'https://chat.googleapis.com/v1';
const MINUTOS_CACHE_MIEMBROS = 60;

// Miembros humanos del espacio como [{ email, nombre, id }], ordenados por nombre.
// id es el usuario de Chat (users/123…), que la app necesita para escribirle.
// La lista la lee la app (no hace falta que quien la usa sea miembro) y los emails
// salen del directorio con la sesión de quien la usa. Se guarda en caché una hora.
function miembrosDelEspacio_(espacio) {
  const cache = CacheService.getScriptCache();
  const clave = `miembros:v2:${espacio}`;
  const guardado = cache.get(clave);
  if (guardado) return JSON.parse(guardado);

  const ids = [];
  let pagina = '';
  do {
    const url = `${CHAT_API}/${espacio}/members?pageSize=100${pagina ? `&pageToken=${pagina}` : ''}`;
    const respuesta = pedir_(url, tokenApp_());
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
    .map((r) => {
      const p = r.person || {};
      const email = ((p.emailAddresses || [])[0] || {}).value || '';
      const nombre = ((p.names || [])[0] || {}).displayName || email;
      const id = String(r.requestedResourceName || '').replace('people/', 'users/');
      return { email: email.toLowerCase(), nombre, id };
    })
    .filter((p) => p.email);
}

// Envía un mensaje privado de la app a un usuario de Chat (users/123…). La app no
// puede buscar a nadie por email. Devuelve el mensaje creado, o null si no se ha
// podido entregar, por ejemplo porque esa persona nunca ha abierto un chat con la app.
function enviarPrivado_(usuario, mensaje) {
  try {
    const token = tokenApp_();
    const espacio = pedir_(`${CHAT_API}/spaces:findDirectMessage?name=${usuario}`, token).name;
    return pedir_(`${CHAT_API}/${espacio}/messages`, token, mensaje);
  } catch (error) {
    console.error(`No se ha podido enviar un mensaje privado a ${usuario}: ${error.message}`);
    return null;
  }
}

// Envía un mensaje privado a una persona del espacio del ritual, por su email.
function enviarPrivadoPorEmail_(ritual, email, mensaje) {
  const persona = miembrosDelEspacio_(ritual.espacio).find((p) => p.email === email);
  if (!persona) {
    console.error(`${email} no es miembro de ${ritual.espacio}; no se le puede escribir.`);
    return null;
  }
  return enviarPrivado_(persona.id, mensaje);
}

// Sustituye el texto y las tarjetas de un mensaje que envió la app.
function actualizarMensaje_(nombre, mensaje) {
  return pedir_(`${CHAT_API}/${nombre}?updateMask=text,cardsV2`, tokenApp_(), mensaje, 'patch');
}

// Publica un mensaje de la app en un espacio (texto y, si hace falta, tarjetas).
function publicarEnEspacio_(espacio, mensaje) {
  return pedir_(`${CHAT_API}/${espacio}/messages`, tokenApp_(), mensaje);
}

// Publica un mensaje de la app en su propio hilo. La clave identifica el hilo: con la
// misma clave, el mensaje se añade a ese hilo en vez de abrir otro.
function publicarEnHilo_(espacio, claveHilo, mensaje) {
  const url =
    `${CHAT_API}/${espacio}/messages?threadKey=${encodeURIComponent(claveHilo)}` +
    '&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD';
  return pedir_(url, tokenApp_(), mensaje);
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

// GET si no hay cuerpo, POST con JSON si lo hay (u otro método si se indica).
// Lanza un error con el código HTTP.
function pedir_(url, token, cuerpo, metodo) {
  const opciones = {
    method: metodo || (cuerpo ? 'post' : 'get'),
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

// { email: nombre } de los miembros del espacio del ritual, para los textos. Si no se
// pueden leer, devuelve {} y los textos nombran a cada persona por su email.
function nombresDelEspacio_(ritual) {
  try {
    return Object.fromEntries(miembrosDelEspacio_(ritual.espacio).map((p) => [p.email, p.nombre]));
  } catch (error) {
    console.error(`No se han podido leer los nombres del espacio: ${error.stack}`);
    return {};
  }
}
