# 02 · CRUD básico

Molde: `db.coleccion.funcion( { filtro }, { accion/proyeccion } )`

## Leer: `find`

```js
db.usuarios.find()                      // todos
db.usuarios.find({ ciudad: "Cordoba" }) // filtro por igualdad
db.usuarios.findOne({ nombre: "Ana" })  // solo el primero (devuelve objeto, no cursor)
```

### Proyección: elegir qué campos mostrar

`1` = mostrar, `0` = ocultar. **No se pueden mezclar 1 y 0** (excepto `_id`).

```js
db.usuarios.find({ edad: { $gt: 18 } }, { _id: 0, nombre: 1, email: 1 })
```

Resultado (edad > 18 → Ana 20, Maria 25, Juan 30):

```js
{ nombre: 'Ana',   email: 'ana@mail.com' }
{ nombre: 'Maria', email: 'maria@mail.com' }
{ nombre: 'Juan',  email: 'juan@mail.com' }
```

```js
db.usuarios.find({}, { nombre: 1, edad: 0 })  // ❌ error: mezcla 1 y 0
db.usuarios.find({}, { edad: 0, email: 0 })   // ✅ oculta esos dos, muestra el resto
```

### Ordenar, limitar, saltar

```js
db.usuarios.find().sort({ edad: -1 }).limit(2)
// -> Juan (30), Maria (25)

db.usuarios.find().sort({ edad: 1 }).skip(1).limit(2)
// -> salta Luis (17), devuelve Ana (20), Maria (25)
```

### Contar

```js
db.usuarios.countDocuments({ ciudad: "Cordoba" })  // 2
```

## Insertar

```js
db.usuarios.insertOne({ nombre: "Pedro", edad: 40 })

db.usuarios.insertMany([
  { nombre: "Sol", edad: 22 },
  { nombre: "Tomas", edad: 19 }
])
```

## Actualizar

```js
db.usuarios.updateOne({ nombre: "Ana" }, { $set: { edad: 21 } })
db.usuarios.updateMany({ ciudad: "Cordoba" }, { $set: { pais: "AR" } })
```

| Operador | Qué hace | Ejemplo |
|---|---|---|
| `$set` | Modifica o **crea** el campo | `{ $set: { edad: 21 } }` |
| `$unset` | **Borra** el campo | `{ $unset: { pais: "" } }` |
| `$inc` | Suma/resta a un número | `{ $inc: { edad: 1 } }` (21 → 22) |
| `$push` | Agrega a un array (permite repetidos) | `{ $push: { tags: "rojo" } }` |
| `$addToSet` | Agrega **solo si no existe** | `{ $addToSet: { tags: "rojo" } }` |
| `$pull` | Saca un elemento del array | `{ $pull: { tags: "rojo" } }` |

Diferencia `$push` vs `$addToSet` con Ana (`tags: ["rojo","azul"]`):

```js
db.usuarios.updateOne({ nombre: "Ana" }, { $push:     { tags: "rojo" } })
// tags: ["rojo","azul","rojo"]   <- repetido

db.usuarios.updateOne({ nombre: "Ana" }, { $addToSet: { tags: "rojo" } })
// tags: ["rojo","azul"]          <- no cambia
```

### Upsert

Si no existe el documento, lo crea:

```js
db.usuarios.updateOne(
  { nombre: "Zoe" },
  { $set: { edad: 18 } },
  { upsert: true }
)
```

## Borrar

```js
db.usuarios.deleteOne({ nombre: "Pedro" })
db.usuarios.deleteMany({ edad: { $lt: 18 } })   // borra a Luis (17)
```

> ⚠️ `deleteMany({})` borra **toda** la colección de documentos. Probá el filtro primero con `find`.

## Resumen

| Acción | Uno | Muchos |
|---|---|---|
| Insertar | `insertOne` | `insertMany` |
| Actualizar | `updateOne` | `updateMany` |
| Borrar | `deleteOne` | `deleteMany` |
| Leer | `findOne` | `find` |
