# Práctico 1 – MongoDB

## Parte I – Base `mflix`

### 1. Insertar 5 usuarios y al menos un comentario por cada uno

Se insertan los usuarios y luego los comentarios asociados por `name` y `email`. El `movie_id` es el de una película existente.

```js
db.users.insertMany([
  { name: "Usuario Uno",    email: "uno@example.com",    password: "pass1" },
  { name: "Usuario Dos",    email: "dos@example.com",    password: "pass2" },
  { name: "Usuario Tres",   email: "tres@example.com",   password: "pass3" },
  { name: "Usuario Cuatro", email: "cuatro@example.com", password: "pass4" },
  { name: "Usuario Cinco",  email: "cinco@example.com",  password: "pass5" }
])

db.comments.insertMany([
  { name: "Usuario Uno",    email: "uno@example.com",    movie_id: ObjectId("573a1390f29313caabcd4132"), text: "Muy buena película", date: new Date() },
  { name: "Usuario Dos",    email: "dos@example.com",    movie_id: ObjectId("573a1390f29313caabcd4132"), text: "Interesante",        date: new Date() },
  { name: "Usuario Tres",   email: "tres@example.com",   movie_id: ObjectId("573a1390f29313caabcd4132"), text: "Me gustó",           date: new Date() },
  { name: "Usuario Cuatro", email: "cuatro@example.com", movie_id: ObjectId("573a1390f29313caabcd4132"), text: "Muy corta",          date: new Date() },
  { name: "Usuario Cinco",  email: "cinco@example.com",  movie_id: ObjectId("573a1390f29313caabcd4132"), text: "Un clásico",         date: new Date() }
])
```

### 2. Top 10 películas de los 90 por rating

Se filtra por década y por `imdb.rating` de tipo `double` (descarta valores como strings vacíos). El mayor rating es el del primer documento del resultado.

```js
db.movies.find(
  {
    year: { $gte: 1990, $lte: 1999 },
    "imdb.rating": { $type: "double" }
  },
  { _id: 0, title: 1, year: 1, cast: 1, directors: 1, "imdb.rating": 1 }
).sort({ "imdb.rating": -1 }).limit(10)
```

### 3. Comentarios de una película entre 2014 y 2016

Se usa `$lt: 2017-01-01` para incluir todo 2016.

```js
db.comments.find(
  {
    movie_id: ObjectId("573a1399f29313caabcee886"),
    date: { $gte: new Date("2014-01-01"), $lt: new Date("2017-01-01") }
  },
  { _id: 0, name: 1, email: 1, text: 1, date: 1 }
).sort({ date: 1 })
```

Cantidad de comentarios:

```js
db.comments.countDocuments({
  movie_id: ObjectId("573a1399f29313caabcee886"),
  date: { $gte: new Date("2014-01-01"), $lt: new Date("2017-01-01") }
})
```

### 4. Los 3 comentarios más recientes de un usuario

```js
db.comments.find(
  { email: "patricia_good@fakegmail.com" },
  { _id: 0, name: 1, movie_id: 1, text: 1, date: 1 }
).sort({ date: -1 }).limit(3)
```

### 5. Películas Drama y Action, un solo idioma, rating > 9 o runtime ≥ 180

`$all` exige ambos géneros (permitiendo otros adicionales) y `$size: 1` asegura un único idioma.

```js
db.movies.find(
  {
    genres: { $all: ["Drama", "Action"] },
    languages: { $size: 1 },
    $or: [
      { "imdb.rating": { $gt: 9 } },
      { runtime: { $gte: 180 } }
    ]
  },
  { _id: 0, title: 1, languages: 1, genres: 1, released: 1, "imdb.votes": 1 }
).sort({ released: 1, "imdb.votes": 1 })
```

### 6. Teatros en CA, NY o TX cuya ciudad empieza con "F"

```js
db.theaters.find(
  {
    "location.address.state": { $in: ["CA", "NY", "TX"] },
    "location.address.city": /^F/
  },
  {
    _id: 0,
    theaterId: 1,
    "location.address.state": 1,
    "location.address.city": 1,
    "location.geo.coordinates": 1
  }
).sort({ "location.address.state": 1, "location.address.city": 1 })
```

### 7. Actualizar texto y fecha de un comentario

```js
db.comments.updateOne(
  { _id: ObjectId("5b72236520a3277c015b3b73") },
  { $set: { text: "mi mejor comentario", date: new Date() } }
)
```

### 8. Upsert de contraseña de usuario

Con `upsert: true`, si el usuario no existe se inserta; si existe se actualiza.

```js
db.users.updateOne(
  { email: "joel.macdonel@fakegmail.com" },
  { $set: { password: "some password" } },
  { upsert: true }
)
```

- **Primera ejecución:** si el usuario no existía, se realiza un **insert** (`upsertedCount: 1`).
- **Segunda ejecución:** el usuario ya existe, por lo que se hace un **update** (`matchedCount: 1`, y `modifiedCount: 0` porque el valor ya era el mismo).

### 9. Eliminar comentarios de un usuario durante 1980

```js
db.comments.deleteMany({
  email: "victor_patel@fakegmail.com",
  date: { $gte: new Date("1980-01-01"), $lt: new Date("1981-01-01") }
})
```

---

## Parte II – Base `restaurantdb`

### 1. Restaurantes con una calificación entre 2014 y 2015 y score en (70, 90]

`$elemMatch` obliga a que fecha y score se cumplan en la **misma** calificación.

```js
db.restaurants.find(
  {
    grades: {
      $elemMatch: {
        date: { $gte: ISODate("2014-01-01T00:00:00Z"), $lt: ISODate("2016-01-01T00:00:00Z") },
        score: { $gt: 70, $lte: 90 }
      }
    }
  },
  { _id: 0, restaurant_id: 1, grades: 1 }
)
```

### 2. Agregar dos calificaciones a un restaurante en una sola consulta

`$push` con `$each` agrega ambos elementos al arreglo en una sola operación.

```js
db.restaurants.updateOne(
  { restaurant_id: "50018608" },
  {
    $push: {
      grades: {
        $each: [
          { date: ISODate("2019-10-10T00:00:00Z"), grade: "A", score: 18 },
          { date: ISODate("2020-02-25T00:00:00Z"), grade: "A", score: 21 }
        ]
      }
    }
  }
)
```
