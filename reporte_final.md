# Minería de Datos Resiliente y Moderación Automática con IA para la Difusión de Eventos Culturales

---

**Resumen** - Este documento presenta el desarrollo e integración de un sistema de Inteligencia Artificial en la plataforma web "Qué hacer en...", diseñada para la difusión de eventos locales. El proyecto aborda la problemática de la recolección manual de datos, que resulta ineficiente y propensa a errores, mediante la implementación de agentes de IA basados en Modelos de Lenguaje Grande (LLMs). Se detalla la construcción de un módulo de minería de datos capaz de extraer información estructurada de diversas fuentes web y un sistema de verificación de integridad que asegura la calidad del contenido antes de su publicación. Los resultados demuestran que la automatización mejora significativamente la escalabilidad de la plataforma y validan la superioridad del enfoque semántico sobre el scraping tradicional. Finalmente, se discute la viabilidad económica y técnica de alcanzar una automatización completa mediante futuros flujos de trabajo agénticos.

**Índice de Términos** - Aplicación Web, Inteligencia Artificial, LLM, Minería de Datos, Next.js, Automatización, Integridad de Datos.

---

## I. INTRODUCCIÓN

### A. Justificación del Problema

La industria del entretenimiento y la cultura depende vitalmente de la difusión oportuna de información. En este contexto, "Qué Hay Pa Hacer" surge como una aplicación web orientada a facilitar el descubrimiento de eventos locales y actividades de entretenimiento en diversas ciudades. La plataforma permite a los usuarios explorar, filtrar y acceder a una amplia oferta de eventos culturales, gastronómicos, musicales y recreativos, centralizando la información para responder de manera intuitiva a la necesidad de los ciudadanos de encontrar actividades relevantes en su entorno.

Sin embargo, la utilidad de una plataforma de esta naturaleza reside estrictamente en la actualidad y veracidad de sus datos. El problema central que aborda este proyecto es la ineficiencia inherente a los métodos tradicionales de agregación de contenido. La recolección manual de información desde múltiples fuentes dispersas —como sitios web de teatros, coliseos e instituciones culturales— constituye un proceso lento, repetitivo y difícil de escalar. Además, la dependencia de la entrada manual de datos introduce riesgos significativos de error humano, lo cual degrada la calidad de la información y la experiencia final del usuario.

Para superar estos desafíos, este proyecto justifica su desarrollo en la necesidad de transformar la plataforma en un servicio autosostenible y escalable. La solución propuesta se fundamenta en la integración de técnicas avanzadas de Inteligencia Artificial, específicamente el uso de Modelos de Lenguaje Grande (LLMs), para automatizar los flujos de trabajo críticos.

### B. Objetivos Generales y Específicos

El objetivo general del proyecto es desarrollar e integrar un sistema de IA que automatice la recolección de datos y asegure la integridad del catálogo de eventos. Para lograr esto, se plantearon los siguientes objetivos específicos:

1.  **Minería de Datos Automatizada**: Implementar un agente de IA capaz de navegar sitios web preseleccionados para identificar y extraer autónomamente información estructurada de eventos. A diferencia del *web scraping* tradicional, que depende de selectores rígidos y se rompe ante cualquier cambio en el diseño web, este enfoque basado en LLMs interpreta semánticamente el contenido. Esto permite una extracción resiliente y universal, eliminando la necesidad de mantener scripts personalizados para cada fuente y la transcripción manual.
2.  **Sistema de Verificación de Integridad**: Desarrollar un mecanismo de control que procese todos los eventos entrantes, aplicando filtros de seguridad y calidad. Este sistema clasifica automáticamente los eventos minados como "inactivos" para revisión manual, y somete los eventos creados por usuarios a un agente de moderación por IA que detecta contenido inapropiado en tiempo real. Esto garantiza que solo contenido seguro y verificado llegue al usuario final, sin importar su origen.
3.  **Integración Arquitectónica**: Incorporar estos módulos de IA de manera funcional dentro de la arquitectura moderna de la aplicación (basada en Next.js y Node.js), asegurando una comunicación fluida y eficiente con la base de datos.

