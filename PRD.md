# PRD — App de Google Chat para la Design Review del Chapter de UX

Owner: jcoto (Head of UX). Co-owner y suplente: Fer (Principal PD).
Estado: listo para desglosar en issues. Glosario canónico: `CONTEXT.md` en esta misma carpeta.

## Problem Statement

La Design Review semanal del Chapter de UX depende de un proceso manual que no se sostiene:

- Los temas se gestionaban en una Sheet ("Temas de la Design Review + Chapter") que en la práctica se abandonó: los temas acabaron moviéndose por DELUX y por conversaciones sueltas, sin forma ni registro.
- No hay un momento fijo para proponer temas, así que lo urgente de la semana llega tarde o no llega, y el backlog nunca refleja la realidad.
- La selección es intuitiva. La fórmula de prioridad de la Sheet (`Urgencia × 10 − Esfuerzo`) hace que los temas poco urgentes, como las demos, no salgan nunca.
- El Chapter llega a la sesión sin saber qué se va a tratar ni qué se espera de cada persona.
- Lo acordado no queda registrado de forma fiable. El documento anterior de notas lleva sin actualizarse desde abril de 2026, y no se distingue entre un tema que se trató y un tema que se cerró de verdad.
- Todo depende de jcoto. Si no está, la sesión no se prepara y no queda acta.

## Solution

Una app de Google Chat que lleva el ciclo completo de cada tema en DELUX, con hitos automáticos a lo largo de la semana:

- **Lunes, 11:00.** Convocatoria de temas en DELUX.
- **Lunes, 13:00.** Propuesta de selección para jcoto por mensaje privado. jcoto la confirma o la modifica.
- **Martes, 11:00.** Confirmación de cada responsable. Si alguien no confirma, entra un sustituto.
- **Martes, 12:00.** Anuncio en DELUX con un hilo por tema.
- **Miércoles, después de la sesión.** Lectura de las notas de Gemini y borrador de conclusiones por tema, que se envía a cada responsable.
- **Jueves, 12:00.** Plazo para que el responsable valide. Lo validado se escribe en el acta única.

El responsable de cada tema responde de él de principio a fin: lo prepara, lo presenta, valida las conclusiones y decide si hubo acuerdo. jcoto, o Fer cuando jcoto no está, solo recibe las excepciones.

La Sheet pasa a ser el registro de temas y solo la edita la app. El Documento de sesiones es un acta acumulada en solo lectura.

## User Stories

### Proponer temas

1. Como persona del Chapter, quiero recibir cada lunes una convocatoria en DELUX con un botón "Proponer tema", para acordarme de llevar lo que me ha surgido esa semana.
2. Como persona del Chapter, quiero proponer un tema rellenando solo el título, el tipo de feedback y la duración estimada, para no abandonar el diálogo por exceso de campos.
3. Como persona del Chapter, quiero proponer un tema en cualquier momento con `/tema`, desde DELUX o por mensaje privado a la app, para recogerlo cuando surge y no esperar al lunes.
4. Como persona del Chapter, quiero indicar la urgencia de mi tema de 1 a 5, con 3 por defecto, para señalar cuándo necesito resolverlo.
5. Como persona del Chapter, quiero declarar la preparación de mi tema (*Lista*, *La tendré para la sesión*, *Falta preparación*), para que la selección sepa si se puede contar con él.
6. Como persona del Chapter, quiero añadir un contexto y un enlace (Figma, Jira…) a mi tema, para que los demás lleguen a la sesión con información.
7. Como persona del Chapter, quiero ver mis temas y su estado con `/mis-temas`, para saber qué está en el backlog, qué se ha seleccionado y qué se ha resuelto.
8. Como responsable, quiero editar mis temas mientras están en el backlog, para ajustar la duración, la urgencia o la preparación cuando cambian.
9. Como responsable, quiero descartar mis temas, para quitar los que han dejado de tener sentido.
10. Como persona del Chapter, quiero que un tema propuesto después del lunes a las 13:00 pase al backlog de la semana siguiente, para entender por qué no entra esta semana.

### Asignar temas

