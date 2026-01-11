# Estructura de la Presentación: "Qué Hay Pa' Hacer"

Esta estructura está diseñada para contar una historia convincente sobre el problema de la difusión cultural y cómo la IA ofrece una solución escalable.

## 1. Introducción y Motivación (2-3 minutos)
*   **El Problema Local:** Cali posee una inmensa riqueza cultural (salsa, teatro, gastronomía), pero la información está dispersa y es difícil de encontrar.
*   **El Contexto Nacional:** Esta problemática no es exclusiva de Cali; ciudades principales como Barranquilla, Cartagena y Medellín enfrentan el mismo vacío. Bogotá es la única excepción con agendas consolidadas.
*   **Motivación del Proyecto:**
    *   El objetivo no fue solo cumplir un requisito académico, sino generar un **impacto real**.
    *   **Estado Actual:** El proyecto está desplegado en producción (`pahacer.com`) y ya cuenta con usuarios reales utilizando la plataforma.

## 2. La Solución Tecnológica (2-3 minutos)
*   **Visión General:** Una plataforma web moderna y centralizada.
*   **Stack Tecnológico:**
    *   **Core:** Next.js (Frontend y Backend en un monorepo).
    *   **Datos:** Supabase (PostgreSQL) para persistencia y autenticación.
    *   **El Motor de Innovación:** Integración de modelos de IA de Google (Gemini) directamente en el backend.

## 3. Innovación: Minería de Datos Semántica (3-4 minutos)
*   **El Desafío del Scraping Tradicional:** Explicar la fragilidad de los selectores CSS y cómo cualquier cambio visual rompe los scripts tradicionales.
*   **La Solución con IA:**
    *   Uso de LLMs para "leer" y "entender" el HTML como lo haría un humano.
    *   **Structured Output:** Cómo forzamos al modelo a entregar JSON limpio y listo para la base de datos.

## 4. Desafíos Técnicos Encontrados (3-4 minutos)
*   **Alucinaciones:** Casos donde el modelo "inventaba" precios o fechas cuando la información en la fuente era ambigua o inexistente.
*   **Manejo del Tiempo:** La dificultad de detectar y descartar eventos que, aunque siguen publicados en la web fuente, ya ocurrieron (eventos pasados).
*   **Páginas Dinámicas (SPA):** Limitaciones del agente actual para minar sitios que generan su contenido vía JavaScript (Client-Side Rendering) en lugar de HTML estático.

## 5. Calidad y Seguridad (2 minutos)
*   **Enfoque Híbrido de Integridad:**
    *   **Para Minería:** *Human-in-the-loop*. La IA extrae, pero un humano valida para mitigar alucinaciones.
    *   **Para Usuarios:** Moderación en tiempo real. La IA analiza títulos y descripciones para bloquear contenido ofensivo instantáneamente.

## 6. Conclusiones y Futuro (1-2 minutos)
*   **Resultados:**
*   **Cierre:** La IA está muy próxima a ser capaz de mantener una aplicación de difusión de eventos sin intervención humana.

---

# Guión

[Diapositiva con el título del proyecto] Reciban todos un cordial saludo. Mi nombre es David Orozco y les voy a exponer mi proyecto de este semestre en Inteligencia Artificial Aplicada.

[Plano de la ciudad de Cali. La canción Cali Ají suena en el fondo, apenas audible] Quiero comenzar hablándoles de una problemática que creo existe hoy día en Cali. Nuestra ciudad tiene una oferta cultural inmensa: festivales de salsa y teatro, competiciones internacionales de baile, el festival Petronio, la feria de Cali. Sin embargo, paradójicamente, no existe un lugar centralizado donde podamos consultar la oferta de conciertos, obras de teatro o festivales. La información se encuentra fragmentada, dispersa en redes sociales o en sitios web que difícilmente consultamos. En otras palabras, estamos desperdiciando nuestra riqueza cultural.

[Se muestran fotos del Carnaval de Barranquilla, la ciudad amurallada de Cartagena y el metro de Medellín] Y este no es un problema exclusivo de Cali. Si miramos hacia otras grandes capitales como Barranquilla, Cartagena o Medellín, el panorama es similar: una gran riqueza cultural desconectada de sus ciudadanos. Curiosamente, Bogotá es la única excepción en el país que cuenta con agendas culturales consolidadas.