A través de esta implementación, se busca no solo optimizar los recursos operativos requeridos para mantener la plataforma, sino también garantizar estándares elevados de calidad y actualidad en la información ofrecida al público.

### C. Estado del Arte

La recuperación de información web y la moderación de contenido han experimentado una evolución paradigmática en la última década, transitando desde reglas heurísticas rígidas hacia sistemas probabilísticos basados en aprendizaje profundo (Deep Learning). A continuación, se describe la evolución técnica y el estado actual de los dominios pertinentes al proyecto.

1. De la Inducción de "Wrappers" a la Extracción Semántica

La extracción de datos web (Web Scraping) ha sido tradicionalmente abordada mediante técnicas de Inducción de Wrappers. Este enfoque clásico se fundamenta en el análisis sintáctico del Modelo de Objetos del Documento (DOM), donde se diseñan scripts que recorren el árbol de nodos HTML utilizando selectores específicos (como XPath o CSS Selectors) para localizar y extraer cadenas de texto.

Sin embargo, la literatura académica ha documentado extensamente la problemática inherente a este método, conocida como la "Fragilidad de los Wrappers". Investigaciones seminales en el campo, como las de Kushmerick [8], demostraron cuantitativamente que el costo de mantenimiento de estos scripts crece exponencialmente en relación con la heterogeneidad y volatilidad de las fuentes web. Dado que estos sistemas dependen de la estructura visual y jerárquica del código, cambios menores en la maquetación —como la introducción de un <div> contenedor o el cambio de nombre de una clase CSS— invalidan las reglas de extracción, rompiendo el flujo de datos.

Para mitigar esto, autores como Crescenzi et al. [9] propusieron sistemas como RoadRunner, que intentaban generar wrappers automáticamente comparando páginas similares para detectar patrones. No obstante, estos sistemas seguían atados a la estructura sintáctica.
El estado del arte actual ha superado estas limitaciones arquitectónicas mediante la adopción de Modelos de Lenguaje Grande (LLMs) basados en Transformers. A diferencia de los métodos basados en el DOM, los LLMs no "leen" etiquetas HTML como instrucciones de localización, sino que procesan el contenido como una secuencia de tokens, aplicando mecanismos de Atención (Self-Attention) para entender la relación entre las palabras. Estudios recientes sobre Information Extraction (IE), como los presentados por Wei et al. [10], validan que los LLMs poseen capacidades de Generalización Zero-Shot. Esto significa que el modelo puede identificar entidades complejas (fechas, precios, ubicaciones) en documentos con estructuras HTML nunca antes vistas, basándose puramente en el contexto semántico y no en la posición del nodo. Este enfoque de "Resiliencia Semántica" reduce drásticamente la deuda técnica asociada al mantenimiento de conectores de datos.

2. Generación de Estructura: Del Texto Libre a JSON Determinista

Uno de los desafíos más persistentes en la ingeniería de software asistida por IA ha sido la integración de la naturaleza estocástica (probabilística) de los modelos generativos con la rigidez necesaria de los sistemas de bases de datos relacionales. Históricamente, transformar texto no estructurado en datos computables requería pipelines complejos de Procesamiento de Lenguaje Natural (NLP), utilizando arquitecturas como BiLSTM-CRF para el Reconocimiento de Entidades Nombradas (NER), las cuales requerían entrenamiento supervisado específico para cada dominio.

La introducción de los LLMs generativos trajo consigo el problema de la "alucinación" de formatos, donde el modelo podía generar JSON inválido. Sin embargo, el estado del arte ha avanzado hacia técnicas de Decodificación Restringida (Constrained Decoding). Esta técnica, implementada recientemente en modelos de vanguardia como la familia Gemini [2], interviene en la etapa de muestreo del modelo. En lugar de predecir el siguiente token basándose exclusivamente en la probabilidad lingüística, el algoritmo de inferencia aplica una máscara que fuerza matemáticamente al modelo a seleccionar únicamente tokens que cumplan con una gramática formal predefinida (en este caso, un esquema JSON).

Esto representa un avance técnico significativo: permite transformar la "creatividad" del modelo en una salida determinista garantizada, eliminando la necesidad de parsers intermedios propensos a fallos y asegurando la integridad referencial de los datos antes de su inserción en la base de datos.


