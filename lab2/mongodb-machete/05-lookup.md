# 05 · `$lookup`: el JOIN de Mongo

## Molde básico (solo igualdad)

```js
{ $lookup: {
    from: "otraColeccion",
    localField: "campoLocal",       // campo de la colección actual
    foreignField: "campoAjeno",     // campo de la otra colección
    as: "nombreDelArray"            // dónde se guardan los resultados
} }
```

## Ejemplo: películas con sus comentarios

En `comentarios`, `movie_id` apunta al `_id` de la película.

```js
db.peliculas.aggregate([
  { $lookup: {
      from: "comentarios",
      localField: "_id",
      foreignField: "movie_id",
      as: "comentarios"
  } },
  { $project: { _id: 0, titulo: 1, cantComentarios: { $size: "$comentarios" } } }
])
```

```js
{ titulo: 'Matrix',  cantComentarios: 3 }
{ titulo: 'Titanic', cantComentarios: 1 }
{ titulo: 'Alien',   cantComentarios: 1 }
```

## ⚠️ Siempre devuelve un Array

Aunque haya **una sola** coincidencia (o ninguna), `as` es un array.

```js
// Titanic -> comentarios: [ { usuario: 'Juan', ... } ]   (array de 1 elemento)
```

Si querés un objeto, usá `$unwind` después:

```js
db.comentarios.aggregate([
  { $lookup: { from: "peliculas", localField: "movie_id", foreignField: "_id", as: "pelicula" } },
  { $unwind: "$pelicula" },
  { $project: { _id: 0, usuario: 1, puntaje: 1, titulo: "$pelicula.titulo" } }
])
```

```js
{ usuario: 'Ana',   puntaje: 5, titulo: 'Matrix' }
{ usuario: 'Luis',  puntaje: 4, titulo: 'Matrix' }
{ usuario: 'Maria', puntaje: 5, titulo: 'Matrix' }
{ usuario: 'Juan',  puntaje: 3, titulo: 'Titanic' }
{ usuario: 'Ana',   puntaje: 4, titulo: 'Alien' }
```

> Si el `$lookup` no encuentra nada, `as` queda `[]`, y el `$unwind` **elimina** ese documento (igual que un INNER JOIN).

## Ejemplo completo: promedio de puntaje por película

```js
db.comentarios.aggregate([
  { $group: { _id: "$movie_id", promedio: { $avg: "$puntaje" }, cant: { $sum: 1 } } },
  { $lookup: { from: "peliculas", localField: "_id", foreignField: "_id", as: "peli" } },
  { $unwind: "$peli" },
  { $project: { _id: 0, titulo: "$peli.titulo", promedio: 1, cant: 1 } },
  { $sort: { promedio: -1 } }
])
```

```js
{ titulo: 'Matrix',  promedio: 4.666..., cant: 3 }   // (5 + 4 + 5) / 3
{ titulo: 'Alien',   promedio: 4,        cant: 1 }
{ titulo: 'Titanic', promedio: 3,        cant: 1 }
```

Idea: **agrupar primero** (menos documentos) y **hacer el `$lookup` después** sale más barato que hacer el join de todo y agrupar al final.

## Múltiples condiciones (avanzado): `let` + `pipeline` + `$expr`

Cuando necesitás más que una igualdad. Las variables de `let` se usan como `"$$variable"` (doble `$`), y los campos de la colección ajena como `"$campo"`.

```js
// Para cada película, solo los comentarios con puntaje >= 5
db.peliculas.aggregate([
  { $lookup: {
      from: "comentarios",
      let: { id_peli: "$_id" },
      pipeline: [
        { $match: { $expr: { $and: [
            { $eq: ["$movie_id", "$$id_peli"] },
            { $gte: ["$puntaje", 5] }
        ] } } }
      ],
      as: "comentariosTop"
  } },
  { $project: { _id: 0, titulo: 1, tops: { $size: "$comentariosTop" } } }
])
```

```js
{ titulo: 'Matrix',  tops: 2 }   // Ana (5) y Maria (5)
{ titulo: 'Titanic', tops: 0 }
{ titulo: 'Alien',   tops: 0 }
```

| Sintaxis | Qué es |
|---|---|
| `"$campo"` | Campo del documento actual (dentro del `pipeline`: de la colección **ajena**) |
| `"$$variable"` | Variable definida en `let` (viene de la colección **local**) |
