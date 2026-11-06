# Práctico IX – Modelado de Datos en MongoDB

## Parte I – Reglas de validación en `mflix`

> En `mongosh`, los literales numéricos enteros pueden guardarse como `double` o `int` según la versión. Para asegurar el tipo `int` se usa `NumberInt()`.

### 1. Validación en `users`

Se agrega el validador con `collMod`. El nombre tiene máximo 30 caracteres, el email debe cumplir la regex y la contraseña debe tener al menos 50 caracteres.

```js
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "password"],
      properties: {
        name:     { bsonType: "string", maxLength: 30 },
        email:    { bsonType: "string", pattern: "^(.*)@(.*)\\.(.{2,4})$" },
        password: { bsonType: "string", minLength: 50 }
      }
    }
  }
})
```

**Tests: 5 documentos válidos**

```js
const pwd = "p".repeat(60)

db.users.insertOne({ name: "Ana",   email: "ana@test.com",   password: pwd })
db.users.insertOne({ name: "Bruno", email: "bruno@test.org", password: pwd })
db.users.insertOne({ name: "Carla", email: "carla@test.com.ar", password: pwd })
db.users.insertOne({ name: "N".repeat(30), email: "max30@test.com", password: pwd })  // nombre de 30 caracteres
db.users.insertOne({ name: "Eva",   email: "eva@test.net",   password: "p".repeat(50) }) // password de 50 caracteres
```

**Tests: 5 documentos inválidos**

```js
db.users.insertOne({ name: "N".repeat(31), email: "largo@test.com", password: pwd }) // name > 30
db.users.insertOne({ name: "SinEmail", password: pwd })                              // falta email
db.users.insertOne({ name: "EmailMal", email: "sin-arroba.com", password: pwd })     // email no matchea la regex
db.users.insertOne({ name: "PassCorta", email: "pc@test.com", password: "corta" })   // password < 50
db.users.insertOne({ name: 123, email: "num@test.com", password: pwd })              // name no es string
```

```js
db.users.deleteMany({ email: /@test\./ })  // limpieza de los tests
```

### 2. Metadata de `users`

```js
db.getCollectionInfos({ name: "users" })
// o solo las opciones:
db.getCollectionInfos({ name: "users" })[0].options
```

### 3. Validación en `theaters` (solo advertir)

`validationAction: "warn"` permite insertar y actualizar documentos inválidos, pero registra una advertencia en el log.

```js
db.runCommand({
  collMod: "theaters",
  validationAction: "warn",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["theaterId", "location"],
      properties: {
        theaterId: { bsonType: "int" },
        location: {
          bsonType: "object",
          required: ["address"],
          properties: {
            address: {
              bsonType: "object",
              required: ["street1", "city", "state", "zipcode"],
              properties: {
                street1: { bsonType: "string" },
                city:    { bsonType: "string" },
                state:   { bsonType: "string" },
                zipcode: { bsonType: "string" }
              }
            },
            geo: {
              bsonType: "object",
              properties: {
                type:        { enum: ["Point", null] },
                coordinates: { bsonType: "array", minItems: 2, maxItems: 2, items: { bsonType: "double" } }
              }
            }
          }
        }
      }
    }
  }
})
```

**Tests: 5 documentos válidos**

```js
const addr = { street1: "Calle 1", city: "Cordoba", state: "CB", zipcode: "5000" }

db.theaters.insertOne({ theaterId: NumberInt(9001), location: { address: addr } })  // sin geo
db.theaters.insertOne({ theaterId: NumberInt(9002), location: { address: addr, geo: { type: "Point", coordinates: [-64.18, -31.42] } } })
db.theaters.insertOne({ theaterId: NumberInt(9003), location: { address: addr, geo: { type: null, coordinates: [-64.18, -31.42] } } })
db.theaters.insertOne({ theaterId: NumberInt(9004), location: { address: addr, geo: { coordinates: [-64.11, -31.35] } } })
db.theaters.insertOne({ theaterId: NumberInt(9005), location: { address: addr, geo: { type: "Point", coordinates: [-60.65, -32.95] } } })
```

**Tests: 5 documentos inválidos** (se insertan igual, pero generan advertencia)