3. Moderación de Contenido: Del "Keyword Spotting" a la Comprensión Contextual

La moderación automática de contenido ha evolucionado a través de tres generaciones tecnológicas distintas:

    Filtrado basado en Palabras Clave (Keyword Filtering) y/o Listas Negras: Métodos deterministas que bloquean palabras prohibidas. Sin embargo, Davidson et al. [11] identificaron que estos métodos deterministas son insuficientes y propensos a altas tasas de error debido a dos factores: la polisemia (palabras que cambian de significado según el contexto) y la ofuscación (usuarios que alteran la grafía de palabras ofensivas para evadir filtros).

    Clasificadores Probabilísticos Clásicos: Uso de algoritmos como Naive Bayes o Support Vector Machines (SVM). Aunque mejoraron la detección, carecían de comprensión profunda de la sintaxis y la intención.

    La evolución hacia clasificadores basados en Deep Learning permitió el análisis de sentimientos, pero es la llegada de los LLMs la que ha permitido la Detección de Postura y Contexto. Los modelos actuales pueden discernir, por ejemplo, entre una descripción violenta en un contexto narrativo/teatral (aceptable) y una amenaza real (inaceptable).

Investigaciones recientes sugieren que los LLMs superan a los moderadores humanos en velocidad y consistencia para tareas estándar, aunque todavía enfrentan desafíos en la detección de sarcasmo y matices culturales locales (Cultural Nuance). Por ello, Mosqueira-Rey et al. [12] abogan por el diseño de arquitecturas Human-in-the-Loop (HITL). En este paradigma, adoptado por el presente proyecto, la IA no se utiliza como un reemplazo total, sino como un mecanismo de triaje de alta velocidad que filtra lo obvio y escala los casos ambiguos a operadores humanos. Este enfoque híbrido optimiza la eficiencia operativa sin sacrificar la precisión ética necesaria para la gestión de comunidades.

## II. METODOLOGÍA

Esta sección detalla la arquitectura tecnológica, las herramientas de Inteligencia Artificial y la metodología implementada, destacando tanto el funcionamiento del sistema como el proceso de desarrollo acelerado mediante IA.

### A. Arquitectura del Sistema

El proyecto se estructuró bajo un modelo de **Monorepo**, una estrategia de desarrollo de software donde el código de varios proyectos (en este caso, el backend y el frontend) se almacena en un mismo repositorio. Esto facilita la gestión de dependencias compartidas y la coherencia del código. Para la gestión de paquetes se utilizó **pnpm**, una herramienta eficiente que optimiza el espacio en disco y la velocidad de instalación en comparación con gestores tradicionales como npm.

1.  **Frontend (Web - lo que ve el usuario)**: Se utilizó **React** junto con el framework **Next.js**. React permite construir interfaces de usuario mediante "componentes" reutilizables (piezas de código independientes como botones o formularios), lo que agiliza el desarrollo y facilita el mantenimiento. Next.js añade capacidades de *Server-Side Rendering* (SSR), lo que significa que las páginas se generan en el servidor antes de enviarse al navegador, mejorando drásticamente la velocidad de carga y la visibilidad en motores de búsqueda (SEO).
2.  **Backend (API - lógica del servidor)**: Se implementó una **API RESTful** con Node.js y Express. En términos simples, una API RESTful es un conjunto de reglas que permite que el frontend y el backend se comuniquen de manera estandarizada a través de internet, utilizando métodos HTTP (como GET para pedir datos o POST para enviarlos).
3.  **Base de Datos**: Se empleó **Supabase**, un sistema de código abierto que proporciona una **base de datos relacional** (PostgreSQL) completa, junto con servicios de autenticación y almacenamiento en tiempo real, simplificando la infraestructura del backend.

### B. Desarrollo Asistido por IA

La Inteligencia Artificial no solo es un componente del producto final, sino que fue fundamental en su construcción. Se utilizaron modelos avanzados para acelerar el ciclo de desarrollo, asistiendo en:
*   **Diseño de UI/UX**: Generación de código HTML y CSS (Tailwind) para crear una interfaz moderna y estética en tiempo récord.
*   **Ingeniería de Software**: Aplicación de técnicas como *Context Engineering* (proveer contexto detallado al modelo), *Chain Prompting* (desglosar tareas complejas) y *Test Driven Development* (TDD) para escribir código robusto y libre de errores.

