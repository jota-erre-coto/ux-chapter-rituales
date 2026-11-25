# Revisión de textos: test guiado (25/11/2026)

Test de dogfooding de Ana sobre el one-pager y el recorrido de una semana con los textos reales de la app. Pendiente de aprobación de jcoto antes de aplicarlo.

Nota: me baso en el one-pager, el glosario y el recorrido. No he abierto la guía completa de `knowledge/`. Aplico las reglas de mi prompt y marco como criterio propio lo que no está documentado. El recorrido termina el martes: los pasos 5 y 6 (borrador y acta) no tienen textos todavía y no se pueden probar.

## 1. Problemas graves de comprensión, por impacto

**1. Un tema con los valores por defecto queda excluido sin que nadie lo diga (Lucía).**
- Mensajes: diálogo `/tema`, «Tema guardado» y «Propuesta sin temas».
- «Preparación» viene marcada como «Falta preparación». El one-pager dice que ese estado "nunca entra en la propuesta".
- Lucía rellena el título, pulsa «Proponer tema» y cree que ya participa. Nada le avisa de que ese valor lo deja fuera.
- La nota «**Opcional.** Puedes completarlo…» está antes de Urgencia, Preparación, Contexto y Enlace. No dice a cuáles se refiere, así que parece cubrir también Preparación.
- Jota recibe luego «No hay ningún tema preparado en el backlog» y no sabe si faltan temas o si hay temas bloqueados por este valor.

**2. Después de proponer hay silencio, y el aviso del martes puede no llegarle (Lucía).**
- Mensajes: «Tema guardado en el backlog», «Convocatoria» y ausencia de mensajes.
- «Guardado en el backlog» no dice cuándo se elige (lunes a las 13:00) ni que sin elegir pasa a la semana siguiente. Tampoco dice que la urgencia sube sola.
- Si el tema no entra, nadie se lo comunica. Si entra, se entera el martes a las 11:00 por mensaje privado.
- Ese mensaje privado solo llega si ha abierto un chat con la app. Solo Jota lo sabe, y únicamente al asignar («todavía no ha abierto un chat»). Lucía no tiene ningún aviso de que lo necesita. El one-pager tampoco lo cuenta.

**3. Los mensajes a responsables prometen cosas que quizá no pasan o callan las consecuencias (Lucía, Marcos).**
- Mensajes: «Petición de confirmación», «Aviso de asignación», «Aviso al sustituto» y «No puedo».
- «Pulsa "No puedo" y entrará otro tema en su lugar» es una promesa. No se cumple si no hay sustituto o si Jota pulsa «No sustituir».
- La petición no dice qué pasa si Lucía no responde. Tampoco que «Lo llevo» es un compromiso de tenerlo preparado (la definición del glosario).
- En el diálogo de confirmación, Contexto y Enlace no indican si son obligatorios. La petición dice «completa»; el alta dijo «Opcional».
- El aviso de asignación dice «Es un compromiso» y calla que Marcos podrá responder «No puedo» el martes. El one-pager dice que no puede rechazarla. Marcos no sabe cuál de las dos es verdad.
- Lucía, cuyo tema es sustituido, no recibe aviso de que su tema ha salido de la sesión. El sustituto recibe «de otro que no podrá presentarse» y no tiene salida si tampoco puede (en el ejemplo es la misma Lucía).

**4. Jota y Fer deciden sin saber el plazo ni el efecto (Jota/Fer).**
- Mensajes: «Oferta de sustituto», «Sesión sin temas», «Propuesta sin confirmar», «Propuesta sin temas» y «Sin temas decidido».
- La oferta por falta de respuesta llega a las 11:45 y el anuncio sale a las 12:00. El mensaje no dice «decide antes de las 12:00» ni qué pasa si no decide.
- Los botones no explican su efecto. «Sustituir» no dice quién sustituye a quién. «No sustituir» no dice que el tema sale de la sesión.
- «Cancelar la sesión» no aclara si toca el evento del calendario. Jota puede creer que sí.
- «Propuesta sin confirmar» llega como mensaje cerrado, sin acción posible. No dice si el tema queda en el backlog.
- «Propuesta sin temas» muestra un único botón («Añadir tema») con la frase «Si no la confirmas…», cuando no hay nada que confirmar.
- «Oferta sin sustituto posible» dice «no puede presentar» aunque la causa sea que no respondió, si se reutiliza el texto.
- La razón por la que Fer recibe la propuesta aparece a mitad del mensaje. De las demás excepciones solo conocemos el texto de la propuesta, así que no sé si Fer recibe la razón en el resto.