[Se muestra la aplicación con los eventos en la ciudad de Cali próximos en el calendario; un usuario hace click para agregar un evento a sus favoritos; hace lo mismo con otros eventos; se muestra la lista de favoritos] De esta necesidad nace la aplicación web "¿Qué Hay Pa' Hacer?". Esto es, con el objetivo de proveer a la ciudad de una agenda cultural consolidada. Esta plataforma se encuentra ya desplegada en producción, es accesible públicamente desde la página web pahacer.com, y lo más importante: ya existen usuarios usándola para descubrir eventos culturales en su ciudad. Además, en ella los caleños pueden encontrar una gran variedad de eventos que pueden guardar en su lista de favoritos o compartir con otras personas interesadas.

[Fondo típico del desarrollo de software (servidores, pantallas con código, etc)] Desarrollé esta plataforma usando el framework Next.js con React para la interface del usuario y Node.js para la lógica del servidor. Para garantizar la seguridad y la persistencia de los datos, implementé Supabase, que provee una base de datos relacional confiable y un sistema de autenticación seguro. Pero lo que hace realmente valiosa a la aplicación es el uso de la inteligencia artificial para recolectar y procesar la información de los eventos de manera automática.

[Imagen de varias personas trabajando en una oficina] Históricamente, el mayor obstáculo para mantener una agenda cultural actualizada ha sido el costo operativo. Tener un equipo de personas revisando diariamente cientos de sitios web, copiando y pegando información, es un proceso lento, costoso y propenso a errores humanos. Esta barrera económica es la razón principal por la que muchos intentos anteriores de crear directorios de eventos han fracasado con el tiempo.

[Un robot humanoide de color blanco brillante sentado reflexionando. El robot tiene estampado un logo de Google en el pecho] Para romper esta barrera, integré los modelos Gemini de Google directamente en el núcleo del backend. No usé la inteligencia artificial como un simple chatbot; la utilicé como un agente autónomo capaz de realizar el trabajo de todo un equipo de digitadores: recolectando, limpiando y estructurando la información dispersa en la web de manera automática y eficiente.

[Imagen de una araña haciendo scraping en la web] Aquí es donde entra la innovación técnica más importante del proyecto. Tradicionalmente, para extraer información de otros sitios web, se ha utilizado una técnica llamada *Web Scraping*. Esto implica escribir código rígido que busca elementos específicos, por ejemplo: "buscar el texto que está dentro del div con la clase `precio-evento`".

[Una persona sosteniendo un castillo de arena en sus manos. El castillo se desmorona y la arena se escapa por entre las manos] El problema es que el *scraping* tradicional es extremadamente frágil. Si el dueño del sitio web decide cambiar el diseño, cambiar un color o renombrar una clase, el sistema se rompe inmediatamente. Mantener cientos de scripts que se rompen cada semana es una pesadilla técnica y operativa que hace inviable el proyecto a largo plazo.

[Bombillo encendido sobre un fondo blanco] La solución consiste implementar un sistema de Minería de Datos Semántica. En lugar de buscar etiquetas específicas, le entrego el código HTML crudo al modelo de Inteligencia Artificial y le pido que "lea" y "entienda" el contenido, tal como lo haría un humano.

[Código de ejemplo de structured output] Utilicé una capacidad de Gemini avanzada llamada *Structured Output*. Esto es crucial porque los modelos de lenguaje suelen ser conversacionales. Con Structured Output, fuerzo al modelo a ignorar el ruido y entregar solamente un objeto JSON como el que se muestra en la imagen, estandarizado y listo para ser guardado en la base de datos. De esta manera, la comunicación con el código de base no se ve afectada, incluso en casos donde el modelo genera alucinaciones.

[Un robot muy juicioso con una lista de to-dos chuleados] Esto da una resiliencia increíble: no importa si la página cambia su diseño visual o su estructura interna; mientras la información esté presente, la IA la encontrará y la extraerá correctamente sin que tenga que cambiar una sola línea de código.

[Diapositiva solo con el texto "Desafíos"] Por supuesto, integrar modelos probabilísticos de IA en un sistema de ingeniería de software determinista trajo consigo desafíos complejos que tuve que resolver.