### C. Tecnologías de IA y Minería de Datos

El núcleo de procesamiento utiliza la API de **Google Gemini** (`gemini-2.5-flash`). Una característica clave empleada es la **Salida Estructurada** (*Structured Output*), que fuerza al modelo a responder estrictamente en formato **JSON** (un formato de texto estándar para organizar e intercambiar datos), garantizando que la información extraída sea computable y consistente.

Esta capacidad es fundamental para la estabilidad del sistema. En el desarrollo de software tradicional, las funciones esperan entradas predecibles; sin embargo, los modelos de lenguaje tienden a ser creativos y variados en sus respuestas. Al imponer un esquema estricto, transformamos la salida probabilística del modelo en datos deterministas que el backend puede procesar, validar y almacenar en la base de datos sin necesidad de parsers complejos o intervención manual. A continuación se presenta un ejemplo de cómo se configura esta funcionalidad:

```typescript
// Definición del esquema de salida (simplificado)
const eventSchema = {
  type: "OBJECT",
  properties: {
    events: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          date: { type: "STRING", description: "Formato YYYY-MM-DD" },
          time: { type: "STRING", description: "Formato HH:MM" },
          location: { type: "STRING" },
          price: { type: "NUMBER" },
          description: { type: "STRING" }
        }
      }
    }
  }
};

// Configuración de la llamada a Gemini
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseSchema: eventSchema,
  },
});
```

En el código anterior, se define primero la estructura de datos (`eventSchema`) especificando los campos requeridos como título, fecha y precio. Al invocar el modelo, se pasa este esquema en la configuración `responseSchema`. Esto instruye a Gemini para que ignore cualquier formato conversacional y entregue únicamente un objeto JSON válido que cumpla con estas reglas, listo para ser consumido por la aplicación.

**Proceso de Minería:**
1.  **Obtención y Limpieza**: El sistema descarga el documento HTML de la fuente y realiza una limpieza preliminar para eliminar scripts, estilos y datos irrelevantes que puedan confundir al modelo.
2.  **Extracción**: El HTML limpio se procesa con Gemini para identificar y estructurar los eventos.
3.  **Validación y Almacenamiento**: Una vez extraída la información, el sistema valida que los datos cumplan con los requisitos mínimos (fechas válidas, campos obligatorios) y procede a almacenarlos en la base de datos.

### D. Sistema de Verificación de Integridad

Se diseñó un flujo híbrido para asegurar la calidad del contenido:

1.  **Eventos Minados (Revisión Humana)**: Dado que la extracción automática puede contener imprecisiones sutiles, estos eventos se guardan por defecto como **"Inactivos"**. Se requiere la validación final de un operador humano a través del panel de administrador al cual se puede acceder desde la aplicación misma. Aunque los agentes de IA han avanzado enormemente en los últimos años, el criterio humano es insustituible para detectar casos que escapan a la lógica del modelo, tales como:
    *   **Alucinaciones**: Datos que la IA "inventa" para completar campos vacíos.
    *   **Contexto Cultural**: Eventos que técnicamente cumplen los criterios pero no son relevantes (ej. una reunión privada vs. un evento público).
    *   **Matices Semánticos**: Errores en la interpretación de fechas ambiguas o precios complejos.
    De esta manera, el operador actúa como un filtro de calidad final, asegurando que la información sea no solo correcta, sino útil y segura para la audiencia local.

2.  **Eventos de Usuarios (Moderación por IA)**: La plataforma fomenta la participación comunitaria permitiendo que cualquier usuario registrado publique sus propios eventos. Esta funcionalidad democratiza la difusión cultural y enriquece el catálogo con actividades de nicho que los sistemas automáticos podrían perder. Sin embargo, esta apertura introduce riesgos inherentes, como la publicación de contenido ofensivo, spam o información fraudulenta.
    Para mitigar estos riesgos sin imponer una carga administrativa insostenible, se implementó un agente de moderación automática basado en IA. Este agente analiza en tiempo real el título y la descripción de cada nuevo evento:
    *   Si el contenido es clasificado como **seguro**, se publica inmediatamente, garantizando una experiencia de usuario fluida.
    *   Si detecta **riesgos** (violencia, discurso de odio, estafas), el evento se marca automáticamente para **"Revisión"**, impidiendo su visibilidad pública hasta ser verificado por un administrador.