```js
db.theaters.insertOne({ location: { address: addr } })                                  // falta theaterId
db.theaters.insertOne({ theaterId: "9007", location: { address: addr } })               // theaterId no es int
db.theaters.insertOne({ theaterId: NumberInt(9008), location: { address: { street1: "Calle", city: "X" } } }) // address incompleto
db.theaters.insertOne({ theaterId: NumberInt(9009), location: { address: addr, geo: { type: "Polygon", coordinates: [-64.18, -31.42] } } }) // type inválido
db.theaters.insertOne({ theaterId: NumberInt(9010), location: { address: addr, geo: { type: "Point", coordinates: [-64.18] } } })              // coordinates con 1 elemento
```

Para verificar las advertencias en el log del servidor:

```js
db.adminCommand({ getLog: "global" }).log.filter(l => l.includes("Document would fail validation"))
```

```js
db.theaters.deleteMany({ theaterId: { $gte: 9000 } })  // limpieza (los inválidos con theaterId string no coinciden)
db.theaters.deleteMany({ "location.address.street1": { $in: ["Calle 1", "Calle"] } })
```

### 4. Validación en `movies`

`uniqueItems: true` evita duplicados en los arreglos.

```js
const arrayDeStrings = { bsonType: "array", uniqueItems: true, items: { bsonType: "string" } }

db.runCommand({
  collMod: "movies",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "year"],
      properties: {
        title:     { bsonType: "string" },
        year:      { bsonType: "int", minimum: 1900, maximum: 3000 },
        cast:      arrayDeStrings,
        directors: arrayDeStrings,
        countries: arrayDeStrings,
        genres:    arrayDeStrings
      }
    }
  }
})
```

**Tests: 5 documentos válidos**

```js
db.movies.insertOne({ title: "Test 1", year: NumberInt(1900) })
db.movies.insertOne({ title: "Test 2", year: NumberInt(2020), cast: ["A", "B"], directors: ["D1"], countries: ["USA"], genres: ["Drama"] })
db.movies.insertOne({ title: "Test 3", year: NumberInt(3000), genres: ["Action", "Drama"] })
db.movies.insertOne({ title: "Test 4", year: NumberInt(1999), cast: [], countries: ["Argentina", "Chile"] })
db.movies.insertOne({ title: "Test 5", year: NumberInt(2005), directors: ["X", "Y"], cast: ["Z"] })
```

**Tests: 5 documentos inválidos**

```js
db.movies.insertOne({ year: NumberInt(2000) })                                          // falta title
db.movies.insertOne({ title: "Inv 2", year: NumberInt(1899) })                          // year < 1900
db.movies.insertOne({ title: "Inv 3", year: NumberInt(3001) })                          // year > 3000
db.movies.insertOne({ title: "Inv 4", year: NumberInt(2000), cast: ["A", "A"] })        // cast con duplicados
db.movies.insertOne({ title: "Inv 5", year: NumberInt(2000), genres: ["Drama", 5] })    // genres con un elemento que no es string
```

```js
db.movies.deleteMany({ title: /^Test \d$/ })  // limpieza
```

### 5. Colección `userProfiles`

```js
db.createCollection("userProfiles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "language"],
      properties: {
        user_id:         { bsonType: "objectId" },
        language:        { enum: ["English", "Spanish", "Portuguese"] },
        favorite_genres: { bsonType: "array", uniqueItems: true, items: { bsonType: "string" } }
      }
    }
  }
})
```

**Tests: 5 documentos válidos**

```js
db.userProfiles.insertOne({ user_id: new ObjectId(), language: "English" })
db.userProfiles.insertOne({ user_id: new ObjectId(), language: "Spanish", favorite_genres: ["Drama", "Comedy"] })
db.userProfiles.insertOne({ user_id: new ObjectId(), language: "Portuguese", favorite_genres: [] })
db.userProfiles.insertOne({ user_id: new ObjectId(), language: "Spanish", favorite_genres: ["Action"] })
db.userProfiles.insertOne({ user_id: new ObjectId(), language: "English", favorite_genres: ["Sci-Fi", "Horror", "Drama"] })
```

**Tests: 5 documentos inválidos**

