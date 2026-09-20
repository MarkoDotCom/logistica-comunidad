# Reglas de diseño del cliente

Guía para mantener coherente la interfaz de la app Angular (`client/`). Describe lo que ya existe en el código; si algo cambia en `src/styles.scss` o en `src/app/shared/ui/`, actualiza este documento en el mismo commit.

Referencia viva: `http://localhost:4200/ux` muestra todos los componentes y clases globales con sus variantes.

## 1. Principios

- **Simplicidad**: SCSS plano, sin framework CSS ni librería de componentes. Solo se agrega lo que una página necesita.
- **Componentes pequeños**: un componente hace una cosa. Si un patrón se repite en dos páginas, pasa a `shared/ui` o a una clase global.
- **Todo en español**: textos de interfaz, etiquetas de estado (`core/labels.ts`) y mensajes de error. `LOCALE_ID` es `es`, así que fechas y números se formatean en español.
- **Claro y oscuro desde el inicio**: ningún estilo funciona en un solo tema.
- **Signals y standalone**: componentes standalone, estado con `signal`/`computed`, entradas con `input()`/`model()`, salidas con `output()`. La app es zoneless.

## 2. Tokens de color

Definidos en `src/styles.scss`. Es el único lugar con colores literales; el resto del código usa `var(--ui-color-*)`.

| Token | Uso |
|---|---|
| `--ui-color-bg` | Fondo de la página |
| `--ui-color-surface` | Fondo de tarjetas, header, sidebar, inputs |
| `--ui-color-border` | Bordes suaves y separadores |
| `--ui-color-border-strong` | Bordes de inputs y marcadores |
| `--ui-color-hover` | Fondo al pasar el mouse (filas, botones ghost) |
| `--ui-color-text` | Títulos y texto principal |
| `--ui-color-text-body` | Texto de cuerpo |
| `--ui-color-text-muted` | Texto secundario, fechas, ayudas |
| `--ui-color-primary` / `-primary-hover` | Acción principal, enlaces, paso activo |
| `--ui-color-on-primary` | Texto sobre primary |
| `--ui-color-accent-bg` / `-accent-text` | Tags y estado activo en navegación |
| `--ui-color-danger` | Errores |

Tema: `:root` define claro; el mixin `dark-theme` se aplica con `prefers-color-scheme: dark` (salvo `data-theme="light"`) y con `:root[data-theme="dark"]`. `ui-theme-toggle` escribe `data-theme` en `<html>` y lo guarda en `localStorage` bajo la clave `theme`.

Reglas:

- No usar hex, `rgb()` ni nombres de color fuera de `styles.scss`. Excepción: el backdrop del sidebar (`rgb(0 0 0 / 40%)`) y la sombra de tarjeta.
- Para agregar un color, añadirlo en claro y en oscuro a la vez.
- La landing (`landing/`) copia estos tokens; si cambia la paleta, cambiar en ambos.

## 3. Tipografía, espaciado y forma

- Fuente: `system-ui, sans-serif`. Sin webfonts en la app.
- Tamaños en `rem`: 0.75 (tags, marcadores), 0.8125 (cabeceras de tabla, ayudas), 0.875 (secundario), 0.9375 (tablas), 1 (cuerpo), 1.125 (título de tarjeta), 1.75 (título de página).
- Pesos: 400 cuerpo, 500 etiquetas y enlaces, 600 botones y títulos de tarjeta, 700 marca y títulos de página.
- Radios: 0.5rem (inputs, botones), 0.75rem (tarjetas), `9999px` (tags, marcadores de stepper).
- Sombra: solo en tarjetas, `0 1px 2px rgba(0, 0, 0, 0.05)`.
- Espaciado con múltiplos de 0.25rem. Separación entre bloques de una página: 1.5rem; entre secciones largas: 3rem.
- Transiciones de 0.15s `ease` en color, fondo, borde y opacidad. Nada más se anima, salvo el drawer del sidebar (0.2s).
- Contenedores: `.page` 960px, `.page--narrow` 720px, formularios de alta 640px, grillas `auto-fit` con mínimo 260 a 280px.

## 4. Librería `shared/ui`

Ubicación: `src/app/shared/ui/<nombre>/` con `nombre.ts`, `nombre.html`, `nombre.scss` y `nombre.spec.ts`. Se exporta desde `shared/ui/index.ts` y se importa siempre desde ahí.

Convenciones:

- Selector con prefijo `ui-` (`ui-card`). Nombre de clase sin prefijo (`Card`).
- Clases CSS con BEM y el mismo prefijo: bloque `ui-card`, elemento `ui-card__title`, modificador `ui-button--ghost`.
- El input de título se llama `heading`, nunca `title`, para no generar el atributo nativo `title` en el host.
- Contenido libre por proyección (`<ng-content />`). Los datos estructurados van por inputs.
- Los componentes no conocen rutas ni APIs. Emiten eventos (`clicked`, `action`, `finish`) y la página decide.
- Estilos encapsulados por componente. Si un estilo debe llegar al consumidor, va como clase global en `styles.scss`.
- Cuándo crear componente y cuándo clase global: componente cuando hay estado, lógica o estructura fija (card, stepper, sidebar); clase global cuando solo se estiliza HTML nativo (inputs, tabla, utilidades).

Inventario:

| Componente | API | Notas |
|---|---|---|
| `ui-button` | `variant` primary/secondary/ghost/danger, `type`, `disabled`, `(clicked)` | Contenido proyectado. `danger` solo para acciones destructivas |
| `ui-tag` | proyección | Píldora con `accent-bg` |
| `ui-card` | `heading`, `content`, `actions: CardAction[]`, `(action)`; wizard: `steps`, `[(step)]`, `canAdvance`, `finishVariant`, `(finish)` | Con `steps` muestra `ui-stepper` y botones Anterior (izquierda) / Siguiente / Finalizar (derecha). Columna flex: en un `ui-dialog` las acciones quedan ancladas abajo |
| `ui-dialog` | `[(open)]` | Modal sobre `<dialog>` de tamaño fijo (40rem × 40rem) sin superficie propia; el contenido trae su `ui-card`. Cierra con Escape, fondo o × |
| `ui-stepper` | `steps: string[]`, `step: number` | Pasos anteriores con ✓, activo con `aria-current="step"` |
| `ui-profile-card` | `imageSrc`, `name`, `subtitle`, `fallbackSrc` | Cae al avatar de respaldo si la imagen falla |
| `ui-link` | `href`, `external`, `ariaLabel` | Externo abre en pestaña nueva con `rel` seguro |
| `ui-progress-bar` | `label`, `value` 0–100 | `role="progressbar"` con `aria-value*` |
| `ui-section-header` | `heading`, `subtitle` | Título de página o sección |
| `ui-sidebar` | `items: SidebarItem[]`, `[(open)]` | Navegación por anclas con `IntersectionObserver`; drawer bajo 768px |
| `ui-theme-toggle` | — | Ver tokens |

## 5. Clases globales (`styles.scss`)

Formularios (no hay componentes de formulario):

- `.ui-field` envuelve etiqueta y control; `.ui-field__label` para el texto.
- `.ui-input`, `.ui-select`, `.ui-textarea` para controles nativos. `.ui-checkbox` para checkbox y radio con texto.
- `.ui-form__error` para el mensaje de error, `.ui-form__actions` para la fila de botones.

Tablas:

- `.ui-table-wrap` da scroll horizontal en pantallas angostas. Dentro, `<table class="ui-table">` con `thead`/`tbody`.
- `.ui-table__actions` en la celda de botones, alineada a la derecha. La cabecera de esa columna va vacía.

Layout y utilidades:

- `.page`, `.page--narrow`, `.page__grid`, `.page__back` para páginas dentro del Shell.
- `.ui-muted` para texto secundario, `.ui-tags` para una fila de tags.

## 6. Patrones de página

- **Con sesión**: van bajo `Shell`, que pone el header con navegación por rol. La página empieza con `<main class="page">` y un `ui-section-header`.
- **Públicas** (`/`, `/usuarios/nuevo`, `/ux`): header propio mínimo con marca y `ui-theme-toggle`. Enlace `.page__back` para volver.
- **Estados**: toda carga de datos muestra, en este orden, error (`.ui-form__error`), vacío (`.ui-muted` con enlace a la acción siguiente) o "Cargando…". Los datos se guardan en un `signal<T[] | null>` y un `signal(false)` para el fallo.
- **Listas**: tabla cuando las filas comparten columnas y tienen acciones por fila (postulaciones, ofertas de la empresa). Tarjetas en grilla cuando cada elemento tiene contenido variable (ofertas públicas, postulantes, proyectos).
- **Wizard**: `ui-card` con `steps` dentro de un `ui-dialog`. El primer paso presenta qué se va a hacer, el último confirma con un resumen, y al terminar se reemplaza el wizard por una tarjeta de resultado con el stepper completo y las acciones siguientes. Un wizard por funcionalidad (crear, modificar, eliminar); `finishVariant="danger"` en los que eliminan. La guía completa, pensada para portar el patrón, está en [`modales-y-wizards.md`](./modales-y-wizards.md).
- **Páginas largas**: `ui-sidebar` con anclas a secciones `id` y botón de menú visible solo en móvil.
- **Etiquetas**: los valores de enums de la API se traducen con los mapas de `core/labels.ts`. Nunca se muestra el valor crudo.

## 7. Formularios y errores

- Reactive forms con `NonNullableFormBuilder`. En páginas zoneless que deciden en la plantilla según el valor, exponer `toSignal(form.valueChanges)`.
- Errores de validación solo tras `touched`, con un mensaje corto en `.ui-form__error` dentro del `.ui-field`.
- En un wizard, bloquear el avance con `canAdvance` en lugar de mostrar errores al pulsar Siguiente.
- Al enviar: `saving` en `true`, deshabilitar el botón, limpiar el error anterior. El mensaje de la API (`e.error.message`, string o array) se muestra tal cual; si no hay, un texto genérico en español.
- Navegar o mostrar resultado solo en `next`, nunca antes de la respuesta.

## 8. Accesibilidad e idioma

- Botones nativos dentro de `ui-button`; enlaces con `routerLink` o `ui-link`, nunca `<div (click)>`.
- Iconos SVG inline con `aria-hidden="true"` y el botón que los contiene con `aria-label`.
- Menú y drawer: `aria-label` en `<nav>`, `aria-expanded` en el botón, cierre con Escape y backdrop.
- Stepper con `aria-current="step"`, barra de progreso con `role="progressbar"`.
- Imágenes decorativas con `alt=""`.
- Foco visible: `outline` de 2px en primary en los controles de formulario.
- Textos, etiquetas y mensajes en español. Sin abreviaturas en la interfaz.

## 9. Checklist para un componente nuevo

1. Carpeta en `shared/ui/<nombre>/` con los cuatro archivos y selector `ui-<nombre>`.
2. Clases BEM con prefijo `ui-`; colores solo con tokens; revisado en claro y oscuro.
3. Inputs con `input()`/`model()`, salidas con `output()`. Sin rutas ni HTTP dentro.
4. Spec con un host de prueba que cubra inputs, salidas y estados.
5. Export en `shared/ui/index.ts`.
6. Sección en `/ux` (`pages/ux/`) con las variantes y un ítem en su sidebar.
7. Fila en el inventario de este documento.