## III. RESULTADOS

A continuación presentamos los resultados del desarrollo y despliegue de la aplicación "Qué Hay Pa Hacer" junto con los logros obtenidos en los procesos de minería de datos y moderación de contenido. Estos resultados se evalúan en términos de validación funcional, desempeño del módulo de minería y eficiencia operativa.

### A. Validación Funcional de la Plataforma

Se logró el despliegue exitoso de la aplicación web completa, la cual se encuentra disponible públicamente en https://www.pahacer.com. Actualmente, la plataforma cuenta con un catálogo exhaustivo de eventos obtenidos mediante minería de datos y ya registra actividad orgánica, con usuarios publicando sus propios eventos. Adicionalmente, la estrategia de SEO implementada ha dado resultados positivos, logrando que la aplicación aparezca indexada en los resultados de búsqueda de Google.

Las pruebas de integración confirmaron el correcto funcionamiento de los módulos críticos:
*   **Autenticación**: El sistema gestiona correctamente el registro e inicio de sesión de usuarios mediante Supabase.
*   **Visualización**: Los eventos se renderizan correctamente con *Server-Side Rendering*, asegurando tiempos de carga rápidos.
*   **Gestión de Usuarios**: Los usuarios pueden crear eventos, los cuales son sometidos exitosamente al flujo de moderación.

### B. Desempeño del Módulo de Minería

Se realizaron pruebas de extracción en sitios web de eventos reales. El agente de IA demostró capacidad para:
1.  **Interpretar Estructuras Variadas**: Extrajo correctamente información de sitios con diferentes maquetaciones HTML sin necesidad de reconfiguración.
2.  **Normalización de Datos**: Convirtió exitosamente fechas en lenguaje natural (ej. "Este viernes a las 8") a formatos estándar de base de datos (ISO 8601), un proceso que manualmente es fuente frecuente de errores.
3.  **Limpieza de Ruido**: El sistema filtró eficazmente elementos no relevantes como menús de navegación y pies de página.

Durante las pruebas, la tasa de error del modelo Gemini 2.5 Flash resultó ser mínima. Los fallos observados se atribuyeron principalmente a la falta de información en la fuente original más que a deficiencias en el razonamiento del modelo. Se proyecta una reducción aún mayor de estas incidencias con la futura migración a la versión 3 Flash de Gemini, que promete capacidades de contexto y precisión mejoradas.

### C. Eficiencia Operativa

Aunque no se recopilaron estadísticas masivas, la comparación cualitativa entre el flujo de trabajo manual y el automatizado evidencia una mejora sustancial en la eficiencia. Basado en la experiencia operativa preliminar, se estima que el proceso de agregación de eventos es aproximadamente **4 veces más rápido** utilizando el sistema automatizado en comparación con la carga manual tradicional.

**Tabla I. Comparación de Flujos de Trabajo**

| Criterio | Método Manual Tradicional | Método Automatizado con IA |
| :--- | :--- | :--- |
| **Tiempo por Evento** | Medio (Lectura, transcripción, validación) | Bajo (Revisión rápida de datos precargados) |
| **Escalabilidad** | Lineal (Requiere más personal para más sitios) | Exponencial (El mismo agente procesa múltiples sitios) |
| **Consistencia** | Variable (Depende del digitador) | Alta (Formato JSON estandarizado) |
| **Disponibilidad** | Limitada a horario laboral | 24/7 (Ejecución programada) |

### D. Efectividad de la Moderación

El sistema de integridad se sometió a pruebas iniciales con contenido simulado, enfocándose en casos donde el contenido era abiertamente ofensivo o prohibido. En estos escenarios, el agente de IA bloqueó exitosamente la publicación inmediata y etiquetó los eventos para "Revisión", confirmando la funcionalidad básica de la barrera de seguridad. Sin embargo, se reconoce la necesidad de realizar pruebas más exhaustivas y complejas ("adversarial testing") para evaluar la capacidad del modelo ante intentos de evasión más sutiles, uso de lenguaje ambiguo o contextos culturales específicos que podrían no ser detectados por los filtros actuales.

