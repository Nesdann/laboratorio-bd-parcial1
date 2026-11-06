# Práctico VIII – Pipeline de Agregación en MongoDB

Bases de datos: `mflix` y `restaurantdb`.

---

## Base `mflix`

### 1. Cantidad de cines por estado

```js
db.theaters.aggregate([
  { $group: { _id: "$location.address.state", cantidad: { $sum: 1 } } }
])
```

### 2. Cantidad de estados con al menos dos cines

Se agrupa por estado, se filtran los grupos con 2 o más cines y se cuenta cuántos quedan.

```js
db.theaters.aggregate([
  { $group: { _id: "$location.address.state", cantidad: { $sum: 1 } } },
  { $match: { cantidad: { $gte: 2 } } },
  { $count: "estados_con_al_menos_dos_cines" }
])
```

### 3. Películas dirigidas por "Louis Lumière"

Con pipeline:

```js
db.movies.aggregate([
  { $match: { directors: "Louis Lumière" } },
  { $count: "total" }
])
```

Sin pipeline:

```js
db.movies.countDocuments({ directors: "Louis Lumière" })
```

### 4. Películas estrenadas en los años 50

Con pipeline:

```js
db.movies.aggregate([
  { $match: { year: { $gte: 1950, $lte: 1959 } } },
  { $count: "total" }
])
```

Sin pipeline:

```js
db.movies.countDocuments({ year: { $gte: 1950, $lte: 1959 } })
```

### 5. Top 10 géneros con más películas

`$unwind` genera un documento por cada género de la película, así se cuenta correctamente cada género.

```js
db.movies.aggregate([
  { $unwind: "$genres" },
  { $group: { _id: "$genres", cantidad: { $sum: 1 } } },
  { $sort: { cantidad: -1 } },
  { $limit: 10 },
  { $project: { _id: 0, genero: "$_id", cantidad: 1 } }
])
```

### 6. Top 10 usuarios con más comentarios

Se agrupa por email (único por usuario) y se conserva el nombre con `$first`.

```js
db.comments.aggregate([
  { $group: { _id: "$email", nombre: { $first: "$name" }, cantidad_comentarios: { $sum: 1 } } },
  { $sort: { cantidad_comentarios: -1 } },
  { $limit: 10 },
  { $project: { _id: 0, nombre: 1, email: "$_id", cantidad_comentarios: 1 } }
])
```

### 7. Rating IMDB promedio, mínimo y máximo por año (años 80)

Se filtran solo ratings de tipo `double` para evitar valores no numéricos.

```js
db.movies.aggregate([
  { $match: { year: { $gte: 1980, $lte: 1989 }, "imdb.rating": { $type: "double" } } },
  { $group: {
      _id: "$year",
      promedio: { $avg: "$imdb.rating" },
      minimo: { $min: "$imdb.rating" },
      maximo: { $max: "$imdb.rating" }
  } },
  { $sort: { promedio: -1 } }
])
```

### 8. Las 10 películas con más comentarios

Se cuentan los comentarios por `movie_id`, y luego se hace `$lookup` para traer título y año.

```js
db.comments.aggregate([
  { $group: { _id: "$movie_id", cantidad_comentarios: { $sum: 1 } } },
  { $sort: { cantidad_comentarios: -1 } },
  { $limit: 10 },
  { $lookup: { from: "movies", localField: "_id", foreignField: "_id", as: "pelicula" } },
  { $unwind: "$pelicula" },
  { $project: { _id: 0, titulo: "$pelicula.title", anio: "$pelicula.year", cantidad_comentarios: 1 } }
])
```

### 9. Vista con los 5 géneros con más comentarios

Cada comentario se une con su película, se separa por género y se cuenta.

```js
db.createView("top5_generos_comentados", "comments", [
  { $lookup: { from: "movies", localField: "movie_id", foreignField: "_id", as: "pelicula" } },
  { $unwind: "$pelicula" },
  { $unwind: "$pelicula.genres" },
  { $group: { _id: "$pelicula.genres", cantidad_comentarios: { $sum: 1 } } },
  { $sort: { cantidad_comentarios: -1 } },
  { $limit: 5 },
  { $project: { _id: 0, genero: "$_id", cantidad_comentarios: 1 } }
])

db.top5_generos_comentados.find()
```