**5. Jerga e IDs sin contexto (todos).**
- Términos: backlog, propuesto, seleccionado, sustituto, «sesión abierta» (sin definir en ningún sitio), «45 de 60 minutos» (sin sujeto) y «Resto del backlog».
- «Lista» suelto en `· urgencia 3 · Lista` se lee como sustantivo, no como «preparación lista».
- «La tendré para la sesión» (primera persona) aparece dentro de líneas en tercera persona dirigidas a Jota.
- Todos los mensajes abren con DR-0xx. Nadie lo usa para nada (ningún comando lo pide). «Sustitutos si alguien no confirma: DR-019» obliga a Jota a recordar de qué tema se trata.
- El one-pager usa «hitos» y la app no.
- Para PDs «backlog» se entiende. Lo que falta es una definición en el primer contacto: la lista de temas que esperan sesión.

**6. «Mis temas» del organizador se contradice (Jota/Fer).**
- Mensaje: «Mis temas (organizador)».
- Muestra «No tienes temas» y debajo una lista con el encabezado «Resto del backlog». «Resto» presupone un primer grupo que no existe.
- Jota puede descartar temas de otros. El diálogo de descarte no dice si se avisa al responsable ni que no se puede deshacer.

**7. Un mismo concepto con varios nombres (Lucía, comparando el one-pager con la app).**
- Acta, «Documento de sesiones» y «Ver acuerdos anteriores» designan lo mismo.
- «Propuesta de selección» (one-pager) frente a «Propuesta de temas» (app).
- «Añadir tema» frente a «Proponer tema», para la misma acción.
- Cuatro formulaciones de una acción: «Dejar solo uno» / «Quedarse con un solo tema» / «Quedarse con este».
- «Responsable:» en el hilo frente a «responsable:» en las tarjetas.
- Jota aparece como «jcoto», «Jota Coto» y «Jota».

## 2. Reescrituras

Notas: `…` indica que se mantiene la tarjeta de datos tal cual. La palabra «backlog» se conserva (definida una vez, en el guardado). Los estados («propuesto» → «en espera») son recomendación propia, fuera del glosario. Donde el texto depende de comportamiento que no conozco, lo marco «verificar».

