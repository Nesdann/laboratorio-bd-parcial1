# 03 · Operadores de filtro

Van en el **primer `{ }`** de `find`, `updateX`, `deleteX` y en `$match`.

## Comparación

| Operador | Significado | Ejemplo |
|---|---|---|
| `$eq` (o nada) | igual | `{ edad: 20 }` ≡ `{ edad: { $eq: 20 } }` |
| `$ne` | distinto | `{ ciudad: { $ne: "Cordoba" } }` |
| `$gt` / `$gte` | mayor / mayor o igual | `{ edad: { $gte: 20 } }` |
| `$lt` / `$lte` | menor / menor o igual | `{ edad: { $lt: 18 } }` |
| `$in` / `$nin` | está / no está en la lista | `{ ciudad: { $in: ["Cordoba","Rosario"] } }` |

```js
db.usuarios.find({ edad: { $gte: 20, $lt: 30 } }, { _id: 0, nombre: 1, edad: 1 })
// Ana (20), Maria (25)    <- Juan (30) queda afuera por $lt
```

## Lógicos

```js
// $or: alguna se cumple
db.usuarios.find({ $or: [ { edad: { $lt: 18 } }, { ciudad: "Mendoza" } ] })
// Luis (17), Juan (Mendoza)

// $and: todas se cumplen (suele ser implícito)
db.usuarios.find({ $and: [ { ciudad: "Cordoba" }, { edad: { $gt: 20 } } ] })
// Maria
// Equivalente más corto:
db.usuarios.find({ ciudad: "Cordoba", edad: { $gt: 20 } })

// $nor: ninguna se cumple
db.usuarios.find({ $nor: [ { ciudad: "Cordoba" }, { edad: { $lt: 18 } } ] })
// Juan

// $not: niega un operador
db.usuarios.find({ edad: { $not: { $gt: 18 } } })
// Luis (17)
```

> Ojo: **no se puede repetir la misma clave** en un objeto. `{ edad: {$gt: 18}, edad: {$lt: 30} }` pisa la primera. Poné los dos operadores dentro de la misma clave: `{ edad: { $gt: 18, $lt: 30 } }`.

## Arrays

Usuarios: Ana `["rojo","azul"]`, Luis `["rojo"]`, Maria `["azul","verde","rojo"]`, Juan `[]`.

```js
// El array contiene "rojo"
db.usuarios.find({ tags: "rojo" })                         // Ana, Luis, Maria

// Contiene TODOS los valores
db.usuarios.find({ tags: { $all: ["rojo", "azul"] } })     // Ana, Maria

// Tamaño exacto
db.usuarios.find({ tags: { $size: 3 } })                   // Maria
db.usuarios.find({ tags: { $size: 0 } })                   // Juan
```

### `$elemMatch`: el mismo elemento cumple todo

Productos con `variantes: [{color, talle}]`.

```js
// Sin $elemMatch: cada condición puede cumplirla un elemento DISTINTO
db.productos.find({ "variantes.color": "rojo", "variantes.talle": "M" })
// Remera, Buzo, Gorra
// Buzo entra "por error": rojo L (cumple color) + azul M (cumple talle)

// Con $elemMatch: tiene que ser el MISMO objeto
db.productos.find({
  variantes: { $elemMatch: { color: "rojo", talle: "M" } }
})
// Remera, Gorra   <- Buzo ya no
```

## Fechas

```js
db.peliculas.find(
  { estreno: { $gte: ISODate("1990-01-01T00:00:00Z") } },
  { _id: 0, titulo: 1 }
)
// Matrix (1999)
```

## Campos anidados y existencia

```js
db.productos.find({ "variantes.color": "azul" })   // notación con punto
db.usuarios.find({ edad: { $exists: true } })      // tiene el campo
db.usuarios.find({ edad: { $type: "int" } })       // por tipo
```

## `$expr`: comparar dos campos entre sí

Sin `$expr` no podés comparar campo contra campo. Con `$expr`, los campos se escriben con `$`:

```js
// Productos donde vendidos > stock
db.productos.find({ $expr: { $gt: ["$vendidos", "$stock"] } })
// Buzo (5 > 3).  Gorra no entra: 8 > 8 es falso.
```

También sirve dentro de `$match`:

```js
db.productos.aggregate([
  { $match: { $expr: { $gte: ["$vendidos", "$stock"] } } }
])
// Buzo, Gorra
```

## Regex

```js
db.usuarios.find({ nombre: { $regex: /^M/ } })   // Maria
db.usuarios.find({ email: /gmail/i })            // forma corta, case-insensitive
```