### 10. Actores con 2 o más películas dirigidas por "Jules Bass"

Se separa por actor, se agrupan sus películas con `$addToSet` y se queda con los que tienen al menos 2 (`movies.1` existe si el arreglo tiene 2 o más elementos).

```js
db.movies.aggregate([
  { $match: { directors: "Jules Bass" } },
  { $unwind: "$cast" },
  { $group: {
      _id: "$cast",
      peliculas: { $addToSet: { titulo: "$title", anio: "$year" } }
  } },
  { $match: { "peliculas.1": { $exists: true } } },
  { $project: { _id: 0, actor: "$_id", peliculas: 1 } }
])
```

### 11. Usuarios que comentaron en el mismo mes de lanzamiento de la película

`$lookup` con `let` y `pipeline` permite comparar `_id` de la película, y mes y año entre la fecha del comentario y `released`.

```js
db.comments.aggregate([
  { $lookup: {
      from: "movies",
      let: { movieId: "$movie_id", fechaComentario: "$date" },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ["$_id", "$$movieId"] },
          { $eq: [{ $year: "$released" },  { $year: "$$fechaComentario" }] },
          { $eq: [{ $month: "$released" }, { $month: "$$fechaComentario" }] }
        ] } } }
      ],
      as: "pelicula"
  } },
  { $unwind: "$pelicula" },
  { $project: {
      _id: 0,
      nombre: "$name",
      email: 1,
      fecha_comentario: "$date",
      titulo: "$pelicula.title",
      fecha_lanzamiento: "$pelicula.released"
  } }
])
```

---

## Base `restaurantdb`

### 12. Id, nombre y puntuación máxima, mínima y total por restaurante

**a) Con `$group` y accumulators**

```js
db.restaurants.aggregate([
  { $unwind: "$grades" },
  { $group: {
      _id: { restaurant_id: "$restaurant_id", name: "$name" },
      maxima: { $max: "$grades.score" },
      minima: { $min: "$grades.score" },
      total:  { $sum: "$grades.score" }
  } }
])
```

**b) Con expresiones sobre arreglos, sin `$group`**

`$max`, `$min` y `$sum` operan directamente sobre el arreglo `grades.score`.

```js
db.restaurants.aggregate([
  { $project: {
      _id: 0,
      restaurant_id: 1,
      name: 1,
      maxima: { $max: "$grades.score" },
      minima: { $min: "$grades.score" },
      total:  { $sum: "$grades.score" }
  } }
])
```

**c) Igual que b) pero con `$reduce` para el total**

```js
db.restaurants.aggregate([
  { $project: {
      _id: 0,
      restaurant_id: 1,
      name: 1,
      maxima: { $max: "$grades.score" },
      minima: { $min: "$grades.score" },
      total: {
        $reduce: {
          input: "$grades",
          initialValue: 0,
          in: { $add: ["$$value", "$$this.score"] }
        }
      }
  } }
])
```

**d) Con `find`**

`find` admite expresiones de agregación en la proyección (MongoDB 4.4+).

```js
db.restaurants.find(
  {},
  {
    _id: 0,
    restaurant_id: 1,
    name: 1,
    maxima: { $max: "$grades.score" },
    minima: { $min: "$grades.score" },
    total:  { $sum: "$grades.score" }
  }
)
```

### 13. Agregar `average_score` y `grade` con una sola query

Se usa un pipeline dentro de `updateMany`. Se necesitan dos `$set` consecutivos porque `grade` depende de `average_score`. Se usa `$lt: 14` y `$lt: 28` para no dejar huecos con promedios decimales (por ejemplo 13.5).

```js
db.restaurants.updateMany(
  {},
  [
    { $set: { average_score: { $avg: "$grades.score" } } },
    { $set: {
        grade: {
          $switch: {
            branches: [
              { case: { $lt: ["$average_score", 14] }, then: "A" },
              { case: { $lt: ["$average_score", 28] }, then: "B" }
            ],
            default: "C"
          }
        }
    } }
  ]
)
```
