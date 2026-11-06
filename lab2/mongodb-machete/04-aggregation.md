# 04 · Pipeline de agregación

Es una **cinta de producción**: los documentos pasan por etapas, cada una transforma lo que le llega de la anterior.

```js
db.coleccion.aggregate([ { $etapa1 }, { $etapa2 }, ... ])
```

El **orden importa**: la salida de una etapa es la entrada de la siguiente.

## Etapas principales

| Etapa | Qué hace |
|---|---|
| `$match` | Filtra (igual que `find`). **Ponelo lo más arriba posible**: menos documentos para las etapas siguientes |
| `$group` | Agrupa y calcula acumulados |
| `$sort` | Ordena (`1` ascendente, `-1` descendente) |
| `$limit` / `$skip` | Paginación |
| `$project` | Elige, renombra o calcula campos |
| `$unwind` | Desarma un array: 1 doc con N elementos → N docs |
| `$count` | Cuenta los docs que llegan. Devuelve `[ { total: N } ]` |
| `$lookup` | JOIN (ver [05-lookup.md](05-lookup.md)) |

## `$match`

```js
db.usuarios.aggregate([
  { $match: { edad: { $gte: 18 } } }
])
// Ana, Maria, Juan
```

## `$group`

- `_id`: **por qué campo se agrupa**. `"$campo"` agrupa por ese campo; `null` agrupa todo en un solo grupo.
- Acumuladores: `$sum`, `$avg`, `$min`, `$max`, `$push` (array), `$addToSet` (array sin repetidos), `$first`, `$last`.

### Contar por grupo (`$sum: 1`)

```js
db.usuarios.aggregate([
  { $group: { _id: "$ciudad", cantidad: { $sum: 1 } } },
  { $sort: { cantidad: -1 } }
])
```

```js
{ _id: 'Cordoba', cantidad: 2 }   // Ana + Maria
{ _id: 'Rosario', cantidad: 1 }
{ _id: 'Mendoza', cantidad: 1 }
```

(El orden entre Rosario y Mendoza puede variar: empatan.)

### Sumar un campo

```js
db.productos.aggregate([
  { $group: { _id: null, totalVendidos: { $sum: "$vendidos" }, precioPromedio: { $avg: "$precio" } } }
])
// { _id: null, totalVendidos: 17, precioPromedio: 1166.67 }
// vendidos: 4 + 5 + 8 = 17      precio: (1000 + 2000 + 500) / 3
```

### Juntar valores en un array

```js
db.usuarios.aggregate([
  { $group: { _id: "$ciudad", nombres: { $push: "$nombre" } } }
])
// { _id: 'Cordoba', nombres: ['Ana', 'Maria'] }
```

## `$project`

```js
db.productos.aggregate([
  { $project: { _id: 0, nombre: 1, ingreso: { $multiply: ["$precio", "$vendidos"] } } }
])
```

```js
{ nombre: 'Remera', ingreso: 4000 }   // 1000 * 4
{ nombre: 'Buzo',   ingreso: 10000 }  // 2000 * 5
{ nombre: 'Gorra',  ingreso: 4000 }   // 500  * 8
```

## `$unwind`

Un doc con un array de N elementos pasa a ser N documentos.

```js
db.usuarios.aggregate([
  { $match: { nombre: "Ana" } },
  { $unwind: "$tags" }
])
```

```js
{ nombre: 'Ana', tags: 'rojo', ... }
{ nombre: 'Ana', tags: 'azul', ... }
```

> Si el array está **vacío** (como Juan) el documento **desaparece** del resultado. Para conservarlo: `{ $unwind: { path: "$tags", preserveNullAndEmptyArrays: true } }`.

## `$count`

```js
db.usuarios.aggregate([
  { $match: { ciudad: "Cordoba" } },
  { $count: "total" }
])
// [ { total: 2 } ]
```

---

# Patrones clave

## Patrón 1: contar por grupo → ordenar → limitar ("el top N")

```js
// La ciudad con más usuarios
db.usuarios.aggregate([
  { $group: { _id: "$ciudad", cantidad: { $sum: 1 } } },
  { $sort: { cantidad: -1 } },
  { $limit: 1 }
])
// { _id: 'Cordoba', cantidad: 2 }
```

## Patrón 2: agrupar elementos de un array (`$unwind` → `$group` → `$sort`)

```js
// ¿Qué tag aparece más veces?
db.usuarios.aggregate([
  { $unwind: "$tags" },
  { $group: { _id: "$tags", veces: { $sum: 1 } } },
  { $sort: { veces: -1 } }
])
```

```js
{ _id: 'rojo',  veces: 3 }   // Ana, Luis, Maria
{ _id: 'azul',  veces: 2 }   // Ana, Maria
{ _id: 'verde', veces: 1 }   // Maria
```

## Patrón 3: comparar campos (`$expr` dentro de `$match`)

```js
db.productos.aggregate([
  { $match: { $expr: { $gt: ["$vendidos", "$stock"] } } },
  { $project: { _id: 0, nombre: 1 } }
])
// { nombre: 'Buzo' }
```

## Patrón 4: promedio sobre array de objetos

Dos caminos: `$unwind` + `$group`, o un operador de array dentro de `$project`.

```js
// Con $unwind
db.productos.aggregate([
  { $unwind: "$variantes" },
  { $group: { _id: "$variantes.color", cantidad: { $sum: 1 } } }
])
// rojo: 3 (Remera, Buzo, Gorra)   azul: 2 (Remera, Buzo)

// Sin $unwind: $size cuenta elementos del array
db.productos.aggregate([
  { $project: { _id: 0, nombre: 1, cantVariantes: { $size: "$variantes" } } }
])
// Remera 2, Buzo 2, Gorra 1
```

## Orden recomendado de etapas

```
$match  →  $lookup / $unwind  →  $group  →  $sort  →  $limit  →  $project
```