## IV. DISCUSIÓN

La implementación de agentes de Inteligencia Artificial en la plataforma "Qué Hay Pa Hacer" ha permitido validar hipótesis fundamentales sobre la modernización de sistemas de agregación de contenido. A continuación, se discuten las implicaciones de los resultados obtenidos.

### A. Impacto de la Automatización en la Escalabilidad

Los resultados operativos demuestran que la integración de LLMs actúa como un catalizador para la escalabilidad en múltiples dimensiones del negocio. La implementación del sistema de minería de datos y el agente de moderación de contenido han generado un impacto transformador en la eficiencia operativa.

**Automatización de Minería de Datos**: Los resultados preliminares indican una mejora de eficiencia de aproximadamente 4 veces frente a los métodos manuales, con el agente de IA navegando autónomamente sitios web, extrayendo eventos estructurados y normalizando fechas en lenguaje natural a formatos estándar de base de datos. Este proceso, que anteriormente requería lectura manual, transcripción y validación por operador, ahora se reduce a una revisión rápida de datos precargados.

**Moderación Automática de Contenido**: El agente de moderación por IA ha demostrado eficacia en filtrar contenido inapropiado en tiempo real, marcando automáticamente eventos con riesgos de violencia, discurso de odio o estafas para revisión manual. Esta capacidad elimina la necesidad de revisión manual exhaustiva de todo el contenido generado por usuarios, permitiendo que los administradores se concentren únicamente en casos verdaderamente dudosos.

**Impacto en el Ahorro de Mano de Obra**: La combinación de ambos sistemas ha transformado el rol del operador humano de "digitador de datos y moderador manual" a "supervisor estratégico". Esta transformación rompe la barrera lineal de crecimiento, permitiendo que la plataforma se expanda a nuevas ciudades o aumente la frecuencia de actualización sin requerir un incremento proporcional en el equipo humano. El sistema automatizado opera 24/7, eliminando las limitaciones de horario laboral y proporcionando consistencia en el procesamiento, resolviendo fundamental y definitivamente el problema de sostenibilidad planteado inicialmente.

**Evolución Natural del Sistema**: El proceso de extracción de datos se beneficia inherentemente de la evolución continua de los modelos de Gemini. Con cada nueva versión de Gemini Flash, el sistema experimentará mejoras naturales en precisión, capacidad de contexto y robustez sin requerir modificaciones arquitectónicas significativas. Esta evolución continua permite anticipar un escenario donde la intervención humana pueda reducirse sustancialmente.

### B. Cambio de Paradigma en la Extracción de Datos

La resiliencia observada en el módulo de minería demuestra la superioridad del enfoque semántico sobre el *web scraping* tradicional. Mientras que los scripts basados en selectores CSS/XPath son frágiles ante cambios cosméticos en el código fuente —donde un simple cambio de nombre en una clase CSS puede romper todo el pipeline de extracción—, el uso de LLMs con *Structured Output* permite que el sistema "entienda" el contenido independientemente de su presentación visual.

Este enfoque introduce una "universalidad" inédita en la extracción de datos: un único "prompt" o instrucción bien diseñada puede procesar exitosamente sitios web con estructuras radicalmente diferentes, eliminando la necesidad de escribir y mantener código personalizado para cada fuente. Aunque el costo computacional de inferencia por evento es superior al de un script tradicional, este se ve ampliamente compensado por la reducción drástica en los costos de mantenimiento y deuda técnica. El equipo de desarrollo puede enfocarse en crear nuevas funcionalidades de valor en lugar de dedicar ciclos interminables a reparar conectores rotos ("scraper maintenance hell"), lo que resulta en un modelo de desarrollo más ágil y sostenible a largo plazo.

### C. Limitaciones y Desafíos

A pesar de los avances significativos logrados con la implementación de la Inteligencia Artificial, el sistema no está exento de limitaciones técnicas y operativas que deben ser abordadas para garantizar su viabilidad a largo plazo. Esta sección explora los principales desafíos identificados durante el desarrollo y despliegue de la plataforma, desde vulnerabilidades ante contenido adversario hasta la dependencia continua de la supervisión humana y las complejidades legales inherentes a la agregación de datos.