| Mensaje | Texto actual | Propuesta | Motivo |
|---|---|---|---|
| Alta · Preparación | Valor marcado: «Falta preparación» | Sin valor marcado. Ayuda: «Un tema con "Falta preparación" no entra en la propuesta del lunes. Puedes cambiarlo después en /mis-temas.» | Evita la exclusión silenciosa. Si producto mantiene el valor por defecto, la ayuda es obligatoria. |
| Alta · nota | «**Opcional.** Puedes completarlo ahora o cuando confirmes el tema.» | Colocarla justo sobre Contexto y Enlace: «**Opcional.** Puedes añadir el contexto y el enlace ahora o al confirmar tu tema.» | Hoy parece cubrir también Urgencia y Preparación. |
| Alta · Urgencia | «Urgencia (1 = puede esperar, 5 = lo necesito ya)» | Etiqueta «Urgencia». Ayuda: «1 = puede esperar, 5 = lo necesito ya. Sube un punto cada 3 semanas que el tema espera.» | Cumple la promesa del one-pager y evita inflarla. |
| Alta · error | «Escribe el tema.» | «Escribe un título para el tema.» | El campo se llama «Título». |
| Tema guardado | «Tema DR-021 guardado en el backlog: «Filtros…». Decidir entre opciones · 30 min · urgencia 3 · Lista.» | «Tema guardado: «Filtros del listado de actividades» (DR-021).<br>Decidir entre opciones · 30 min · urgencia 3 · preparación lista.<br>Queda en el backlog, la lista de temas que esperan sesión. El lunes a las 13:00 se elige qué temas van a la sesión del miércoles. Si el tuyo entra, te lo diremos el martes a las 11:00.» | Responde cuándo y cómo se entera. Título antes que ID. Define backlog. |
| Alta (fuera de la lista) | Sin mensaje de primer uso | Una línea (verificar mecanismo real): «Para recibir avisos de la app, abre un chat con ella.» | Sin chat abierto no llega el aviso del martes. |
| Aviso de asignación | «Jota Coto te ha asignado el tema DR-022…: «…». Es un compromiso: cuando se seleccione para una sesión, te pediremos que confirmes que lo llevas. Puedes verlo y editarlo con /mis-temas.» | «Jota Coto te ha asignado el tema «Microcopy del checkout de agencias» (DR-022) para la Design Review. Eres su responsable: lo preparas y lo presentas.<br>Cuando entre en la propuesta de una sesión, te pediremos que confirmes que lo llevas o que avises de que no puedes.<br>Revisa sus datos y edítalos con /mis-temas.» | Elimina «seleccionar» y «compromiso». Da una salida. |
| Asignar sin aviso (Jota) | «No se ha podido avisar a Marcos Ruiz: todavía no ha abierto un chat con la app. Avísale tú.» | «No se ha podido avisar a Marcos Ruiz: todavía no ha abierto un chat con la app. Díselo tú. Mientras no lo abra, no recibirá la petición de confirmación del martes.» | Añade la consecuencia (verificar que abrir chat lo resuelve). |
| Mis temas (organizador) | «No tienes temas. … ## Resto del backlog. Como organizador o suplente, puedes descartar estos temas.» | «No tienes temas propios. Usa /tema para proponer uno.<br>## Temas del resto del Chapter<br>Puedes descartarlos si dejan de tener sentido.» | Quita la contradicción y «resto». |
| Mis temas · estado | «DR-021 · 10 nov 2026 · propuesto» | «DR-021 · creado el 10 nov 2026 · en espera de sesión» | «Propuesto» y la fecha sin etiqueta no se entienden. |
| Descartar (diálogo) | Título «Descartar DR-021». «¿Descartas «…»? Saldrá del backlog y no se tratará en ninguna sesión.» | Título «Descartar tema». «¿Descartas «…» (DR-021)? Saldrá del backlog y no se tratará en ninguna sesión. Si cambias de idea, tendrás que proponerlo de nuevo.» Para el organizador, añadir si se avisa al responsable (verificar). | Reversibilidad y efecto sobre el responsable. |
| Convocatoria | «Si tienes algo que llevar, propónlo antes de las 13:00 de hoy. Lo que llegue después entrará en la selección de la semana siguiente.» | «Si quieres traer un tema, propónlo antes de las 13:00 de hoy y lo tendremos en cuenta para esta sesión. Si llega más tarde, se valorará para la siguiente.» | Sin «selección». No promete entrar. |
| Propuesta de temas (Jota) | Tras las tarjetas: «45 de 60 minutos. Sustitutos si alguien no confirma: DR-019. Si no la confirmas antes del martes a las 11:00, no se pedirá confirmación a nadie ni se anunciará nada.» | «Ocupan 45 de los 60 minutos de la sesión.<br>Sustitutos si alguien no confirma: «Iconografía de categorías» (DR-019).<br>Confírmala antes del martes a las 11:00. Al confirmar, el martes a las 11:00 pediremos a cada responsable que confirme su tema. Si no la confirmas, esta semana no se anunciará ningún tema.» | Plazo y efecto de «Confirmar» antes que la doble negación. |
| Propuesta · tarjetas | `urgencia 3 · Lista` / `… · La tendré para la sesión` | `urgencia 3 · preparación lista` / `urgencia 3 · preparación: la tendrá para la sesión` | «Lista» suelto es ambiguo. La primera persona no encaja en tercera. |
| Propuesta al suplente | «Te llega a ti porque Jota Coto está fuera de la oficina.» a mitad del mensaje | Moverla a la primera línea. Repetirla en todas las excepciones que reciba Fer (verificar). | Cada mensaje debe decir por qué te llega. |
| Propuesta sin temas | «No hay ningún tema preparado en el backlog. Si no añades uno… 0 de 60 minutos. Si no la confirmas antes…» | «No hay ningún tema del backlog con la preparación necesaria: los de «Falta preparación» no se proponen.<br>Añade uno antes del martes a las 11:00 o esta semana no habrá temas que anunciar.<br>Ocupan 0 de los 60 minutos de la sesión.»<br>Botón «Proponer tema». | Quita la frase sin sentido. Nombra la causa probable. Mismo verbo que en el resto de la app. |
| Cambiar tema (diálogo) | «Sale de la propuesta» con la opción «Ninguno: añadirlo si cabe». «Entra en su lugar». | «Quitar de la propuesta» con la opción «Ninguno (solo añadir si cabe)». «Añadir en su lugar». | Ahora una opción de «Sale» añade. |
| Dejar solo uno | Botón «Dejar solo uno». Título «Quedarse con un solo tema». Botón final «Quedarse con este». | Título «Dejar solo un tema». Campo «Tema que se queda (tendrá toda la sesión)». Botón «Dejar solo este». | Un mismo verbo en los tres puntos. |
| Propuesta confirmada | «Propuesta confirmada por Jota Coto para… 45 de 60 minutos.» | «Propuesta confirmada para la Design Review del miércoles 25 de noviembre. […] El martes a las 11:00 pediremos a cada responsable que confirme su tema.» | El nombre propio sobra. Falta el siguiente paso. |
| Propuesta sin confirmar | «…sigue sin confirmar. Esta semana no se pedirá confirmación a los responsables ni se anunciará nada.» | «La propuesta de temas para la Design Review del miércoles 25 de noviembre no se ha confirmado, así que esta semana no habrá anuncio. Los temas siguen en el backlog.» (verificar) | «Sigue sin» sugiere que aún se puede actuar. |
| Petición de confirmación | «Tu tema DR-021 está en la Design Review…: «…». Confírmalo antes de las 11:45 de hoy. Si no puedes llevarlo, pulsa «No puedo» y entrará otro tema en su lugar.» | «Tu tema «Filtros del listado de actividades» (DR-021) entra en la Design Review del miércoles 25 de noviembre.<br>Confirma antes de las 11:45 de hoy que lo llevas preparado: tendrás 30 min.<br>Si no puedes, pulsa «No puedo» y se decidirá si otro tema ocupa su lugar. Si no respondes, también.» | Sin promesa. Dice qué pasa si callas. |
| Completar antes de confirmar | Título «Confirmar DR-021». «Confirmas que llevas **DR-021 · …**». Campos sin marca. | Título «Confirmar tu tema». «Confirmas que llevas **«Filtros del listado de actividades»** (DR-021). Añade el contexto y el enlace para que el Chapter llegue preparado.» Marcar cada campo como «opcional» o «obligatorio» (verificar). | Coherente con la nota del alta. |
| Lo llevo | «Confirmado: llevas DR-021 «…» a la Design Review del miércoles 25 de noviembre.» | «Confirmado: llevas «Filtros del listado de actividades» (DR-021) a la Design Review del miércoles 25 de noviembre. Hoy a las 12:00 se anuncia en el espacio y el Chapter podrá dejarte dudas en el hilo del tema.» | Siguiente paso. |
| No puedo | «Hecho: DR-021 «…» no irá a esta sesión y vuelve al backlog.» | «Entendido: «Filtros del listado de actividades» (DR-021) no irá a la sesión del miércoles 25 de noviembre y vuelve al backlog. Puedes verlo en /mis-temas.» | «Hecho» no dice qué se hizo. |
| Oferta de sustituto | «Lucía Pérez no puede presentar DR-021 «…». [Sustituto…] Botones: [Sustituir] [No sustituir]» | «Lucía Pérez no puede presentar «Filtros del listado de actividades» (DR-021).<br>Tema que lo sustituiría: […]. Si es del mismo responsable, indicarlo: «también de Lucía Pérez».<br>Decide antes de las 12:00, cuando se anuncia la sesión. Si no sustituyes, el tema sale de la sesión.» | Plazo, efecto y claridad cuando el responsable del sustituto es el mismo. |
| Aviso al sustituto | «…entra… como sustituto de otro que no podrá presentarse. Como lo tenías listo, no hace falta que lo confirmes.» | «Tu tema «Iconografía de categorías» (DR-019) entra en la Design Review del miércoles 25 de noviembre porque otro tema no podrá presentarse. Como lo tenías listo, no hace falta que lo confirmes. Se anuncia hoy a las 12:00. Si no puedes llevarlo, avisa antes a quien organiza la sesión.» | Da salida (canal a definir) y hora del anuncio. |
| Sesión sin temas | «No queda ningún tema confirmado… ¿Cancelas la sesión o la anuncias como sesión abierta, sin temas preparados?» | «No queda ningún tema confirmado para la Design Review del miércoles 25 de noviembre. Decide antes de las 12:00: cancelar la sesión o anunciarla como abierta, sin temas, para que cada persona traiga lo que quiera comentar.» | Define «sesión abierta» y da plazo. |
| Sin temas decidido | «Decidido: esta semana se cancela la sesión. Se avisará en el espacio a la hora del anuncio.» / «Decidido: la sesión se anunciará como abierta, sin temas preparados.» | «Sesión cancelada. Se avisará en el espacio hoy a las 12:00.» (añadir si el evento del calendario se toca o no) / «Sesión abierta: hoy a las 12:00 se anunciará en el espacio sin temas confirmados.» | «Decidido» no es resultado. Aclara el calendario. |
| Anuncio | «La sesión la facilita Jota Coto. Temas (45 min): … Cada tema tiene su hilo justo debajo: deja ahí tus dudas antes de la sesión.» | «Design Review del miércoles 25 de noviembre, a las {hora}. La facilita Jota Coto.<br>Temas de la sesión (45 min): …<br>Cada tema tiene su hilo: deja ahí tus dudas antes de la sesión.» | Quita «justo debajo» (no está garantizado). Añadir hora si el dato existe (verificar). |
| Hilo del tema | «Antes de la sesión: Revisa la propuesta y apunta lo que te haga dudar.» Tarjeta «Responsable:». | «Revisa el contexto y deja tus dudas en este hilo.» Tarjeta «responsable:». | «Propuesta» no encaja con «Informar» ni «Abrir un debate». Dos verbos distintos para la misma acción. |
| Sesión abierta | «…sesión abierta, sin temas preparados… Trae lo que tengas entre manos y lo vemos en el momento.» | «Design Review del miércoles 25 de noviembre: esta semana la sesión es abierta y no hay temas confirmados. La facilita Jota Coto.<br>Si quieres comentar algo, tráelo y lo vemos entre todos.» | «Sin temas preparados» suena a fallo. «Lo que tengas entre manos» es vago. |
| Cancelación | «Los temas seleccionados pasan con preferencia a la próxima sesión.» | «Los temas que iban a tratarse siguen en el backlog, con preferencia para la próxima sesión.» | Sin «seleccionados». |
| Temas aplazados | «Los temas seleccionados (DR-021, DR-022) vuelven al backlog con preferencia…» | ««Filtros del listado de actividades» (DR-021) y «Microcopy del checkout de agencias» (DR-022) vuelven al backlog, con preferencia para la próxima sesión.» Añadir si se avisa a sus responsables (verificar). | Títulos, no solo IDs. |

