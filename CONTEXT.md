# CONTEXT — Design Review del Chapter de UX

Glosario del dominio. Solo terminología, sin detalles de implementación.

## Términos

- **Tema**: cuestión que una persona del Chapter quiere llevar a la Design Review para recibir feedback o cerrar una decisión. Tiene un responsable, urgencia, esfuerzo, duración estimada, tipo de feedback, preparación y estado. Un tema puede tratarse en más de una sesión.

- **Ritual**: reunión recurrente del Chapter con su propio ciclo de temas. Cada ritual tiene su evento, su calendario de hitos (convocatoria, propuesta, confirmación, anuncio), su backlog y su acta, y no comparte ninguno con otro ritual. Hoy está definido uno: la **Design Review**. El **Design Chapter** será el segundo, con su propio calendario: viernes alternos, mismos invitados.

- **Tema aplazado**: tema seleccionado que no llegó a tratarse, porque la sesión se canceló o porque no hubo tiempo. Vuelve a *propuesto* con preferencia para la sesión siguiente. No es un tema reabierto: un tema aplazado no se ha discutido.

- **Chapter**: a efectos de la Design Review, las personas que son miembros del espacio DELUX (solo Product Designers y jcoto). Se identifican por su email corporativo, nunca por su nombre.

- **Responsable**: persona del Chapter que trae un tema y responde de él de principio a fin: lo presenta, confirma que está preparado, valida las conclusiones y decide si hubo acuerdo. Su responsabilidad no depende de que jcoto asista a la sesión.
  _Evitar_: «Autor» (solo indica quién lo escribió), «Informador» (Sheet antigua; solo indica quién avisó).

- **Proponente**: persona que da de alta un tema. Normalmente coincide con el responsable. No coincide cuando el tema es asignado.

- **Tema asignado**: tema que jcoto (o el suplente, en su ausencia) da de alta con otra persona como responsable. La asignación es directa: el responsable queda notificado y no puede rechazarla. El tema conserva la marca de que fue asignado, para que se distinga de los temas propuestos por su propio responsable.

- **Sesión**: cada ocurrencia de la Design Review semanal del Chapter, organizada por jcoto (miércoles, desde el 14 de octubre de 2026). Tiene fecha, temas seleccionados, participantes y acuerdos. La serie anterior, organizada por Fer, no forma parte del dominio.

- **Suplente**: persona que asume las funciones de jcoto en la Design Review cuando está ausente: confirmar la propuesta de selección, recibir las excepciones y facilitar la sesión. Es fijo: Fer.

- **Documento de sesiones**: acta única, persistente y acumulada de todas las sesiones, con la más reciente primero. Recoge por sesión la fecha, los participantes, quién facilitó y, por cada tema tratado, sus acuerdos o lo que falta para cerrarlo. Es de solo lectura: se escribe una vez, cuando el responsable valida. Sustituye a «Notas - Design Review» (el documento de Fer), que queda como histórico.
  _Evitar_: un documento por sesión.

- **Registro de temas**: inventario de todos los temas en cualquier estado, con sus atributos y las sesiones en las que se trataron. Es la única fuente de verdad sobre el estado de un tema. El backlog es la parte del registro con temas propuestos o reabiertos.

- **Convocatoria**: llamada semanal a todo el Chapter para proponer temas para la próxima sesión, con una ventana corta para hacerlo. Alimenta el backlog con lo surgido esa semana, aunque el backlog esté vacío.

- **Backlog de temas**: conjunto de temas propuestos o reabiertos que todavía no tienen sesión asignada. Es la fuente desde la que se seleccionan los temas de cada sesión.

- **Propuesta de selección**: lista de temas candidatos que se presenta a jcoto tras cerrar la convocatoria, ordenados por prioridad y ajustados a la duración de la sesión. jcoto la confirma o la modifica: la propuesta no es una decisión.

- **Confirmación del responsable**: respuesta del responsable de un tema seleccionado que garantiza que lo trae preparado y puede presentarlo. Solo los temas confirmados se anuncian.

- **Sustituto**: siguiente candidato de la propuesta, que ocupa el hueco de un tema cuyo responsable no confirma. Solo puede ser sustituto un tema con preparación *Lista*.

- **Anuncio**: mensaje publicado en DELUX el día anterior a la sesión con los temas confirmados.

- **Hilo del tema**: conversación en DELUX asociada a un tema anunciado, para dudas y comentarios antes de la sesión. Es una fuente secundaria del borrador de conclusiones, después de las notas de la sesión.

- **Duración estimada**: tiempo que el responsable calcula que necesita su tema en la sesión. Determina cuántos temas caben en la sesión.

- **Tipo de feedback**: lo que el responsable necesita obtener de la sesión (decidir entre opciones, validar una propuesta, abrir un debate, informar). Determina cómo se facilita el tema y qué cuenta como acuerdo.

- **Preparación**: declaración del responsable sobre si tiene el material listo para presentar: *Lista*, *La tendré para la sesión* o *Falta preparación*. No es un estado del ciclo de vida. Un tema con *Falta preparación* no puede ser candidato. El requisito definitivo es la confirmación del responsable antes del anuncio.

- **Urgencia**: necesidad de tratar un tema pronto, de 1 a 5. La declara el responsable al proponerlo y aumenta sola con la antigüedad del tema en el backlog.

- **Antigüedad**: tiempo que un tema lleva en el backlog sin seleccionarse. Hace que ningún tema viva indefinidamente en el backlog, incluidos los de baja urgencia como las demos.

- **Prioridad**: orden sugerido dentro del backlog. Es la urgencia, y a igual urgencia gana la antigüedad. Es una ayuda para seleccionar, no una decisión.
  _Evitar_: «Esfuerzo». Se eliminó porque su parte de tiempo en sesión la cubre la duración estimada y penalizaba de forma sistemática los temas poco urgentes.

- **Borrador de conclusiones**: propuesta de resumen, acuerdos y siguientes pasos de un tema, extraída de las notas de la sesión. No es un registro: no entra en el documento de sesiones hasta que el responsable lo valida.

- **Acuerdo**: decisión o criterio que la sesión da por cerrado sobre un tema, validado por su responsable. Un tema sin acuerdos no puede estar resuelto.

- **Siguiente paso**: acción concreta derivada de un tema, con un encargado. Es distinto del acuerdo: el acuerdo es lo decidido y el siguiente paso es lo que hay que hacer.

- **Encargado**: persona que debe ejecutar un siguiente paso. Puede no coincidir con el responsable del tema.
  _Evitar_: «responsable» para el dueño de una acción. Ese término está reservado al tema.

## Ciclo de vida de un tema

`propuesto → seleccionado → tratado → resuelto | reabierto`, y `descartado` desde cualquier estado previo a resuelto.

- **Propuesto**: el tema está en el backlog.
- **Seleccionado**: el tema está elegido para una sesión concreta. Es lo que se anuncia el día anterior.
- **Tratado**: la sesión se ha celebrado y el borrador de conclusiones está pendiente de validar por el responsable.
- **Resuelto**: el responsable ha validado acuerdos para el tema.
- **Reabierto**: el responsable declara que no hubo acuerdo y el tema vuelve al backlog. Conserva el vínculo con las sesiones en las que ya se trató.
- **Descartado**: el tema deja de tener sentido. Puede descartarlo su responsable, jcoto o el suplente. No cuenta como resuelto.

_Evitar_: usar «resuelto» para un tema que solo se ha tratado. Tratar un tema no implica cerrarlo.
