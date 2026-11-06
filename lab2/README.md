# 🚀 MongoDB: el gran machete

Apuntes con ejemplos de código ejecutables para el parcial. Todos los ejemplos usan los mismos datos (`datos/seed.js`), así que podés copiar y pegar cada consulta y comparar con el resultado que se muestra.

## Índice

| Archivo | Tema |
|---|---|
| [01-conceptos.md](01-conceptos.md) | Modelo mental, el símbolo `$`, tipos |
| [02-crud.md](02-crud.md) | find, insert, update, delete, proyecciones |
| [03-operadores-filtro.md](03-operadores-filtro.md) | Comparación, lógicos, arrays, fechas, `$expr` |
| [04-aggregation.md](04-aggregation.md) | Pipeline: `$match`, `$group`, `$unwind`, etc. |
| [05-lookup.md](05-lookup.md) | El JOIN de Mongo |
| [06-validacion-esquemas.md](06-validacion-esquemas.md) | `$jsonSchema` |
| [07-modelado.md](07-modelado.md) | Embedding vs referencing |
| [08-update-pipeline.md](08-update-pipeline.md) | Updates con pipeline |
| [09-checklist-parcial.md](09-checklist-parcial.md) | Qué usar según lo que pide el enunciado |

## Cómo correr los ejemplos

Con `mongosh` conectado a tu instancia (local o Atlas):

```bash
mongosh < datos/seed.js
# o, dentro de mongosh:
load("datos/seed.js")
```

Eso crea la base `machete` con las colecciones `usuarios`, `productos`, `peliculas` y `comentarios`. Después:

```js
use machete
db.usuarios.find()
```

Podés volver a correr `seed.js` cuando quieras para resetear los datos (borra y recrea todo).
