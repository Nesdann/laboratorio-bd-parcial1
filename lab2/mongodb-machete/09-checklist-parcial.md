# 09 · Checklist para el parcial

## ¿Qué uso según lo que pide el enunciado?

| El enunciado dice... | Usá |
|---|---|
| "Listar solo los campos X e Y" | Proyección en `find`, o `$project` en `aggregate` |
| "Cantidad de..." / "cuántos..." | `$group` con `$sum: 1`, o `$count` |
| "Promedio / total / máximo de..." | `$group` con `$avg` / `$sum` / `$max` |
| "Los N con más / menos..." | `$group` → `$sort` → `$limit` |
| "Cruzar datos de dos colecciones" | `$lookup` (+ `$unwind` si querés objeto) |
| "Hay un array y quiero agrupar/contar sus elementos" | `$unwind` → `$group` |
| "Comparar dos campos del mismo documento" | `$expr` dentro de `$match` |
| "El mismo elemento del array cumple varias condiciones" | `$elemMatch` |
| "Que solo entren documentos de cierta forma" | `$jsonSchema` en `createCollection` o `collMod` |
| "Modificar un campo en función de otros" | Update con pipeline `[ ]` |
| "Agregar al array sin repetir" | `$addToSet` |
| "Modelá / justificá cómo guardarías..." | Embedding vs referencia (ver `07-modelado.md`) |

## Errores típicos

- [ ] Mezclar `1` y `0` en una proyección (solo `_id` puede ir distinto).
- [ ] Comparar `ObjectId` contra string.
- [ ] Esperar un objeto del `$lookup`: **siempre devuelve array**.
- [ ] Olvidarse el `[ ]` en un update con pipeline.
- [ ] Usar `5` en vez de `NumberInt(5)` cuando el esquema pide `"int"`.
- [ ] Repetir la misma clave en un objeto (`{ edad: {...}, edad: {...} }`).
- [ ] Poner `$match` tarde en el pipeline (debe ir lo más arriba posible).
- [ ] `$unwind` sobre un array vacío: el documento desaparece.
- [ ] Olvidarse el `$` en `"$campo"` dentro de `$group` / `$project`.
- [ ] Llaves, corchetes o comas mal cerrados. **Indentá**: la presentación suma puntos.

## Ejercicios de práctica (con el seed)

Intentá resolverlos vos y después comparás con las soluciones.

1. Nombres y emails de usuarios de Córdoba, sin `_id`.
2. Cantidad de usuarios por ciudad, de mayor a menor.
3. El tag más frecuente entre todos los usuarios.
4. Productos con `vendidos >= stock`.
5. Títulos de películas y cantidad de comentarios de cada una.
6. Promedio de puntaje por película, mostrando el título.
7. Subir 10% el precio de los productos con stock > 5.
8. Crear una colección con validación: `nombre` string obligatorio, `edad` int entre 0 y 120.

<details>
<summary>Soluciones</summary>

```js
// 1
db.usuarios.find({ ciudad: "Cordoba" }, { _id: 0, nombre: 1, email: 1 })

// 2
db.usuarios.aggregate([
  { $group: { _id: "$ciudad", cantidad: { $sum: 1 } } },
  { $sort: { cantidad: -1 } }
])

// 3
db.usuarios.aggregate([
  { $unwind: "$tags" },
  { $group: { _id: "$tags", veces: { $sum: 1 } } },
  { $sort: { veces: -1 } },
  { $limit: 1 }
])  // rojo, 3

// 4
db.productos.find({ $expr: { $gte: ["$vendidos", "$stock"] } })  // Buzo, Gorra

// 5
db.peliculas.aggregate([
  { $lookup: { from: "comentarios", localField: "_id", foreignField: "movie_id", as: "c" } },
  { $project: { _id: 0, titulo: 1, cantidad: { $size: "$c" } } }
])

// 6
db.comentarios.aggregate([
  { $group: { _id: "$movie_id", promedio: { $avg: "$puntaje" } } },
  { $lookup: { from: "peliculas", localField: "_id", foreignField: "_id", as: "p" } },
  { $unwind: "$p" },
  { $project: { _id: 0, titulo: "$p.titulo", promedio: 1 } }
])

// 7  (Remera stock 10 y Gorra stock 8 -> 1100 y 550)
db.productos.updateMany(
  { stock: { $gt: 5 } },
  [ { $set: { precio: { $multiply: ["$precio", 1.1] } } } ]
)

// 8
db.createCollection("personas", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["nombre"],
    properties: {
      nombre: { bsonType: "string" },
      edad:   { bsonType: "int", minimum: 0, maximum: 120 }
    }
  } }
})
```

</details>
