# 10 · Operadores `$` útiles (los que no entran en el machete básico)

Todos los ejemplos usan los datos de `datos/seed.js`. Si algún ejemplo modifica datos, volvé a correr el seed para resetear.

Índice: [Filtros](#1-filtros-para-find--match) · [Updates](#2-operadores-de-update) · [Arrays en updates](#3-arrays-en-updates) · [Aggregation](#4-operadores-de-expresión-dentro-de-aggregate)

---

# 1. Filtros (para `find` / `$match`)

## `$exists`: el campo existe (o no)

```js
db.usuarios.insertOne({ nombre: "Pedro" })     // sin edad, sin email

db.usuarios.find({ edad: { $exists: true } })   // Ana, Luis, Maria, Juan   (Pedro NO)
db.usuarios.find({ edad: { $exists: false } })  // Pedro
```

### ⚠️ `$exists` vs `null`

```js
db.usuarios.insertOne({ nombre: "Sol", edad: null })   // el campo existe pero vale null

db.usuarios.find({ edad: null })
// Pedro (no existe) Y Sol (es null)   <- { campo: null } matchea AMBOS casos

db.usuarios.find({ edad: { $exists: true, $ne: null } })
// Ana, Luis, Maria, Juan    <- "existe y tiene un valor real"

db.usuarios.find({ edad: { $type: "null" } })
// Sol   <- solo los que valen null explícitamente
```

| Quiero... | Filtro |
|---|---|
| Campo no existe | `{ c: { $exists: false } }` |
| Campo existe (aunque sea null) | `{ c: { $exists: true } }` |
| Campo es null **o** no existe | `{ c: null }` |
| Campo tiene un valor real | `{ c: { $exists: true, $ne: null } }` |

## `$type`: el valor es de cierto tipo

Útil para detectar datos "sucios" (un número guardado como string).

```js
db.usuarios.insertOne({ nombre: "Raro", edad: "20" })   // edad como STRING

db.usuarios.find({ edad: { $type: "string" } })          // Raro
db.usuarios.find({ edad: { $type: "number" } })          // Ana, Luis, Maria, Juan
```

| Alias | Qué matchea |
|---|---|
| `"string"` | texto |
| `"number"` | **cualquier** numérico: int, long, double, decimal |
| `"int"`, `"long"`, `"double"`, `"decimal"` | ese tipo exacto |
| `"bool"` | true / false |
| `"date"` | fechas |
| `"objectId"` | ObjectId |
| `"array"` | arrays |
| `"object"` | subdocumentos |
| `"null"` | null explícito |

Varios tipos a la vez con un array:

```js
db.usuarios.find({ edad: { $type: ["int", "double"] } })
```

> `$type` en un campo que es **array** matchea si **algún elemento** tiene ese tipo; para preguntar por el array en sí usá `$type: "array"`.

Para **limpiar** el dato sucio:

```js
db.usuarios.updateOne({ nombre: "Raro" }, [ { $set: { edad: { $toInt: "$edad" } } } ])
// "20" -> 20
```

## `$in` / `$nin`: está (o no) en una lista

```js
db.usuarios.find({ ciudad: { $in: ["Cordoba", "Mendoza"] } })   // Ana, Maria, Juan
db.usuarios.find({ ciudad: { $nin: ["Cordoba", "Mendoza"] } })  // Luis (y los que no tienen ciudad)
```

Equivale a un `$or` de igualdades, pero más corto. Con arrays: `{ tags: { $in: ["verde", "negro"] } }` → Maria (algún tag está en la lista).

## `$mod`: resto de una división

```js
// edad par (resto 0 al dividir por 2)
db.usuarios.find({ edad: { $mod: [2, 0] } })   // Ana (20), Juan (30)
```

## `$regex`: búsqueda por patrón

```js
db.usuarios.find({ nombre: { $regex: "^m", $options: "i" } })   // Maria (i = ignora mayúsculas)
db.usuarios.find({ email: /@mail\.com$/ })                       // todos los del seed
```

## `$not`

Niega **un operador** (no una condición suelta):

```js
db.usuarios.find({ edad: { $not: { $gte: 20 } } })   // Luis (17); también matchea docs SIN edad
```

---

# 2. Operadores de update

Van en el segundo `{ }` de `updateOne` / `updateMany`.

| Operador | Hace | Ejemplo | Resultado |
|---|---|---|---|
| `$set` | Setea / crea el campo | `{ $set: { pais: "AR" } }` | `pais: "AR"` |
| `$unset` | Borra el campo | `{ $unset: { pais: "" } }` | campo eliminado |
| `$inc` | Suma (o resta con negativo) | `{ $inc: { stock: -2 } }` | stock 10 → 8 |
| `$mul` | Multiplica | `{ $mul: { precio: 2 } }` | 500 → 1000 |
| `$min` | Setea solo si el nuevo valor es **menor** | `{ $min: { precio: 800 } }` | 1000 → 800 (si el precio actual ya fuera 700, no cambia) |
| `$max` | Setea solo si el nuevo valor es **mayor** | `{ $max: { rating: 9 } }` | 8.7 → 9 |
| `$rename` | Renombra un campo | `{ $rename: { email: "correo" } }` | `email` pasa a `correo` |
| `$currentDate` | Setea la fecha actual | `{ $currentDate: { modificado: true } }` | `modificado: ISODate(...)` |
| `$setOnInsert` | Setea **solo si el upsert inserta** | ver abajo | |

## `$setOnInsert` + upsert

```js
db.usuarios.updateOne(
  { nombre: "Zoe" },
  {
    $set:         { ultimoLogin: new Date() },   // se aplica siempre
    $setOnInsert: { creado: new Date() }         // solo si Zoe no existía
  },
  { upsert: true }
)
```

Primera vez: crea a Zoe con `ultimoLogin` y `creado`. Segunda vez: solo actualiza `ultimoLogin`; `creado` no se toca.

---

# 3. Arrays en updates

Partimos de Ana: `tags: ["rojo", "azul"]`.

## `$addToSet`: agregar **sin repetir**

```js
db.usuarios.updateOne({ nombre: "Ana" }, { $addToSet: { tags: "verde" } })
// ["rojo", "azul", "verde"]

db.usuarios.updateOne({ nombre: "Ana" }, { $addToSet: { tags: "rojo" } })
// ["rojo", "azul", "verde"]    <- ya estaba, no cambia (nModified: 0)
```

### Varios valores a la vez: `$each`

```js
// ❌ MAL: agrega UN elemento que es un array
db.usuarios.updateOne({ nombre: "Ana" }, { $addToSet: { tags: ["negro", "rojo"] } })
// tags: [..., ["negro","rojo"]]

// ✅ BIEN
db.usuarios.updateOne({ nombre: "Ana" }, { $addToSet: { tags: { $each: ["negro", "rojo"] } } })
// agrega "negro"; "rojo" ya estaba -> se ignora
```

### Con objetos

Compara el objeto **completo** (mismos campos, mismo valor **y mismo orden**):

```js
db.productos.updateOne(
  { nombre: "Gorra" },
  { $addToSet: { variantes: { color: "rojo", talle: "M" } } }
)
// ya existe exactamente igual -> no agrega

db.productos.updateOne(
  { nombre: "Gorra" },
  { $addToSet: { variantes: { color: "rojo", talle: "L" } } }
)
// distinto -> agrega
```

### `$addToSet` también existe en `$group` (aggregation)

```js
db.usuarios.aggregate([
  { $group: { _id: "$ciudad", nombres: { $addToSet: "$nombre" } } }
])
// { _id: 'Cordoba', nombres: ['Ana', 'Maria'] }   (el orden no está garantizado)
```

| | Repetidos | Orden |
|---|---|---|
| `$push` | los **permite** | mantiene orden de inserción |
| `$addToSet` | los **evita** | sin garantía |

## `$push` con modificadores

```js
// $each: varios elementos
db.usuarios.updateOne({ nombre: "Luis" }, { $push: { tags: { $each: ["a", "b"] } } })
// ["rojo", "a", "b"]
```

```js
// $slice: dejar solo los últimos N (útil para "últimos 3 eventos")
db.usuarios.updateOne(
  { nombre: "Ana" },                      // tags: ["rojo","azul"]
  { $push: { tags: { $each: ["verde", "negro"], $slice: -3 } } }
)
// queda [rojo,azul,verde,negro] y se recorta a los últimos 3: ["azul","verde","negro"]
```

```js
// $position: insertar en un índice (0 = al principio)
db.usuarios.updateOne(
  { nombre: "Luis" },
  { $push: { tags: { $each: ["primero"], $position: 0 } } }
)
```

```js
// $sort dentro del push
db.usuarios.updateOne(
  { nombre: "Maria" },
  { $push: { tags: { $each: [], $sort: 1 } } }     // ordena tags alfabéticamente
)
// ["azul","rojo","verde"]
```

## Sacar elementos: `$pull` y `$pop`

```js
// $pull: saca TODOS los que cumplan
db.usuarios.updateOne({ nombre: "Maria" }, { $pull: { tags: "verde" } })

// $pull con condición sobre objetos
db.productos.updateOne({ nombre: "Remera" }, { $pull: { variantes: { color: "azul" } } })

// $pull con operador
db.usuarios.updateMany({}, { $pull: { tags: { $in: ["rojo", "azul"] } } })

// $pop: 1 = saca el último, -1 = saca el primero
db.usuarios.updateOne({ nombre: "Maria" }, { $pop: { tags: 1 } })
```

## Modificar elementos de un array: operadores posicionales

Producto Remera: `variantes: [ {color:"rojo",talle:"M"}, {color:"azul",talle:"L"} ]`.

### `$` : el **primer** elemento que matcheó en el filtro

```js
db.productos.updateOne(
  { nombre: "Remera", "variantes.color": "azul" },    // el filtro "marca" el elemento
  { $set: { "variantes.$.talle": "XL" } }
)
// la variante azul pasa de L a XL
```

### `$[]` : **todos** los elementos

```js
db.productos.updateOne(
  { nombre: "Remera" },
  { $set: { "variantes.$[].stock": 0 } }
)
// agrega stock: 0 a las dos variantes
```

### `$[nombre]` + `arrayFilters`: los elementos que cumplan una condición

```js
db.productos.updateMany(
  {},
  { $set: { "variantes.$[v].talle": "S" } },
  { arrayFilters: [ { "v.color": "rojo" } ] }
)
// todas las variantes rojas de todos los productos pasan a talle S
```

| Operador | Elementos afectados |
|---|---|
| `$` | el primero que matcheó el filtro |
| `$[]` | todos |
| `$[x]` + `arrayFilters` | los que cumplan la condición de `x` |

---

# 4. Operadores de expresión dentro de `aggregate`

Se usan dentro de `$project`, `$set`/`$addFields`, `$group`, `$match` + `$expr`, y updates con pipeline. Siempre en forma `{ $operador: [args] }` y con los campos como `"$campo"`.

## Etapas útiles que faltaban

### `$set` / `$addFields`: agregar campos **sin perder los demás**

```js
db.productos.aggregate([
  { $set: { ingreso: { $multiply: ["$precio", "$vendidos"] } } }
])
// Cada producto sale completo + ingreso (Remera 4000, Buzo 10000, Gorra 4000)
```

(`$project` en cambio **solo deja** lo que le pedís.)

### `$sortByCount`: atajo de `$group` + `$sort`

```js
db.usuarios.aggregate([ { $sortByCount: "$ciudad" } ])
// { _id: 'Cordoba', count: 2 }, { _id: 'Rosario', count: 1 }, { _id: 'Mendoza', count: 1 }
```

### `$replaceRoot` / `$replaceWith`: subir un subdocumento a la raíz

```js
db.productos.aggregate([
  { $unwind: "$variantes" },
  { $replaceRoot: { newRoot: "$variantes" } }
])
// { color: 'rojo', talle: 'M' }, { color: 'azul', talle: 'L' }, ...
```

### `$facet`: varios pipelines sobre los mismos documentos

```js
db.usuarios.aggregate([
  { $facet: {
      porCiudad: [ { $group: { _id: "$ciudad", n: { $sum: 1 } } } ],
      promedio:  [ { $group: { _id: null, edadProm: { $avg: "$edad" } } } ]
  } }
])
// promedio: (20 + 17 + 25 + 30) / 4 = 23
```

### `$out` / `$merge`: guardar el resultado en una colección

```js
db.usuarios.aggregate([
  { $group: { _id: "$ciudad", n: { $sum: 1 } } },
  { $out: "resumen_ciudades" }          // reemplaza la colección entera
])
// $merge: { into: "resumen_ciudades" } -> inserta/actualiza sin borrar el resto
```
`$out` / `$merge` van **siempre al final** del pipeline.

## Condicionales y nulos

```js
{ $cond: [ <si>, <entonces>, <sino> ] }
{ $ifNull: [ "$campo", "valor por defecto" ] }
{ $switch: { branches: [ { case: ..., then: ... } ], default: ... } }
```

```js
db.usuarios.aggregate([
  { $project: {
      _id: 0, nombre: 1,
      categoria: { $cond: [ { $gte: ["$edad", 18] }, "mayor", "menor" ] },
      pais: { $ifNull: ["$pais", "sin dato"] }
  } }
])
// { nombre: 'Luis', categoria: 'menor', pais: 'sin dato' }
// { nombre: 'Ana',  categoria: 'mayor', pais: 'sin dato' } ...
```

## Aritméticos

| Operador | Ejemplo | Resultado |
|---|---|---|
| `$add` | `{ $add: ["$precio", 100] }` | 1000 → 1100 |
| `$subtract` | `{ $subtract: ["$stock", "$vendidos"] }` | Remera 10 − 4 = 6 |
| `$multiply` | `{ $multiply: ["$precio", 1.21] }` | |
| `$divide` | `{ $divide: ["$precio", 2] }` | 1000 → 500 |
| `$mod` | `{ $mod: ["$edad", 2] }` | 20 → 0 |
| `$round` | `{ $round: ["$rating", 0] }` | 8.7 → 9 |
| `$abs`, `$ceil`, `$floor` | `{ $floor: "$rating" }` | 8.7 → 8 |

> Con **fechas**: `$subtract` entre dos fechas da la diferencia en **milisegundos**.

## Strings

```js
db.usuarios.aggregate([
  { $project: {
      _id: 0,
      mayus:  { $toUpper: "$nombre" },                       // "ANA"
      nombreCiudad: { $concat: ["$nombre", " - ", "$ciudad"] }, // "Ana - Cordoba"
      inicial: { $substrCP: ["$nombre", 0, 1] },             // "A"
      largo:  { $strLenCP: "$nombre" }                       // 3
  } }
])
```

Otros: `$toLower`, `$trim`, `$split` (`{ $split: ["a,b,c", ","] }` → `["a","b","c"]`), `$regexMatch`.

## Arrays

Datos: Ana `tags: ["rojo","azul"]`.

| Operador | Ejemplo | Resultado (Ana) |
|---|---|---|
| `$size` | `{ $size: "$tags" }` | 2 |
| `$arrayElemAt` | `{ $arrayElemAt: ["$tags", 0] }` | "rojo" |
| `$first` / `$last` (array) | `{ $first: "$tags" }` | "rojo" |
| `$in` | `{ $in: ["rojo", "$tags"] }` | true |
| `$concatArrays` | `{ $concatArrays: ["$tags", ["x"]] }` | ["rojo","azul","x"] |
| `$setUnion` / `$setIntersection` | `{ $setUnion: ["$tags", ["rojo","x"]] }` | ["azul","rojo","x"] |
| `$isArray` | `{ $isArray: "$tags" }` | true |

### `$filter`: quedarse con elementos que cumplan una condición

```js
db.productos.aggregate([
  { $project: {
      _id: 0, nombre: 1,
      rojas: { $filter: {
          input: "$variantes",
          as: "v",                                   // nombre de la variable
          cond: { $eq: ["$$v.color", "rojo"] }       // dentro se usa $$v
      } }
  } }
])
// { nombre: 'Remera', rojas: [ { color: 'rojo', talle: 'M' } ] }
// { nombre: 'Buzo',   rojas: [ { color: 'rojo', talle: 'L' } ] }
// { nombre: 'Gorra',  rojas: [ { color: 'rojo', talle: 'M' } ] }
```

### `$map`: transformar cada elemento

```js
db.usuarios.aggregate([
  { $project: { _id: 0, nombre: 1,
      tagsMayus: { $map: { input: "$tags", as: "t", in: { $toUpper: "$$t" } } } } }
])
// { nombre: 'Ana', tagsMayus: ['ROJO','AZUL'] }
```

### `$reduce`: acumular un array en un valor

```js
db.productos.aggregate([
  { $project: { _id: 0, nombre: 1,
      colores: { $reduce: {
          input: "$variantes",
          initialValue: "",
          in: { $concat: ["$$value", "$$this.color", " "] }   // $$value acumulador, $$this elemento actual
      } } } }
])
// { nombre: 'Remera', colores: 'rojo azul ' }
```

### Acumuladores sobre arrays dentro de `$project`

Cuando el array **ya está en el documento**, `$sum`, `$avg`, `$max`, `$min` funcionan directo sobre él (sin `$unwind` + `$group`):

```js
db.coleccion.aggregate([
  { $project: { promedio: { $avg: "$notas.nota" }, total: { $sum: "$notas.nota" } } }
])
// con notas: [ {nota: 8}, {nota: 6} ]  ->  promedio 7, total 14
```

## Fechas

```js
db.peliculas.aggregate([
  { $project: {
      _id: 0, titulo: 1,
      anio:  { $year: "$estreno" },                                    // 1999
      texto: { $dateToString: { format: "%d/%m/%Y", date: "$estreno" } } // "31/03/1999"
  } }
])
```

Otros: `$month`, `$dayOfMonth`, `$dayOfWeek`, `$dateAdd`, `$dateDiff`, `$dateFromString`.

## Tipos y conversión

```js
db.usuarios.aggregate([
  { $project: { _id: 0, nombre: 1, tipoEdad: { $type: "$edad" } } }
])
// { nombre: 'Ana', tipoEdad: 'int' }   // o 'double' según cómo se haya insertado
```

| Operador | Hace |
|---|---|
| `$type` | devuelve el nombre del tipo (como string) |
| `$isNumber` | true si es numérico |
| `$toInt`, `$toDouble`, `$toString`, `$toDate`, `$toObjectId` | conversión (falla si no se puede) |
| `$convert` | conversión con `onError` / `onNull` |

```js
// Convertir sin romper si el valor es basura
{ $convert: { input: "$edad", to: "int", onError: null, onNull: null } }
```

> Acordate: **`$type` (filtro)** devuelve documentos de cierto tipo; **`$type` (expresión)** devuelve el nombre del tipo de un campo. Misma palabra, distinto uso.

## Acumuladores de `$group`: resumen

| Acumulador | Qué hace |
|---|---|
| `$sum` | suma (`1` para contar) |
| `$avg` | promedio |
| `$min` / `$max` | mínimo / máximo |
| `$first` / `$last` | primer / último valor del grupo (usar con `$sort` antes) |
| `$push` | array con **todos** los valores |
| `$addToSet` | array **sin repetidos** |
| `$count` | cuenta (equivale a `$sum: 1`) |

```js
// El usuario más joven de cada ciudad
db.usuarios.aggregate([
  { $sort: { edad: 1 } },
  { $group: { _id: "$ciudad", masJoven: { $first: "$nombre" }, edad: { $first: "$edad" } } }
])
// Cordoba -> Ana (20)
```

---

## Limpieza

Volvé a correr `datos/seed.js` para borrar a Pedro, Sol, Raro, Zoe y resetear los cambios.
 
3. Extraer un elemento específico usando $arrayElemAt (en Agregación)

Si estás usando el framework de agregación y quieres obtener un elemento en una posición específica (contando desde el inicio con números positivos, o desde el final con números negativos):
javascript
db.baskets.aggregate([
  {
    $project: {
      primerElemento: { $arrayElemAt: ["$fruits", 0] },     // Primer elemento
      ultimoElemento: { $arrayElemAt: ["$fruits", -1] }    // Último elemento
    }
  }
])
Usa el código con precaución.
• Positivo (0, 1, 2...): cuenta desde el principio del arreglo.
• Negativo (-1, -2...): cuenta desde el final del arreglo (ej. -1 es el último elemento).