# ux-chapter-rituales

> **Explicación del proyecto en una página:** [docs/proyecto.html](docs/proyecto.html). GitHub muestra el código del HTML: descárgalo y ábrelo en el navegador.

App de Google Chat que gestiona el ciclo de temas de los rituales del Chapter de UX de Civitatis: convocatoria, selección, anuncio en DELUX y acta de acuerdos. Empieza por la Design Review; el Design Chapter vendrá después como segunda configuración.

- Owner: jcoto. Co-owner y suplente: Fer.
- Proyecto de Google Cloud: `ux-chapter-rituales`.
- Glosario del dominio: [CONTEXT.md](CONTEXT.md).
- Requisitos: [PRD.md](PRD.md).

## Cómo funciona

Un único proyecto de Apps Script (`src/`), sincronizado con `clasp`, cumple tres papeles:

- **App de Chat.** Está configurada como complemento de Google Workspace y se ejecuta con la cuenta de quien la usa. Lee el registro, abre los diálogos y responde.
- **Servicio del registro.** Es el mismo script, desplegado como aplicación web que se ejecuta con la cuenta de su dueño. Las altas, ediciones y descartes pasan por él, así que el resto del Chapter solo necesita leer la Sheet. La hoja "Temas" está protegida para esa cuenta.
- **Disparador de hitos.** `ejecutarHitos()` se ejecuta cada 5 minutos, con la cuenta de su dueño, y lanza la convocatoria, la propuesta, el anuncio, etc. cuando toca.

Los mensajes que la app envía por iniciativa propia los firma la cuenta de servicio `rituales-chat-app@ux-chapter-rituales.iam.gserviceaccount.com`. No tiene claves descargadas: la app pide un token temporal con la sesión del dueño (o del suplente).

Toda la configuración de cada ritual (IDs, horarios, personas) está en `src/config.js`.

## Cuenta dueña

**La cuenta dueña es la de jcoto** (`jcoto@civitatis.com`). Ejecuta el servicio del registro y el disparador de hitos. Es su cuenta porque la app necesita leer cosas que ya son suyas: el evento de la sesión (es el organizador), las notas de Gemini (se guardan en el Drive del organizador) y sus ausencias en Calendar. Efecto visible: todas las escrituras de la app en el registro aparecen a nombre de jcoto en el historial de cambios.

**Riesgo asumido:** si la cuenta dueña se desactiva, el servicio y el disparador dejan de funcionar. Para evitarlo, cambia de dueño antes de que pase.

### Cambiar de cuenta dueña

Hazlo antes de que la cuenta actual se desactive. Si ya no tienes acceso a ella, empieza por el paso 1 con un administrador de Workspace.

1. **Acceso.** La cuenta nueva necesita:
   - ser gestora de la unidad compartida "Chapter UX";
   - ser editora del script;
   - ser organizadora del evento recurrente del ritual, o al menos ver su calendario y las notas de Gemini;
   - tener el rol de creadora de tokens sobre la cuenta de servicio:
     ```bash
     gcloud iam service-accounts add-iam-policy-binding rituales-chat-app@ux-chapter-rituales.iam.gserviceaccount.com --member=user:NUEVA@civitatis.com --role=roles/iam.serviceAccountTokenCreator --project=ux-chapter-rituales
     ```
2. **Configuración.** En `src/config.js`, cambia `organizador` en cada ritual si la persona organizadora también cambia.
3. **Servicio del registro.** Con la cuenta nueva (`pnpm exec clasp login`), crea un despliegue nuevo:
   ```bash
   pnpm exec clasp create-deployment -d "produccion"
   ```
   El despliegue de una aplicación web se ejecuta con la cuenta de quien lo crea. Copia el ID nuevo en `ID_IMPLEMENTACION` de `src/config.js` y súbelo (`pnpm push`).
4. **App de Chat.** En la consola de la Chat API (https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=ux-chapter-rituales), cambia el ID de implementación por el nuevo.
5. **Disparador.** Con la cuenta nueva, abre el script en el editor de Apps Script y ejecuta `instalarDisparadores`. Con la cuenta antigua, borra su disparador en el apartado Activadores del editor, para que no se lancen hitos dos veces.
6. **Protección de la hoja.** En la Sheet, quita la protección de la hoja "Temas". La app la vuelve a crear a nombre de la cuenta nueva en la siguiente escritura.
7. **Comprobación.** Con `/hito`, en el espacio de pruebas, lanza la convocatoria. Crea un tema con `/tema` desde una cuenta que solo sea lectora del registro.

## Desarrollo

```bash
pnpm install
pnpm test        # tests de la lógica pura (node:test)
pnpm push        # sube src/ a Apps Script
pnpm exec clasp update-deployment <ID_IMPLEMENTACION> -d "pruebas"
```

Apps Script carga los archivos de `src/` por orden alfabético. Ningún archivo puede usar, al cargarse, algo definido en otro. El test `test/carga.test.js` lo comprueba.

## Flujo de trabajo

- Cada issue se trabaja en su propia rama (`issue-<número>-<tema>`, por ejemplo `issue-9-ausencia`), nunca directamente en `main`.
- Al terminar, se abre un PR contra `main` cuya descripción incluye `Closes #<número>`, para que el issue se cierre al fusionarlo.
- Antes de fusionar: `pnpm test` en verde y el cambio probado en el entorno de pruebas cuando afecta a Chat.
- Se fusiona con squash, para que cada issue quede como un único commit en `main`, y se borra la rama.