```js
db.userProfiles.insertOne({ language: "English" })                                                    // falta user_id
db.userProfiles.insertOne({ user_id: "no-es-objectid", language: "English" })                         // user_id no es ObjectId
db.userProfiles.insertOne({ user_id: new ObjectId(), language: "French" })                            // language fuera del enum
db.userProfiles.insertOne({ user_id: new ObjectId() })                                                // falta language
db.userProfiles.insertOne({ user_id: new ObjectId(), language: "English", favorite_genres: ["Drama", "Drama"] }) // duplicados
```

---

## Modelado de datos en MongoDB

### 6. Relaciones en `movies` y `comments`

| Relación | Tipo | Estrategia | Justificación |
|---|---|---|---|
| `movies` → `imdb` (y otros subdocumentos como `awards`) | One-to-One | Anidado | Se leen siempre junto con la película, tienen tamaño fijo y no tienen sentido por sí solos. |
| `movies` → `cast`, `directors`, `genres`, `countries`, `languages` | One-to-Many (valores simples) | Anidado (arreglos) | Son pocos elementos, acotados, y se consultan junto con la película. No justifican una colección aparte. |
| `movies` → `comments` | One-to-Many | Referencia (`comments.movie_id`) | Los comentarios son potencialmente ilimitados y crecen con el tiempo (riesgo de arreglos sin cota y del límite de 16 MB). Además se consultan y modifican de forma independiente. |
| `users` → `comments` | One-to-Many | Referencia (el comentario guarda `name` y `email` del usuario) | Un usuario hace muchos comentarios y los datos del usuario se actualizan por separado. Se copian nombre y email para evitar un `$lookup` al listar comentarios. |

### 7. Modelo de datos `shop`

El diagrama original tiene `orders`, `order_details`, `books` y `categories`.

**Decisiones de modelado:**
- `order_details` se **anida** dentro de `orders` (siempre se leen juntos y son acotados). Cada detalle **referencia** al libro por `book_id` y guarda copia de `title`, `author` y `price` (precio al momento de la compra).
- `categories` se mantiene como colección y `books` la **referencia** por `category_id`, anidando también una copia de `category_name`. Así las queries 1 y 2 no necesitan `$lookup`.

**Modelo**

```js
// categories
{ _id: 1, category_name: "Programming" }

// books
{
  _id: 10, title: "MongoDB Basics", author: "Ana Perez", price: 29.9,
  category: { category_id: 1, category_name: "Programming" }
}

// orders
{
  _id: 1001,
  delivery_name: "Juan Gomez",
  delivery_address: "San Martin 123, Cordoba",
  cc_name: "Juan Gomez", cc_number: "4111111111111111", cc_expiry: "12/2028",
  order_details: [
    { book_id: 10, title: "MongoDB Basics", author: "Ana Perez", quantity: 2, price: 29.9 },
    { book_id: 11, title: "SQL Avanzado",   author: "Luis Diaz", quantity: 1, price: 35.5 }
  ]
}
```

**Inserts**

```js
db.categories.insertMany([
  { _id: 1, category_name: "Programming" },
  { _id: 2, category_name: "Databases" }
])

db.books.insertMany([
  { _id: 10, title: "MongoDB Basics", author: "Ana Perez", price: 29.9, category: { category_id: 2, category_name: "Databases" } },
  { _id: 11, title: "SQL Avanzado",   author: "Luis Diaz", price: 35.5, category: { category_id: 2, category_name: "Databases" } },
  { _id: 12, title: "JavaScript Moderno", author: "Ana Perez", price: 25.0, category: { category_id: 1, category_name: "Programming" } }
])

db.orders.insertMany([
  {
    _id: 1001, delivery_name: "Juan Gomez", delivery_address: "San Martin 123, Cordoba",
    cc_name: "Juan Gomez", cc_number: "4111111111111111", cc_expiry: "12/2028",
    order_details: [
      { book_id: 10, title: "MongoDB Basics", author: "Ana Perez", quantity: 2, price: 29.9 },
      { book_id: 11, title: "SQL Avanzado",   author: "Luis Diaz", quantity: 1, price: 35.5 }
    ]
  },
  {
    _id: 1002, delivery_name: "Maria Lopez", delivery_address: "Belgrano 456, Rosario",
    cc_name: "Maria Lopez", cc_number: "5500000000000004", cc_expiry: "05/2027",
    order_details: [
      { book_id: 12, title: "JavaScript Moderno", author: "Ana Perez", quantity: 3, price: 25.0 }
    ]
  }
])
```