11. Como jcoto, quiero dar de alta un tema con otra persona como responsable, para meter temas que me interesan o que han quedado sueltos.
12. Como responsable de un tema asignado, quiero recibir un mensaje privado que me avise de la asignación y de quién la ha hecho, para saber que es un compromiso que asumo.
13. Como lector del registro, quiero distinguir los temas asignados de los que propuso su propio responsable, para entender de dónde viene cada compromiso.
14. Como Fer, cuando sustituyo a jcoto, quiero poder asignar temas, para cubrir su función durante su ausencia.

### Seleccionar

15. Como jcoto, quiero recibir el lunes a las 13:00 una propuesta de temas que quepan en 60 minutos, ordenados por prioridad, para decidir rápido y no tener que revisar todo el backlog.
16. Como jcoto, quiero que la propuesta excluya los temas con *Falta preparación*, para no seleccionar algo que no se puede presentar.
17. Como jcoto, quiero que los temas aplazados de la sesión anterior aparezcan primero en la propuesta, para que no vuelvan a competir con el resto.
18. Como jcoto, quiero confirmar la propuesta con un botón, para cerrar la selección en segundos.
19. Como jcoto, quiero cambiar un tema de la propuesta por otro del backlog, para aplicar criterio cuando la prioridad no basta.
20. Como jcoto, quiero quedarme con un solo tema ("Solo uno"), para dar más tiempo a un tema que lo necesita.
21. Como jcoto, quiero añadir a mano un tema urgente que llegó después del cierre de la convocatoria, para no tener que esperar una semana más.
22. Como jcoto, quiero que, si no confirmo la propuesta, la app no publique nada y me avise, para que nunca se anuncien temas que nadie ha validado.
23. Como miembro del Chapter, quiero que un tema de baja urgencia gane prioridad cuanto más tiempo lleva esperando, para que ningún tema se quede en el backlog para siempre.

### Confirmar

24. Como responsable de un tema seleccionado, quiero recibir el martes a las 11:00 una petición de confirmación, para garantizar que lo llevo preparado.
25. Como responsable, quiero completar el contexto y el enlace al confirmar, si no lo hice al proponer el tema, para que el anuncio tenga información útil.
26. Como responsable, quiero poder responder que no puedo presentar mi tema, para liberar el hueco a tiempo.
27. Como jcoto, quiero que, si un responsable no confirma antes de las 11:45, la app me ofrezca el siguiente candidato con preparación *Lista* para sustituirlo con un botón, para no perder la sesión.
28. Como jcoto, quiero que, si no queda ningún tema confirmado, la app me pregunte si cancelo la sesión o la anuncio como abierta, para decidirlo de forma explícita.

### Anunciar

29. Como persona del Chapter, quiero ver el martes a las 12:00 en DELUX los temas de la sesión, con su responsable, duración, tipo de feedback y contexto, para llegar preparada.
30. Como persona del Chapter, quiero que el anuncio me diga qué revisar antes de la sesión según el tipo de feedback, para que mi tiempo de preparación sirva.
31. Como persona del Chapter, quiero que cada tema anunciado tenga su propio hilo, para dejar dudas previas sin mezclar conversaciones.
32. Como persona del Chapter, quiero ver en el anuncio quién facilita la sesión, para saber a quién dirigirme.

### Semanas sin sesión

33. Como persona del Chapter, quiero que, si esa semana no hay Design Review, la app lo anuncie el lunes y no lance la convocatoria, para no proponer temas en vano.
34. Como responsable de un tema seleccionado, quiero que, si la sesión se cancela después de la selección, mi tema pase con preferencia a la sesión siguiente, para no perder la plaza.
35. Como persona del Chapter, quiero que, si se cancela una sesión ya anunciada, la app lo publique en DELUX, para no presentarme a una reunión que no existe.

### Después de la sesión

36. Como responsable, quiero recibir un borrador de conclusiones de mi tema (resumen, acuerdos y siguientes pasos con su encargado) a partir de las notas de Gemini, para no tener que redactarlo desde cero.
37. Como responsable, quiero que el borrador tenga en cuenta también el hilo de mi tema en DELUX, para recoger lo que se habló antes de la sesión.
38. Como responsable, quiero marcar el borrador como "Es correcto", para resolver el tema sin más trabajo.
39. Como responsable, quiero "Añadir aclaración" en un diálogo, para corregir o completar lo que el borrador no recogió bien.
40. Como responsable, quiero marcar "No hubo acuerdo" e indicar qué falta para cerrarlo, para que el tema vuelva al backlog como reabierto.
41. Como responsable, quiero marcar "No se llegó a tratar", para que el tema quede aplazado y no cuente como reabierto.
42. Como responsable, quiero un recordatorio si no he validado antes del jueves a las 12:00, para no olvidarlo.
43. Como jcoto, quiero recibir los temas que su responsable no ha validado tras el recordatorio, para decidir qué hacer con ellos.
44. Como jcoto, quiero que la app me avise si a las 18:00 del miércoles no hay notas de Gemini en el evento, para reaccionar ese mismo día.
45. Como encargado de un siguiente paso, quiero aparecer con mi nombre y la acción en el acta, para saber qué me toca hacer.

