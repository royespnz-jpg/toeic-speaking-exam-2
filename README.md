# Speaking Exam II (formato TOEIC® Speaking · Questions 7–11)

Un examen oral cronometrado con las **Questions 7 a 11** del formato anterior del TOEIC Speaking: el reloj cuenta el
tiempo para leer o preparar, suena un beep, el micrófono se enciende solo, graba hasta que se acaba el tiempo, se apaga
y pasa a la pregunta siguiente. Cada respuesta va a tu Google Drive y a una planilla donde ponés la nota.

Es **aparte** del primer *Speaking Exam* (Questions 1–7): otra página, otro script, otra planilla y otra carpeta.

## El examen

| Parte | Qué hace | Tiempo |
| --- | --- | --- |
| **Questions 7–9** · Respond to questions using information provided | Lee un horario (un taller o seminario) y responde tres preguntas de alguien que llama | 30 s para leer · responde 15 s, 15 s y 30 s, sin preparación |
| **Question 10** · Propose a solution | Escucha un mensaje de voz con un problema y responde en el papel que le toca (por ejemplo, el gerente de un restaurante) | 30 s para preparar · 60 s para hablar |
| **Question 11** · Express an opinion | Tres temas, uno por uno (la adaptación de clase de la práctica: tres temas en vez de uno) | cada tema: 15 s para preparar · 60 s para hablar |

Son **7 respuestas grabadas** y unos 10 minutos. Las consignas, las preguntas, el mensaje y los temas se oyen (voz del
navegador) y se leen en pantalla. El horario aparece cuando empieza su reloj de lectura y queda a la vista mientras
responden las Questions 7–9.

**Dos versiones**, con el mismo formato y la misma dificultad, y ninguna repite nada de las prácticas A y B que ya
hicieron los estudiantes:

| | Questions 7–9 | Question 10 | Question 11 |
| --- | --- | --- | --- |
| **Versión 1** | Small Business Marketing Workshop | Agencia de alquiler de carros: la van reservada no está | Finanzas en el colegio · empresa grande o pequeña · redes sociales |
| **Versión 2** | Public Speaking Seminar | Restaurante: el salón privado quedó reservado dos veces | Estudiar en grupo · sueldo alto o tiempo libre · comprar en línea |

Con el link general, a cada estudiante le toca una versión al azar (así los vecinos casi nunca tienen la misma). Con el
link de una versión, todos hacen esa. La planilla dice qué versión hizo cada uno.

- **El reloj**: un anillo que se vacía; azul mientras leen o preparan, rojo mientras graba; ámbar en los últimos 10
  segundos y parpadea en los últimos 5.
- **El micrófono**: se pide una vez, en la prueba de micrófono antes de empezar. Después graba solo en cada *Response
  time* y se cierra al terminar el tiempo.
- **Nada se pierde**: cada grabación se guarda en el navegador y se envía enseguida; si se corta internet, se reintenta.
  Al final, el estudiante ve “✓ Sent” en cada respuesta, y puede descargarlas si no hay planilla conectada.
- **Si se recarga la página**, el examen sigue desde la pregunta que estaba respondiendo (la planilla lo cuenta en
  *Restarts*; también cuenta cuántas veces salió de la página).

## Instalación

1. **La planilla y el script.** Creá una planilla **nueva** (<https://sheets.new>) → **Extensiones → Apps Script** →
   borrá lo que haya → pegá [`google-apps-script/Code.gs`](google-apps-script/Code.gs) → guardá → elegí **`setup`** →
   **▶ Ejecutar** → aceptá los permisos. Crea las hojas *Exams*, *Responses*, *Rubric* y *Exam*, y la carpeta
   *Speaking Exam II — Recordings* en tu Drive.
   > **¿El editor no te deja pegar todo el código?** Usá las 5 partes cortas de
   > [`google-apps-script/partes/`](google-apps-script/partes/): la **parte 1** va en `Código.gs` (reemplazando todo),
   > y cada una de las otras en un archivo nuevo (**＋ → Secuencia de comandos**, llamalo `parte2`, `parte3`…). Cada parte
   > empieza con `/* ── Speaking Exam II · parte N de 5 ── */` y termina con `/* ── fin de la parte N de 5 ── */`: si no
   > ves esa última línea, se cortó al pegar. Después seguí igual (`setup`, implementar).
2. **Implementar → Nueva implementación → Aplicación web** · Ejecutar como: **Yo** · Quién tiene acceso: **Cualquier
   persona** → copiá la URL que termina en `/exec`.
3. **En el examen**, abrí la página **Teacher** (`…/#teacher`, código **1234**): pegá la URL, *Test*, *Save*. Ahí están
   los links para los estudiantes (uno al azar y uno por versión), todo lo que pregunta cada versión, una **vista
   previa** de cada paso (sin grabar nada) y un link para probar el examen completo (queda marcado *demo* en la planilla).
   Para que no haga falta pegarla en cada computadora, la URL también puede ir en [`js/config.js`](js/config.js)
   (`SCRIPT_URL`).

> **¿Cambiaste el script?** Guardar no alcanza: la URL `/exec` sigue usando la versión anterior hasta que la publiques.
> **Implementar → Administrar implementaciones → ✏️ (la implementación de siempre) → Versión: Nueva versión →
> Implementar.** Así la URL no cambia.

### Qué guarda la planilla

| Hoja | Qué tiene |
| --- | --- |
| **Exams** | Una fila por estudiante: inicio, nombre, **versión**, estado, respuestas, fin, veces que salió de la página, reinicios, **total** (suma automática, de 29) y la carpeta de sus audios |
| **Responses** | Una fila por respuesta: pregunta, enunciado, segundos, **▶ Listen** (el audio en tu Drive), **Score** (la celda acepta solo de 0 a 3 en las Questions 7–9 y de 0 a 5 en la 10 y la 11), *Out of* y *Comments* |
| **Rubric** | Criterios de cada puntaje, con las escalas del TOEIC Speaking: 0–3 para las Questions 7–9, 0–5 para la 10 y la 11 |
| **Exam** | Todo lo que pregunta cada versión: el horario, las preguntas, el papel, el mensaje y los temas |

Los audios quedan en *Speaking Exam II — Recordings / nombre · V1 · código*.

## Cambiar el examen

Todo lo que pregunta cada versión está en [`js/versions.js`](js/versions.js), y los relojes en
[`js/format.js`](js/format.js) (las consignas cambian solas con los relojes). Para agregar una versión, agregá otro
bloque con el número siguiente. Después:

```bash
npm run gs        # copia el examen al script (hoja «Exam») y lo vuelve a partir en partes cortas
npm run version   # antes de publicar: pone una versión nueva a los archivos (?v=…)
npm test
```

Si cambiaste el script, pegá de nuevo las partes que cambiaron y publicá una versión nueva (ver arriba).

## Publicarlo

En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`** → **Save**.
En uno o dos minutos queda en `https://royespnz-jpg.github.io/<nombre-del-repositorio>/`.

## Probarlo

```bash
npm start     # http://localhost:8080 ( …/?demo=1 prueba con los relojes reales; …/?quick=1 los acorta al 10 %; …/?v=2 elige la versión)
npm test
```

No hay dependencias ni build: HTML, CSS y JavaScript. Funciona en Chrome, Edge, Firefox y Safari (también en el
celular); conviene usar auriculares.

*Material de clase con el formato del TOEIC Speaking anterior. No es un examen oficial de ETS.*