[Hallucinating robot in a background with psychodelic colors] El primero fue el problema de las "Alucinaciones". En las primeras pruebas, era evidente que si un evento no tenía un precio explícito, el modelo a veces "inventaba" un valor para llenar el campo, o asumía fechas que no estaban en el contexto. Tuve que refinar cuidadosamente los *prompts* y esquemas de validación para "enseñarle" al modelo a reportar `null` cuando no tuviera certeza absoluta.

[A well-organized timeline] Un segundo desafío fue el Manejo del Tiempo. El agente de minería extraía eventos que, aunque seguían publicados en la web fuente, ya habían ocurrido hace meses. Esto ensuciaba la base de datos con información irrelevante. Para solucionarlo, implementé una lógica de post-procesamiento que filtra automáticamente cualquier fecha vencida antes de que llegue a la base de datos.

[A laughing puppet master with his hand manipulating a puppet] Finalmente, la mayor dificultad fue garantizar el soporte de todo tipo de Páginas Dinámicas. El agente actual lee el HTML que entrega el servidor. Sin embargo, muchos sitios modernos (Aplicaciones de Una Sola Página) generan su contenido usando JavaScript en el navegador del usuario. En estos casos, el agente ve una página vacía. Para solucionar esto, utilicé Puppeteer, una herramienta que permite controlar un navegador real de manera programática, renderizando el contenido JavaScript antes de procesarlo.

[Texto sin fondo: "Sistema de integridad"] Dada la naturaleza de la IA y el hecho de que permite contenido generado por usuarios, la seguridad y la calidad de los datos son críticas. Para garantizar esto, implementé un sistema de integridad híbrido.

[Una persona enseñando a un robot atento] Por un lado, está el flujo para la Minería de Datos Semántica. Aquí apliqué un enfoque *Human-in-the-loop*. Aunque la IA hace el 90% del trabajo pesado de extracción, los eventos minados entran inicialmente en un estado de "Revisión". Un humano valida rápidamente que la información sea correcta antes de publicarla. Esto permite mitigar el riesgo de alucinaciones sin perder la velocidad que da la automatización.

[Una persona reflexiona con su mano en el mentón mientras un ángel y un demonio en cada hombre tratan de convencerlo] Por otro lado, está el flujo para los Usuarios. Cuando un ciudadano crea un evento, entra en juego un segundo agente de IA especializado en moderación. Este agente analiza en tiempo real el título y la descripción del evento. Si detecta contenido ofensivo, violencia, discurso de odio o posibles estafas, bloquea la publicación instantáneamente. Es un primer filtro de defensa automatizado que protege a la comunidad las 24 horas del día.

["Conclusiones"] Para concluir, los resultados de esta implementación hablan por sí solos. Lo que les he mostrado no es un prototipo ni un concepto, sino una aplicación web en producción con eventos reales actualizados semanalmente en cinco ciudades diferentes. Esto se logra a través de la eficiencia operativa del sistema de minado. Aunque no tuve la oportunidad de medir el tiempo de carga manual de datos, de acuerdo a mis propias estimaciones, puedo asegurar que el proceso de minado de eventos es por lo menos 4 veces más rápido que el proceso manual.

[Una línea de ensamblaje operada por robots] Este proyecto demuestra que la Inteligencia Artificial no es solo una "feature" llamativa. Es una transformación estructural que permite hacer viables modelos de negocio que antes eran operativamente insostenibles.

Mirando hacia el futuro, creo que existe ya la tecnología para hacer sistemas completamente agénticos, donde la intervención humana sea mínima. En el contexto de este proyecto, La IA está lista para mantener una aplicación de difusión de eventos de manera autónoma, verificando fuentes cruzadas y corrigiéndose a sí misma. Lo único que se necesita es un poco más de tiempo y recursos para implementarlo.

[Se lee la palabra "Gracias" en el panel izquierdo. En el panel derecho la caricatura de un japonés con sombrero y kimono tradicional en posición de agradecimiento.] "Qué Hay Pa' Hacer" es la prueba de que podemos usar tecnología de punta para resolver problemas locales y reconectar a los ciudadanos con la cultura de sus ciudades.

Muchas gracias.