### Acta y registro

46. Como persona del Chapter, quiero consultar un único documento con todas las sesiones, la más reciente primero, para encontrar lo acordado sin buscar en varios sitios.
47. Como persona del Chapter, quiero que el acta muestre por sesión la fecha, los participantes, quién facilitó y un enlace a las notas de Gemini, para tener el contexto completo.
48. Como persona del Chapter, quiero que el acta muestre por tema su responsable, tipo de feedback, estado, contexto, acuerdos y siguientes pasos, para entender qué se decidió y por qué.
49. Como persona del Chapter, quiero que un tema reabierto aparezca en cada sesión en la que se trató, con lo que falta para cerrarlo, para seguir su historia.
50. Como persona del Chapter, quiero que en el acta solo aparezca lo validado por el responsable, para fiarme de lo que leo.
51. Como persona del Chapter, quiero consultar el registro de temas en modo lectura, para ver el backlog completo y su prioridad.
52. Como jcoto, quiero que el registro no se pueda editar a mano, para que el estado de los temas y el acta nunca se contradigan.
53. Como jcoto, quiero que cada tema enlace a las sesiones en las que se trató, para seguir su recorrido.

### Ausencia de jcoto

54. Como jcoto, quiero que, cuando tengo un evento de fuera de la oficina en mi calendario, la propuesta de selección y las excepciones le lleguen a Fer, para que el ritual no dependa de mí.
55. Como Fer, cuando sustituyo a jcoto, quiero facilitar la sesión, confirmar la propuesta y recibir las excepciones con los mismos botones que él, para no tener que aprender otro flujo.
56. Como Chapter, quiero que la toma de notas de Gemini esté activada de forma automática en el evento recurrente, para que haya acta aunque el organizador no se conecte.

### Gobierno y operación

57. Como jcoto o Fer, quiero descartar cualquier tema, para mantener limpio el backlog.
58. Como jcoto, quiero que los horarios, el evento, el espacio, el registro, el acta y el suplente sean configuración del ritual, para poder añadir el Design Chapter (viernes alternos) sin reescribir la app.
59. Como jcoto, quiero probar todo el ciclo en un espacio de pruebas, con un evento, un registro y un acta de prueba, antes de usarlo en DELUX, para no hacer ruido al Chapter mientras se ajusta.
60. Como jcoto, quiero lanzar a mano cualquier hito en el entorno de pruebas, sin esperar al día y la hora reales, para recorrer una semana entera en minutos.
61. Como jcoto o Fer, quiero que la app y sus documentos vivan en una unidad compartida y en un proyecto de Cloud con los dos como propietarios, para que no dependan de una sola cuenta.
62. Como jcoto, quiero revisar la app tras 6 sesiones con criterios medibles, para decidir si se mantiene, se ajusta o se retira.

## Implementation Decisions

### Plataforma

- **App de Google Chat en Apps Script**, vinculada al proyecto de Google Cloud `ux-chapter-rituales` (organización civitatis.com). El proyecto ya está creado y tiene la Chat API habilitada.
- **Vertex AI (Gemini) para el borrador de conclusiones**, en el mismo proyecto. Hay que vincular la facturación, preferiblemente a la cuenta "Civitatis euros". Así el contenido de las sesiones no sale del entorno de Google, donde ya están las notas de Meet.
- **El código vive en `~/Documents/code/ux-chapter-rituales/`**, versionado en git y sincronizado con Apps Script mediante `clasp`.
- **El registro de temas (Sheet), el acta (Doc) y el script van en una unidad compartida "Chapter UX"**. jcoto y Fer son gestores y los miembros de DELUX son lectores.
- **Las notas de Gemini se quedan en el Drive del organizador (jcoto)**, que es donde las guarda Google. La app las encuentra a través del adjunto del evento en Calendar.