**Índices**

```js
db.books.createIndex({ author: 1 })
db.books.createIndex({ "category.category_id": 1 })
```

**Query 1: id, título, precio y categoría de los libros de un autor**

```js
db.books.find(
  { author: "Ana Perez" },
  { title: 1, price: 1, category: 1 }
)
```

**Query 2: cantidad de libros por categoría**

```js
db.books.aggregate([
  { $group: { _id: "$category.category_name", cantidad: { $sum: 1 } } }
])
```

**Query 3: nombre, dirección de entrega y monto total de un pedido**

```js
db.orders.aggregate([
  { $match: { _id: 1001 } },
  { $project: {
      _id: 0,
      delivery_name: 1,
      delivery_address: 1,
      total: {
        $sum: {
          $map: {
            input: "$order_details",
            as: "d",
            in: { $multiply: ["$$d.quantity", "$$d.price"] }
          }
        }
      }
  } }
])
```

### 8. Modelo de datos del blog

El diagrama tiene `Users`, `Articles`, `Comments`, `Categories` y `Tags`. Un usuario escribe muchos artículos y comentarios, un artículo tiene muchos comentarios, y artículos con categorías y con tags son relaciones muchos a muchos.

```js
// IDs de ejemplo reutilizados en los tres modelos
const userId = new ObjectId(), user2Id = new ObjectId()
const artId = new ObjectId()
const catId = new ObjectId(), tagId = new ObjectId()
```

#### a) Tres modelos distintos (sin considerar queries)

**Modelo 1: todo por referencias (normalizado).** Cada entidad es una colección. Las relaciones muchos a muchos se guardan como arreglos de ids dentro del artículo.

```js
db.users.insertOne({ _id: userId, name: "Ana", email: "ana@blog.com" })
db.categories.insertOne({ _id: catId, name: "Tecnologia" })
db.tags.insertOne({ _id: tagId, name: "mongodb" })

db.articles.insertOne({
  _id: artId, user_id: userId, title: "Intro a MongoDB", date: new Date(),
  text: "Contenido...", url: "/intro-mongodb",
  category_ids: [catId], tag_ids: [tagId]
})

db.comments.insertOne({
  article_id: artId, user_id: user2Id, date: new Date(), text: "Muy bueno"
})
```

**Modelo 2: todo anidado en el artículo.** El artículo contiene copias del autor, categorías, tags y comentarios (con datos del usuario que comentó).

```js
db.articles.insertOne({
  _id: artId, title: "Intro a MongoDB", date: new Date(), text: "Contenido...", url: "/intro-mongodb",
  user: { _id: userId, name: "Ana", email: "ana@blog.com" },
  categories: [{ _id: catId, name: "Tecnologia" }],
  tags: [{ _id: tagId, name: "mongodb" }],
  comments: [
    { user: { _id: user2Id, name: "Luis" }, date: new Date(), text: "Muy bueno" }
  ]
})
```

**Modelo 3: híbrido.** El artículo referencia a su autor y anida categorías y tags (como nombres). Los comentarios quedan en una colección aparte que referencia al artículo y al usuario.

```js
db.users.insertOne({ _id: userId, name: "Ana", email: "ana@blog.com" })

db.articles.insertOne({
  _id: artId, user_id: userId, title: "Intro a MongoDB", date: new Date(),
  text: "Contenido...", url: "/intro-mongodb",
  categories: ["Tecnologia"], tags: ["mongodb", "nosql"]
})

db.comments.insertOne({
  article_id: artId, user_id: user2Id, date: new Date(), text: "Muy bueno"
})
```

#### b) Modelo considerando las queries

**Decisiones de modelado:**
- `users` es una colección propia y `articles.user_id` es una **referencia**.
- `categories`, `tags` y `comments` se **anidan** en el artículo. Las categorías y tags se guardan como arreglos de nombres, y los comentarios referencian al usuario por `user_id`.
- Con esto, las queries 1 y 2 se resuelven leyendo solo `articles` y la query 3 solo `users`.
- Si los comentarios de un artículo pudieran crecer sin control, convendría pasarlos a una colección aparte.