## 3. Desajustes entre el one-pager y la app

Se corrige en el documento indicado.

1. **Rol de Jota y Fer (one-pager).** El one-pager dice «solo recibe las excepciones» y «solo deciden las excepciones». La app le exige a Jota confirmar la propuesta cada lunes antes del martes a las 11:00, y sin eso no hay anuncio. Decir: «confirma la propuesta cada lunes y decide las excepciones». Añadir ese plazo.
2. **Chat con la app (one-pager y app).** Hace falta tener un chat abierto con la app para recibir avisos privados. El one-pager no lo cuenta y solo Jota lo ve en la app.
3. **`/tema` (one-pager).** Dice «título, tipo de feedback y duración». El diálogo tiene siete campos, con Preparación preseleccionada. Listarlos, marcar los opcionales y explicar el efecto de «Falta preparación». La app debe corregir el valor por defecto.
4. **Nombre del paso 2 (one-pager).** El one-pager dice «Propuesta de selección» y la app «Propuesta de temas». Unificar a «Propuesta de temas» en lo visible y dejar «selección» solo en el glosario.
5. **Acta (ambos).** Hay tres nombres: acta, «Documento de sesiones» y «Ver acuerdos anteriores». Recomiendo mantener el botón y decir en el one-pager «enlace al acta (botón «Ver acuerdos anteriores»)». Decisión de producto.
6. **Casos no cubiertos (one-pager).** La app tiene estos flujos y el one-pager solo cuenta el camino feliz:
   - «No puedo».
   - «No sustituir» y falta de sustituto.
   - Sesión sin temas: cancelar o abrir.
   - Cancelación.
   - Temas aplazados por sesión eliminada del calendario.
   - Descarte de temas ajenos por el organizador.
   - Añadir un bloque corto «Si algo falla».
7. **Temas asignados (producto decide).** El one-pager dice «no puede rechazarlo». La app permite pulsar «No puedo» en la confirmación del martes. Aclarar qué puede y qué no puede hacer quien recibe una asignación.
8. **Excepciones a Fer (app).** El one-pager dice que Fer recibe «la propuesta y las excepciones». Solo consta la razón («Te llega a ti porque…») en la propuesta. Repetirla en el resto.
9. **Nombres de personas (one-pager).** Usa «jcoto» y «Jota Coto»; la app dice «Jota» y «Jota Coto». Unificar en «Jota» y «Fer».
10. **«Hitos» y pasos no disponibles (one-pager).** «Seis hitos automáticos» no aparece en la app (usar «pasos»). Los pasos 5 y 6 se muestran como activos y están pendientes según la sección Estado. Marcarlos «Aún no disponible» (no «Próximamente», que la guía veta).
11. **KPIs (one-pager).** «4 de 5», «80 %» y «6 semanas como máximo» se leen como resultados. Etiquetarlos «Objetivo». Además, con +1 de urgencia cada 3 semanas, un tema de urgencia 1 solo llega a 3 en 6 semanas. Eso no garantiza el máximo de 6 semanas. Revisar la afirmación.