**Limitaciones Técnicas y de Seguridad**: Es importante reconocer que, aunque el sistema de moderación filtra eficazmente amenazas directas, enfrenta desafíos ante contenido "adversario" sutil, como el sarcasmo o el lenguaje codificado. Además, la dependencia de la accesibilidad de los sitios fuente sigue siendo un punto vulnerable; si bien el LLM puede interpretar el HTML, no puede eludir medidas anti-bot agresivas que impidan la descarga inicial del documento. Estas limitaciones señalan la necesidad de investigación continua en técnicas de evasión ética y en el refinamiento de los modelos de moderación con datasets específicos del contexto local.

**Dependencia de Supervisión Humana**: Otra limitación crítica del sistema actual radica en su dependencia de la intervención humana para el control de calidad. A pesar de la alta precisión de los modelos de IA, la necesidad de mantener un sistema híbrido de verificación subraya que la tecnología actual actúa mejor como copiloto que como piloto automático total. Esta dependencia de supervisión humana representa un cuello de botella operativo que impide alcanzar el potencial completo de automatización de los procesos. La intervención humana sigue siendo crucial para discernir matices culturales y validar la relevancia local de los eventos, aspectos que escapan a la lógica puramente semántica del modelo. Esta limitación del enfoque "Human-in-the-Loop" requiere un equilibrio constante entre la eficiencia tecnológica y la calidad editorial, manteniendo costos operativos que limitan la verdadera escalabilidad del sistema.

**Calidad e Integridad de las Fuentes**: Una limitación fundamental reside en la calidad intrínseca de la información de origen. Las fuentes primarias pueden presentar eventos con información corrupta, incompleta o desactualizada: fechas incorrectas, ubicaciones imprecisas, precios engañosos, o eventos que han sido cancelados pero no actualizados en la fuente original. Esta "contaminación de datos" puede propagarse a través del sistema, afectando la credibilidad de la plataforma. Además, algunas fuentes podrían tener políticas de actualización inconsistentes, lo que genera un catálogo donde algunos eventos permanecen vigentes mientras otros ya no son relevantes, requiriendo mecanismos adicionales de verificación temporal y validación cruzada.

**Desafíos Legales y de Cumplimiento**: El sistema opera en una zona gris legal relacionada con los términos de servicio de sitios web y derechos de autor. Muchas plataformas prohíben explícitamente el scraping automatizado en sus términos de uso, lo que puede generar implicaciones legales. Adicionalmente, la reproducción de información de eventos con derechos de autor (descripciones, imágenes, horarios) plantea preguntas sobre responsabilidad intelectual. El cumplimiento de regulaciones como GDPR para datos de usuarios y las implicaciones de privacidad en la agregación masiva de información representan desafíos complejos que requieren asesoría legal continua y políticas claras de uso de datos.

### D. Hacia la Automatización Completa

La plataforma se encuentra en una trayectoria estratégica hacia la eliminación casi completa de la supervisión humana, impulsada por la adopción de arquitecturas de "Agentes Autónomos". Al aceptar un margen de error operativo controlado y mediante la implementación de capas adicionales de seguridad e integridad —como sistemas de validación cruzada entre múltiples fuentes o algoritmos de detección de anomalías—, el sistema puede alcanzar una autonomía operativa superior al 95%.

La evolución futura contempla la integración de flujos de trabajo agénticos (*Agentic Workflows*) donde los modelos no solo extraen datos, sino que tienen la capacidad de "autocorregirse": si un agente detecta una inconsistencia en una fecha, puede navegar a una fuente secundaria para verificar la información antes de guardarla. Si bien esta complejidad adicional implica un aumento en el consumo de tokens y recursos computacionales, la tendencia histórica de reducción de costos en inferencia de IA (Ley de Moore aplicada a LLMs) y la mejora constante en la eficiencia de los modelos sugieren que este enfoque será no solo técnicamente viable, sino económicamente atractivo en el corto plazo. En un contexto donde la utilidad práctica y la frescura del catálogo son prioritarias, esta automatización inteligente y económicamente sostenible representa el futuro de la agregación de contenido.