### Módulos

Lógica pura, sin llamadas a servicios de Google, que se puede probar en aislamiento:

1. **Ciclo de vida del tema.** Recibe un tema, una acción y quién la hace (el actor con su rol: responsable, jcoto o suplente). Devuelve el nuevo estado o un error de regla. Recoge todas las reglas acordadas:
   - Estados: `propuesto → seleccionado → tratado → resuelto | reabierto`, y `descartado` desde cualquier estado anterior a resuelto.
   - Un tema aplazado vuelve a `propuesto` con la marca de preferencia.
   - Solo el responsable valida, declara que no hubo acuerdo o marca que no se trató.
   - Solo el responsable, jcoto o el suplente pueden descartar un tema.
   - Un tema asignado no se puede rechazar.
   - Un tema con *Falta preparación* no puede pasar a `seleccionado`.
2. **Priorización y selección.**
   - Prioridad = urgencia efectiva, y a igual urgencia gana la antigüedad.
   - La urgencia efectiva es la declarada más 1 por cada 3 semanas en el backlog, con un máximo de 5.
   - Propuesta de selección: primero los aplazados, después los temas por prioridad, excluidos los de *Falta preparación*, hasta llenar la duración de la sesión.
   - Devuelve también la lista ordenada de sustitutos, que solo pueden tener preparación *Lista*.
3. **Planificador de hitos.**
   - Recibe la configuración del ritual, la fecha y hora actuales, las ocurrencias del evento y la ausencia o presencia de jcoto.
   - Devuelve el hito que toca: convocatoria, propuesta, confirmación, plazo de sustitución, anuncio, espera de notas, aviso de que no hay notas, recordatorio de validación o plazo de validación.
   - Devuelve también si esa semana hay sesión y a quién se dirige cada mensaje (a jcoto o al suplente).
4. **Redacción de mensajes.** Construye las tarjetas y diálogos de Chat a partir de los datos del dominio: convocatoria, diálogo de alta, propuesta, confirmación, sustitución, anuncio, cancelación, borrador, aviso de asignación, recordatorios y excepciones. Solo construye, no envía. El texto de "Antes de la sesión" depende del tipo de feedback.
5. **Redacción del acta.** Recibe una sesión y sus temas validados, y devuelve la entrada del Documento de sesiones con la estructura acordada.

Adaptadores:

6. **Configuración del ritual.** Para cada ritual guarda:
   - el ID de la serie del evento recurrente (nunca el título, porque hay otra serie con el mismo nombre);
   - el horario de cada hito y la duración de la sesión;
   - el espacio de Chat;
   - los IDs del registro y del acta;
   - el suplente y la zona horaria (Europe/Madrid).

   Hay dos configuraciones: **pruebas** y **DELUX**.
7. **Registro de temas.** Lee y escribe en la Sheet. Añade columnas para proponente, responsable, la marca de tema asignado, el tipo de feedback, la duración, la fecha de alta, la marca de preferencia y las sesiones en las que se trató. Desaparece la columna Esfuerzo. Las personas se identifican por su email.
8. **Calendar.** Lee las ocurrencias y cancelaciones del evento, los eventos de fuera de la oficina de jcoto y el adjunto con las notas de Gemini.
9. **Chat.** Envía mensajes al espacio y por mensaje privado, crea los hilos y gestiona los comandos (`/tema`, `/mis-temas`), los botones y los diálogos. Lee los miembros del espacio, que son los que definen quién forma parte del Chapter.
10. **Generador de borradores.** Recibe las notas de Gemini, los temas tratados y sus hilos, y devuelve un borrador por tema con resumen, acuerdos y siguientes pasos con su encargado. Su interfaz está aislada para poder cambiar Vertex AI por la API de Claude sin tocar el resto de la app.
11. **Acta.** Añade entradas al Doc, con una pestaña por trimestre y la sesión más reciente primero.
12. **Orquestador.** Un disparador programado consulta al planificador y ejecuta el hito que toca. En el entorno de pruebas, cada hito se puede lanzar a mano.

### Decisiones de interacción

