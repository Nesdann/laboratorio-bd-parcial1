# 01 · Conceptos fundamentales

## El modelo mental

| MongoDB | SQL | Notas |
|---|---|---|
| Base de datos | Base de datos | Contenedor principal |
| Colección | Tabla | **Sin esquema fijo**: puede tener documentos de distinta forma |
| Documento | Fila | Objeto JSON (guardado como BSON) |
| Campo | Columna | Puede ser un valor, un objeto o un array |

Ejemplo de documento de la colección `usuarios`:

```js
{
  _id: ObjectId("..."),
  nombre: "Ana",
  edad: 20,
  tags: ["rojo", "azul"]
}
```

Dos documentos de la misma colección pueden tener campos distintos. Esto es válido:

```js
db.usuarios.insertOne({ nombre: "Pedro" })                      // sin edad
db.usuarios.insertOne({ nombre: "Sol", edad: 22, premium: true }) // con campo extra
```

## El símbolo `$`

Se usa para **dos cosas distintas**:

### 1. Referenciar el valor de un campo: `"$campo"`

```js
// "$precio" = "el valor del campo precio de este documento"
db.productos.aggregate([
  { $project: { nombre: 1, doble: { $multiply: ["$precio", 2] } } }
])
// Remera -> doble: 2000
```

### 2. Operadores / instrucciones: `$set`, `$gt`, `$group`...

Le dicen a Mongo **qué hacer**; no son datos.

```js
db.usuarios.find({ edad: { $gt: 18 } })   // $gt = "greater than"
```

> Regla rápida: si el `$` está **dentro de comillas y es un valor** → es un campo. Si es **una clave sin comillas** → es un operador.

## ⚠️ Cuidado con los tipos

Mongo **no convierte tipos** al buscar.

```js
const id = db.peliculas.findOne({ titulo: "Matrix" })._id

db.peliculas.find({ _id: id })                                  // ✅ encuentra 1
db.peliculas.find({ _id: ObjectId("64b000000000000000000001") }) // ✅ encuentra 1
db.peliculas.find({ _id: "64b000000000000000000001" })           // ❌ 0 resultados (es string)
```

Lo mismo con números: `{ edad: "20" }` no encuentra `edad: 20`.

## Forma general de las funciones

```
db.coleccion.funcion( { filtro }, { accion / proyeccion } )
```

- `find({filtro}, {proyeccion})`
- `updateOne({filtro}, {accion})`
- `deleteMany({filtro})`