## V. CONCLUSIONES

En conclusión, el desarrollo de "Qué Hay Pa Hacer" demuestra que la integración de Modelos de Lenguaje Grande (LLMs) en flujos de trabajo de ingeniería de software no es solo una mejora incremental, sino una transformación estructural. Se cumplió el objetivo general de automatizar la recolección de datos, logrando un sistema capaz de poblar y mantener un catálogo de eventos con mínima intervención humana.

Específicamente, la implementación del agente de minería basado en Gemini validó que la extracción semántica es una solución viable y superior al *scraping* tradicional para fuentes no estructuradas. El sistema de verificación de integridad, aunque requiere supervisión, estableció una primera línea de defensa efectiva contra contenido inapropiado, cumpliendo con los estándares de seguridad planteados. Asimismo, se logró la integración arquitectónica exitosa de estos módulos dentro del ecosistema Next.js/Node.js, demostrando que es posible acoplar flujos de trabajo de IA complejos en aplicaciones web modernas sin comprometer el rendimiento o la experiencia del usuario.

Para trabajos futuros, se recomienda la migración a versiones más recientes de la familia Gemini (como Gemini 3). Asimismo, es imperativo desarrollar bancos de pruebas "adversarios" para fortalecer los filtros de moderación ante intentos de manipulación sofisticados. Finalmente, este proyecto no solo resuelve un problema técnico local, sino que establece un modelo replicable para la democratización del acceso a la información cultural, sirviendo como referencia para futuros sistemas de agregación de contenido en dominios donde la dispersión de datos es una barrera para el usuario final.

## REFERENCIAS

[1] "Qué Hay Pa Hacer - Eventos Locales," [Online]. Disponible: https://www.pahacer.com. [Accessed: Nov. 28, 2025].
[2] Google AI for Developers, “Structured Outputs | Gemini API,” Google AI Docs, 2024. [En línea]. Disponible: https://ai.google.dev/gemini/docs/structured-output.
[3] Google Cloud, “What is Human-in-the-Loop (HITL) in AI & ML?,” Google Cloud Learn, 2025. [En línea]. Disponible: https://cloud.google.com/discover/human-in-the-loop.
[4] ScrapeGraphAI, “LLM Web Scraping: How AI Models are Replacing Traditional Scrapers,” ScrapeGraphAI Blog, 2025. [En línea]. Disponible: https://scrapegraphai.com/blog/llm-web-scraping.
[5] Analytics Vidhya, “Web Scraping with LLMs,” Analytics Vidhya Blog, Dic. 2024. [En línea]. Disponible: https://www.analyticsvidhya.com/blog/2024/12/web-scraping-with-llms/.
[6] Stream, “Build an LLM-Powered Agent for Real-Time Content Moderation,” GetStream.io Blog, Aug. 2024. [En línea]. Disponible: https://getstream.io/blog/llm-content-moderation.
[7] Supabase, “Supabase Documentation,” Supabase Official Docs, 2025. [En línea]. Disponible: https://supabase.com/docs.
[8] N. Kushmerick, "Wrapper induction: Efficiency and expressiveness," Artificial Intelligence, vol. 118, no. 1-2, pp. 15–68, 2000.
[9] V. Crescenzi, G. Mecca, y P. Merialdo, "RoadRunner: Towards Automatic Data Extraction from Large Web Sites," en Proc. 27th Int. Conf. on Very Large Data Bases (VLDB), Roma, Italia, 2001, pp. 109-118.
[10] X. Wei, X. Cui, N. Cheng, et al., "Zero-Shot Information Extraction via Chatting with ChatGPT," arXiv preprint arXiv:2302.10205, 2023.
[11] T. Davidson, D. Warmsley, M. Macy, y I. Weber, "Automated Hate Speech Detection and the Problem of Offensive Language," en Proc. 11th Int. AAAI Conf. on Web and Social Media (ICWSM), Montreal, Canadá, 2017, pp. 512–515.
[12] E. Mosqueira-Rey et al., "Human-in-the-loop machine learning: A state of the art," Artificial Intelligence Review, vol. 56, pp. 3005–3054, 2023.