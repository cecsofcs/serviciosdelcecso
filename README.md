# Servicios del CECSo · Web de librillos y trayectoria

Esta es la web de los **Servicios del Centro de Estudiantes de Ciencias Sociales (CECSo)**, en la Facultad de Ciencias Sociales (Udelar). Sirve para tres cosas:

1. **Encargar librillos** (la bibliografía fotocopiada de cada curso): elegís carrera, semestre y tipo de materia, armás un carrito y mandás el pedido.
2. **Vender en el mostrador** de la fotocopiadora, con una versión simplificada para quien atiende.
3. **Seguir tu trayectoria** ("Mi Trayectoria"): marcás las materias aprobadas y las que vas a cursar sobre la malla de tu carrera, la web te cuenta los créditos, te avisa si ya podés pasar al Ciclo Avanzado y te ofrece los librillos de lo que vas a cursar.

Este README está pensado para que cualquier persona que entre a los Servis pueda entender cómo funciona todo y mantenerlo, **aunque no sepa programar**. Las secciones 1 a 3 explican el sistema; la sección 4 es una guía de tareas frecuentes paso a paso.

---

## Índice

1. [Cómo funciona, en una imagen](#1-cómo-funciona-en-una-imagen)
2. [Qué hay en este repositorio](#2-qué-hay-en-este-repositorio)
3. [Qué hay afuera del repositorio (Google)](#3-qué-hay-afuera-del-repositorio-google)
4. [Tareas frecuentes, paso a paso](#4-tareas-frecuentes-paso-a-paso)
5. [Cosas frágiles: leer antes de cambiar algo](#5-cosas-frágiles-leer-antes-de-cambiar-algo)
6. [Qué se guarda en el navegador de cada estudiante](#6-qué-se-guarda-en-el-navegador-de-cada-estudiante)
7. [Archivos y restos que se pueden limpiar](#7-archivos-y-restos-que-se-pueden-limpiar)

---

## 1. Cómo funciona, en una imagen

La web **no tiene base de datos propia**. Todo lo que muestra (librillos, precios, mallas) sale de una **planilla de Google Sheets**, y todo lo que se pide termina en un **Google Form**. Este repositorio es solo la "cara" que ve la gente.

```
┌──────────────────────────────────────────────┐
│  PLANILLA DE LIBRILLOS (Google Sheets)       │
│  · una hoja por carrera/semestre/tipo        │
│  · hoja "mallas_maestras"                    │
│  · hoja oculta "Indice_Librillos"            │
│                                              │
│  + Apps Script "API" (publicado como web)    │
└───────────────▲──────────────────────────────┘
                │ 1. la web le pide los datos
                │    (catálogo, mallas, librillos por materia)
┌───────────────┴──────────────────────────────┐
│  ESTA WEB (este repo)                        │
│  · index.html  → estudiantes                 │
│  · presencial.html → mostrador               │
└───────────────┬──────────────────────────────┘
                │ 2. al finalizar, abre un Google Form
                │    con el pedido ya escrito
┌───────────────▼──────────────────────────────┐
│  GOOGLE FORM DE PEDIDOS                      │
│  (uno para la web, otro para el mostrador)   │
│                                              │
│  + Apps Script "onFormSubmit"                │
└───────────────┬──────────────────────────────┘
                │ 3. copia cada respuesta
┌───────────────▼──────────────────────────────┐
│  HOJA "Pedidos" (Google Sheets)              │
│  fecha + respuestas + link al comprobante    │
└──────────────────────────────────────────────┘
```

**El recorrido de un pedido:**

1. La persona entra a la web, elige *Carrera → Semestre (Par/Impar) → Obligatorias/Optativas*.
2. La web le pide a la planilla la hoja con ese nombre (por ejemplo `Sociología Impar Obligatorias`) y muestra sus librillos con precio.
3. La persona agrega librillos al carrito y, si quiere, marca **envío** (suma $200).
4. Al tocar **Finalizar**, se abre el Google Form con la lista de librillos, el total y si hay envío **ya completados**. La persona completa sus datos, adjunta el comprobante de pago y envía.
5. Un script del Form copia la respuesta a la hoja **Pedidos**, con la fecha y el link al comprobante en Drive.

---

## 2. Qué hay en este repositorio

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página principal para estudiantes. Tiene tres secciones: **Inicio**, **Buscador** de librillos y **Mi Trayectoria**. |
| `script.js` | Toda la lógica de `index.html`: pedir datos a la planilla, carrito, envío, Mi Trayectoria y formulario de asesoramiento. |
| `presencial.html` | La versión para el **mostrador**. Solo tiene el buscador y el carrito; sin Mi Trayectoria. |
| `script-presencial.js` | La lógica de `presencial.html`. Es un recorte de `script.js`, con un carrito que **empieza vacío en cada venta** y otro formulario de destino. |
| `style.css` | Los estilos (colores, tipografías, botones) que comparten las tres páginas. |
| `trayectoria.html` | Copia idéntica de `index.html` (ver [sección 7](#7-archivos-y-restos-que-se-pueden-limpiar)). |

### 2.1 `index.html` + `script.js` en detalle

**Inicio.** Texto sobre qué son los Servis y la sección *Materiales y Carpetas*, con botones a las carpetas de Drive del semestre actual y de años anteriores.

**Buscador.**
- Pasos: *Carrera → Semestre (Par/Impar) → Obligatorias/Optativas → Catálogo*.
- El catálogo tiene un buscador que ignora tildes y mayúsculas.
- El carrito se guarda en el navegador, así que si la persona cierra la página no lo pierde.
- La opción **envío** suma `COSTO_ENVIO` (hoy $200) al total.
- **Finalizar** abre el Form de pedidos con los campos precargados.

**Mi Trayectoria.**
- Se elige una carrera y se muestra su malla, armada desde la hoja `mallas_maestras`.
- Cada materia se puede marcar como **aprobada** o **para cursar este semestre**.
- Las materias que son "bolsas de créditos" (por ejemplo, las optativas) se completan escribiendo cuántos créditos hiciste.
- En **Desarrollo** se elige el Módulo Optativo Integral (Desarrollo Económico, Desarrollo Territorial, Gestión y Políticas Públicas, o uno propio). Esas mallas están en `mallas_maestras` con claves que empiezan con `moi_`.
- **Este semestre**: junta lo que marcaste para cursar en todas las carreras, suma los créditos y avisa si pasás el tope reglamentario de 52.
- **Ingreso al Ciclo Avanzado** (solo Ciclo Inicial): muestra si cumplís los 48 créditos con la distribución pedida (24 de Introducción a las Ciencias Sociales, 16 de Métodos aplicados y 8 de otros módulos) y cuánto te falta para los 120 del egreso del Ciclo Inicial.
- **Librillos de lo que voy a cursar**: busca los librillos de las materias marcadas para cursar y permite comprarlos en un carrito aparte.
- **Asesoramiento**: un formulario que abre el programa de mail de la persona con la consulta dirigida a la comisión de su carrera. Los mails están escritos en la función `enviarAsesoramiento` de `script.js`.
- **Limpiar datos guardados**: borra el progreso guardado en el navegador, por si algo se desincroniza.

### 2.2 `presencial.html` + `script-presencial.js`

Es la herramienta de quien atiende. Arranca directo en *Elegí carrera*, arma el pedido de la persona que está en el mostrador y, al cobrar, abre **otro Google Form** (el de ventas presenciales) con los librillos, el total y si hay envío. Después vacía el carrito para la próxima venta.

---

## 3. Qué hay afuera del repositorio (Google)

Estas piezas **no están en GitHub**: viven en la cuenta de Google de los Servis. Si se pierde el acceso a esa cuenta, la web deja de funcionar aunque el repo siga intacto.

> 💡 **Recomendación:** guardar en este repo una copia del código de los dos Apps Script (por ejemplo en una carpeta `apps-script/`), para que no se pierda si alguien borra el proyecto en Google. No subir datos personales ni contraseñas.

### 3.1 La planilla de librillos

Tiene tres tipos de hojas:

**a) Hojas de librillos.** Una por cada combinación de carrera, semestre y tipo. **El nombre tiene que ser exactamente:**

```
<Carrera> <Par|Impar> <Obligatorias|Optativas>
```

Las carreras son, escritas así, con tildes y mayúsculas: `Ciclo Inicial`, `Sociología`, `Trabajo Social`, `Ciencia Política`, `Desarrollo`. Por ejemplo:

- `Ciclo Inicial Impar Obligatorias`
- `Ciencia Política Par Optativas`

En total son 20 hojas. Cada una tiene:

| Columna | Contenido |
|---|---|
| A | Título del librillo (lo que se ve en la web) |
| B | Precio (solo el número, sin `$`) |

La **fila 1 es el encabezado** y no se muestra. Las filas con la columna A vacía se saltean.

**b) `mallas_maestras`.** La malla de todas las carreras, una fila por materia:

| Columna | Contenido | Ejemplo |
|---|---|---|
| A | Clave de la carrera | `ciclo_inicial`, `ciencia_politica`, `desarrollo`, `sociologia`, `trabajo_social`, `moi_eco`, `moi_terr`, `moi_gpp` |
| B | Nombre del módulo | `Introducción a las Ciencias Sociales` |
| C | Nombre de la materia | `Estadística Social` |
| D | ID de la materia (único, inventado por nosotres) | `ci_estadistica` |
| E | Créditos | `8` |
| F | Semestre sugerido | `2` |
| G | ¿Es bolsa de créditos optativos? | `SI` / vacío |
| H | Es previa de… (opcional) | ID de otra materia, o `NO` |
| I | Nota o aclaración (opcional) | texto libre |

Dos cosas a tener en cuenta:
- El cálculo de ingreso al Ciclo Avanzado busca los módulos por nombre: tienen que contener "Introducción" y "Métodos".
- El total de créditos es 120 para `ciclo_inicial` y 240 para el resto.

**c) `Indice_Librillos` (oculta).** Es una lista de **todos** los librillos de todas las hojas, en una sola tabla. La usa "Librillos de lo que voy a cursar". **No se edita a mano:** se regenera desde el menú (ver [4.1](#41-cargar-o-cambiar-librillos-o-precios)).

### 3.2 El Apps Script de la planilla (la "API")

Está en la planilla, en *Extensiones → Apps Script*, y se publica como **aplicación web**. La dirección de esa publicación es la `API_URL` que aparece al principio de `script.js` y de `script-presencial.js`.

Responde a tres pedidos de la web:

| Pedido (`action`) | Qué devuelve |
|---|---|
| `obtenerCatalogo` | Los librillos (título y precio) de una hoja, buscada por su nombre. |
| `obtenerMallas` | Todas las mallas, armadas a partir de `mallas_maestras`. |
| `librillosPorIds` | Recibe IDs de materias, busca sus nombres en `mallas_maestras` y devuelve los librillos de `Indice_Librillos` cuyo título coincide. |

Además agrega a la planilla el menú **⚙️ Web CECSO → ⚡ Sincronizar Catálogo de Librillos**, que regenera `Indice_Librillos`.

### 3.3 Los Google Forms de pedidos

Hay **dos formularios**:
- **Pedidos web**: lo abre `script.js` al finalizar una compra.
- **Ventas presenciales**: lo abre `script-presencial.js`.

La web los abre con algunas respuestas **precompletadas** (librillos, total, envío), usando los identificadores de cada pregunta (`entry.XXXXXXXX`) que están escritos en los `.js`.

El formulario de la web tiene un script, **`onFormSubmit`**, que se ejecuta cada vez que alguien envía un pedido:
- abre la hoja **Pedidos** de la planilla de respuestas;
- escribe en la primera fila libre la **fecha** y luego **todas las respuestas en orden**;
- la **pregunta 9** es el comprobante de pago: en vez del archivo, guarda el **link** a ese archivo en Drive.

---

## 4. Tareas frecuentes, paso a paso

### 4.1 Cargar o cambiar librillos o precios

1. Abrir la planilla de librillos y entrar a la hoja que corresponda (por ejemplo `Sociología Impar Obligatorias`).
2. Agregar, editar o borrar filas: **título en la columna A, precio en la B**.
3. **Muy importante:** ir al menú **⚙️ Web CECSO → ⚡ Sincronizar Catálogo de Librillos**. Si no se hace, "Librillos de lo que voy a cursar" sigue mostrando la lista vieja. El buscador común no lo necesita.
4. Listo: la web toma los cambios sola, no hay que tocar GitHub.

> ⚠️ Evitar **reordenar o borrar filas en medio del semestre**. Cada librillo se identifica por su número de fila, y quien tenga un carrito guardado podría terminar pidiendo otro librillo (ver [5](#5-cosas-frágiles-leer-antes-de-cambiar-algo)). Para sacar un librillo, mejor ponerlo al final o vaciarle la columna A.

### 4.2 Empezar un semestre nuevo

1. Actualizar los librillos de las hojas `… Par …` o `… Impar …` según corresponda (ver 4.1) y **sincronizar**.
2. En `index.html`, sección *Materiales y Carpetas*:
   - cambiar el texto y el link del botón **📂 Primer/Segundo Semestre AAAA** a la carpeta de Drive nueva;
   - revisar el aviso "¡Los librillos del segundo semestre aún no están terminados!".
3. Publicar el cambio en GitHub (ver 4.8).

### 4.3 Actualizar una malla

1. Editar la hoja `mallas_maestras`: una fila por materia, con las columnas de la [sección 3.1](#31-la-planilla-de-librillos).
2. **No cambiar los IDs (columna D) de materias que ya existen**, porque el progreso de cada estudiante está guardado con esos IDs y lo perderían.
3. No hace falta tocar GitHub.

### 4.4 Cambiar el costo del envío

Cambiar `const COSTO_ENVIO = 200;` en **los dos archivos**, `script.js` y `script-presencial.js`, y publicar (4.8). Conviene también actualizar el texto del formulario si menciona el monto.

### 4.5 Cambiar un Google Form (agregar, quitar o mover preguntas)

1. **Si cambia el orden de las preguntas del Form de la web**, hay que corregir el script `onFormSubmit`. Ahí dice `if (i === 8)`, porque el comprobante es la **pregunta 9**. Si pasa a ser la pregunta N, poner `i === N-1`.
2. **Si se crea una pregunta nueva que la web tiene que precompletar**, o si se rehace el formulario, cambian los `entry.XXXXXXXX`. Para conseguir los nuevos:
   - en el Form, *⋮ → Obtener vínculo prellenado*;
   - completar las preguntas con cualquier cosa y tocar *Obtener vínculo*;
   - en el link aparecen los `entry.NNNN=` de cada pregunta;
   - reemplazarlos en `script.js` (funciones `finalizar` y `finalizarCompraCursar`) o en `script-presencial.js` (función `finalizarPresencial`).
3. Publicar (4.8).

### 4.6 Si se vuelve a publicar el Apps Script de la planilla

En Apps Script, *Implementar → Gestionar implementaciones*: si se **edita la implementación existente**, la dirección no cambia. Si se crea una **implementación nueva**, Google da **otra URL** y hay que:

1. copiar la nueva URL (termina en `/exec`);
2. pegarla en `const API_URL = "…"` de **`script.js` y `script-presencial.js`**;
3. publicar (4.8).

La implementación tiene que estar configurada para que **cualquier persona** pueda acceder; si no, la web no puede leer los datos.

### 4.7 Cambiar los mails de asesoramiento

Están en `script.js`, función `enviarAsesoramiento`, en el bloque `const correos = { … }`, uno por carrera.

### 4.8 Publicar un cambio en la web

1. En GitHub, abrir el archivo, tocar el lápiz ✏️, editar y **Commit changes**. También se puede trabajar en una copia local y hacer `git push`.
2. Si la web está publicada con **GitHub Pages** (*Settings → Pages*), el cambio aparece en uno o dos minutos.
3. Probar en una ventana de incógnito para que el navegador no muestre la versión vieja guardada.

---

## 5. Cosas frágiles: leer antes de cambiar algo

| Qué | Por qué importa | Cómo evitar problemas |
|---|---|---|
| **Nombres de las hojas de librillos** | La web arma el nombre (`Carrera Semestre Tipo`) y lo busca tal cual. Un espacio de más o una tilde distinta hace que esa sección aparezca vacía o con error. | Copiar los nombres exactos de la [sección 3.1](#31-la-planilla-de-librillos). |
| **IDs de librillos = número de fila** | El ID de cada librillo es `NombreDeLaHoja_número-de-fila`. Si se reordena o borra una fila, los carritos guardados en el navegador quedan apuntando a otro librillo. | Agregar siempre al final; no reordenar a mitad de semestre. |
| **"Librillos de lo que voy a cursar" compara textos parecidos** | Busca librillos cuyo título contenga el nombre de la materia (o al revés). "Teoría Sociológica" puede traer los librillos de I, II, III y IV juntos. | Titular los librillos con el nombre completo de la materia, igual que en `mallas_maestras`. |
| **`Indice_Librillos` se actualiza a mano** | Si no se sincroniza, esa función muestra datos viejos. | Sincronizar desde el menú después de cada cambio de librillos. |
| **Comprobante en la pregunta 9** | El script del Form lo busca por posición. | Ver [4.5](#45-cambiar-un-google-form-agregar-quitar-o-mover-preguntas). |
| **`entry.XXXX` escritos en el código** | Si se rehace el Form, la web deja de precompletar el pedido. | Ver [4.5](#45-cambiar-un-google-form-agregar-quitar-o-mover-preguntas). |
| **`API_URL` repetida en dos archivos** | Si se cambia en uno solo, una de las dos páginas deja de funcionar. | Cambiarla siempre en `script.js` y `script-presencial.js`. |
| **IDs de materias en `mallas_maestras`** | El progreso de Mi Trayectoria está guardado con esos IDs. | No renombrarlos; si una materia cambia, crear un ID nuevo y dejar el viejo. |
| **Todo depende de la cuenta de Google de los Servis** | La planilla, los Apps Script y los Forms están ahí. | Que siempre haya al menos dos personas con acceso de edición, y traspasarlo cuando cambia el equipo. |

---

## 6. Qué se guarda en el navegador de cada estudiante

La web **no tiene usuarios ni contraseñas**. Lo que cada persona hace queda guardado **solo en su navegador** (`localStorage`):

| Clave | Contenido |
|---|---|
| `cecsocart` | El carrito del buscador. |
| `cecso_trayectoria` | Materias aprobadas, para cursar, créditos optativos y MOI elegido, por carrera. |

Esto quiere decir que el progreso **no pasa de un dispositivo a otro**: si alguien lo arma en la compu, no lo ve en el celular. Además, si borra los datos del navegador, lo pierde. El botón *Limpiar datos guardados* de Mi Trayectoria borra `cecso_trayectoria`.

La versión del mostrador (`presencial.html`) **no guarda nada**: cada venta empieza de cero.

---

## 7. Archivos y restos que se pueden limpiar

- **`trayectoria.html`** es igual a `index.html`; solo cambian los finales de línea. Parece un resto de cuando Mi Trayectoria era una página aparte. Antes de borrarlo, confirmar que ningún link (redes, carteles, QR) apunte a `…/trayectoria.html`.
- **El bloque `modal-optativas`** en `index.html` ("Catálogo de Optativas") no se abre desde ningún lado y llama a una función, `cerrarModalOptativas`, que no existe. Se puede borrar o terminar de implementar.
- **Un HTML viejo dentro del proyecto de Apps Script**: es la primera versión de la web, todo en un solo archivo y sin Mi Trayectoria. Apunta a otra implementación del script y nadie lo muestra. Se puede borrar del proyecto de Apps Script.

---

*Si cambiás algo importante del funcionamiento, actualizá también este README para la próxima persona que lo mantenga.* 💜