- **El diálogo de alta tiene 3 campos obligatorios**: título, tipo de feedback y duración (15, 30 o 45 minutos). La urgencia toma 3 por defecto y la preparación *Falta preparación*. El contexto y el enlace se piden en la confirmación del martes si no se dieron al proponer.
- **Tipos de feedback**: decidir entre opciones, validar una propuesta, abrir un debate, informar.
- **La propuesta de selección se rellena hasta 60 minutos.**
- **Plazos:**
  - sustitución, martes a las 11:45;
  - aviso de que no hay notas de Gemini, miércoles a las 18:00;
  - validación, jueves a las 12:00, con un recordatorio antes de pasar el tema a jcoto o al suplente.
- **jcoto está ausente** cuando tiene un evento de fuera de la oficina en Calendar el día del hito.
- **La app solo escribe en el registro y en el acta.** La Sheet se protege: solo la app puede editarla, los demás solo pueden leer.
- **Los textos fijos de los mensajes los revisa el agente `ana`** antes de pasar a DELUX.

## Testing Decisions

- **Un buen test comprueba el comportamiento observable desde fuera** (dado este backlog y esta fecha, esta propuesta; dada esta acción de este actor, este estado o este error), no los detalles internos de la implementación.
- **Con tests automáticos**:
  - ciclo de vida del tema;
  - priorización y selección;
  - planificador de hitos, incluidos los cambios de hora de marzo y octubre, las semanas sin sesión y la ausencia de jcoto;
  - redacción de mensajes;
  - redacción del acta.
- **Generador de borradores**: un test con notas de Gemini de ejemplo, anonimizadas. Comprueba que el resultado se separa por tema y cumple el formato (resumen, acuerdos, siguientes pasos con encargado). No juzga la calidad del texto.
- **Adaptadores**: se prueban a mano, con un recorrido completo en el entorno de pruebas antes de pasar a DELUX.
- **Entorno de pruebas**, que debe estar listo antes de la primera semana en DELUX:
  - un espacio de Chat de pruebas con jcoto y, si es posible, Fer;
  - un evento recurrente de prueba;
  - un registro y un acta de prueba;
  - hitos que se lanzan a mano, para recorrer una semana entera en una tarde: proponer, seleccionar, confirmar con un responsable que no responde, anunciar, cancelar, generar el borrador y validar con cada una de las cuatro respuestas.
- **Criterio para pasar a DELUX**: el recorrido completo funciona en pruebas sin intervención manual, salvo los botones.
- **Precedentes**: el proyecto no tiene tests propios todavía. La lógica pura se escribe sin dependencias de Apps Script para poder probarla en local.

## Out of Scope

- **El ritual Design Chapter** (viernes alternos). Se hará después, como segunda configuración y con lo aprendido en la Design Review.
- **La migración de la Sheet antigua.** No se migra ningún tema. Una revisión puntual de DELUX y de las últimas 5 actas de Design Review y Design Chapter, para encontrar temas, se hará como tarea aparte. Los temas que salgan se darán de alta como temas asignados.
- **Escribir en el documento de Fer** ("Notas - Design Review"). Queda como histórico.
- **Una interfaz propia fuera de Chat.** La Sheet en modo lectura hace de vista del backlog.
- **Métricas automáticas.** Los criterios de éxito se revisan a mano tras 6 sesiones.
- **La reserva de sala para la sesión.**

## Further Notes

- **Criterios de éxito**, revisados tras 6 sesiones en la propia Design Review como un tema más, de tipo *abrir debate*:
  1. el anuncio sale a tiempo todas las semanas en las que hay sesión;
  2. al menos 4 de los 5 PD proponen algún tema;
  3. el 80 % de los temas tratados tienen el acta validada antes del jueves a las 12:00;
  4. ningún tema supera 6 semanas en el backlog sin seleccionarse ni descartarse.
- **Dependencias pendientes de jcoto:**
  - vincular la facturación al proyecto, si hace falta con el visto bueno interno;
  - activar la toma de notas automática de Gemini en el evento recurrente (sin verificar en el Workspace de Civitatis);
  - crear la unidad compartida "Chapter UX";
  - añadir a Fer como propietario del proyecto;
  - buscar sala.
- **Alternativa al generador de borradores**: si los borradores de Gemini salen flojos, se puede cambiar a la API de Claude. Usar la suscripción personal de jcoto mediante una tarea programada de Claude Code es posible, pero vuelve a atar la app a una sola cuenta.
- **Proyecto existente `ux-chapter-status`**: tiene la Chat API activa y no se usa para esta app.