**Modelo**

```js
// users
{ _id: ObjectId("..."), name: "Ana", email: "ana@blog.com" }

// articles
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  title: "Intro a MongoDB", date: ISODate("2026-03-10"), text: "Contenido...", url: "/intro-mongodb",
  categories: ["Tecnologia", "Bases de datos"],
  tags: ["mongodb", "nosql"],
  comments: [
    { user_id: ObjectId("..."), date: ISODate("2026-03-11"), text: "Muy bueno" }
  ]
}
```

**Inserts**

```js
db.users.insertMany([
  { _id: userId,  name: "Ana",  email: "ana@blog.com" },
  { _id: user2Id, name: "Luis", email: "luis@blog.com" }
])

db.articles.insertMany([
  {
    user_id: userId, title: "Intro a MongoDB", date: ISODate("2026-03-10"),
    text: "Contenido...", url: "/intro-mongodb",
    categories: ["Tecnologia", "Bases de datos"], tags: ["mongodb", "nosql"],
    comments: [
      { user_id: user2Id, date: ISODate("2026-03-11"), text: "Muy bueno" },
      { user_id: user2Id, date: ISODate("2026-05-20"), text: "Gracias por compartir" }
    ]
  },
  {
    user_id: userId, title: "Modelado de datos", date: ISODate("2026-04-02"),
    text: "Contenido...", url: "/modelado-datos",
    categories: ["Bases de datos"], tags: ["modelado"],
    comments: [
      { user_id: user2Id, date: ISODate("2026-04-05"), text: "Excelente explicación" }
    ]
  }
])
```

**Índices**

```js
db.articles.createIndex({ user_id: 1 })
db.articles.createIndex({ "comments.date": 1 })
```

**Query 1: título, url, tags y categorías de los artículos de un usuario**

```js
db.articles.find(
  { user_id: userId },
  { _id: 0, title: 1, url: 1, tags: 1, categories: 1 }
)
```

**Query 2: título, url y comentarios realizados en un rango de fechas**

`$filter` deja solo los comentarios que caen dentro del rango.

```js
const desde = ISODate("2026-03-01"), hasta = ISODate("2026-06-01")

db.articles.aggregate([
  { $match: { "comments.date": { $gte: desde, $lt: hasta } } },
  { $project: {
      _id: 0,
      title: 1,
      url: 1,
      comments: {
        $filter: {
          input: "$comments",
          as: "c",
          cond: { $and: [{ $gte: ["$$c.date", desde] }, { $lt: ["$$c.date", hasta] }] }
        }
      }
  } }
])
```

**Query 3: nombre y email dado el id de un usuario**

```js
db.users.find({ _id: userId }, { _id: 0, name: 1, email: 1 })
```
// 1. Por si ya existía de una prueba anterior, la borramos
db.academia_cursos.drop();


// 2. Creamos la colección con TODAS las reglas de validación
db.createCollection("academia_cursos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["titulo", "profesor", "alumnos"], // Campos obligatorios en la raíz
      properties: {
        titulo: { 
          bsonType: "string", 
          maxLength: 100 
        },
        profesor: {
          bsonType: "object", // Objeto anidado
          required: ["nombre", "email"],
          properties: {
            nombre: { bsonType: "string" },
            email: { bsonType: "string", pattern: "^.*@.*\\..*$" }
          }
        },
        alumnos: {
          bsonType: "array", // Array de objetos
          items: {
            bsonType: "object",
            required: ["nombre", "notas"], // Obligatorios de CADA alumno
            properties: {
              nombre: { bsonType: "string" },
              notas: {
                bsonType: "array", // Array de números dentro del alumno
                items: { bsonType: "double", minimum: 0, maximum: 100 }
              }
            }
          }
        }
      }
    }
  },
  validationAction: "error" // Si no cumple, rechaza la inserción
});


db.createCollection("blog_posts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["titulo", "etiquetas"],
      properties: {
        titulo: { bsonType: "string" },
        etiquetas: {
          bsonType: "array",
          items: { bsonType: "string" }, // Son textos
          uniqueItems: true              // <--- LA MAGIA: No se pueden repetir
        }
      }
    }
  }
})