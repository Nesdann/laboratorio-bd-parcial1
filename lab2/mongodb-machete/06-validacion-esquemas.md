# 06 · Validación de esquemas (`$jsonSchema`)

Para que Mongo **controle qué documentos pueden entrar** en una colección.

## Molde

```js
db.createCollection("coleccion", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["campoObligatorio"],
      properties: {
        campoObligatorio: { bsonType: "string", maxLength: 30 },
        arrayDeObjetos: {
          bsonType: "array",
          items: {                         // regla para CADA elemento
            bsonType: "object",
            required: ["subcampo"],
            properties: { subcampo: { bsonType: "int" } }
          }
        }
      }
    }
  },
  validationAction: "error"                // o "warn"
})
```

Si la colección **ya existe**, se usa `collMod`:

```js
db.runCommand({
  collMod: "coleccion",
  validator: { $jsonSchema: { ... } },
  validationAction: "error"
})
```

## Tipos (`bsonType`)

`"string"`, `"int"`, `"long"`, `"double"`, `"bool"`, `"object"`, `"array"`, `"objectId"`, `"date"`, `"null"`.

Para permitir varios tipos: `bsonType: ["string", "null"]`.

## Reglas por tipo

| Aplica a | Reglas |
|---|---|
| string | `maxLength`, `minLength`, `pattern` (regex), `enum` |
| número | `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum` |
| array | `minItems`, `maxItems`, `uniqueItems: true`, `items` |
| object | `required`, `properties`, `additionalProperties: false` |
| cualquiera | `enum` (valores permitidos), `description` |

## Ejemplo completo: colección `alumnos`

```js
db.createCollection("alumnos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombre", "legajo", "notas"],
      properties: {
        nombre: { bsonType: "string", minLength: 2, maxLength: 30 },
        legajo: { bsonType: "int", minimum: 1 },
        carrera: { enum: ["Computacion", "Matematica", "Fisica"] },
        email: { bsonType: "string", pattern: "^.+@.+\\..+$" },
        notas: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["materia", "nota"],
            properties: {
              materia: { bsonType: "string" },
              nota:    { bsonType: "int", minimum: 0, maximum: 10 }
            }
          }
        },
        materiasAprobadas: { bsonType: "array", uniqueItems: true }
      }
    }
  },
  validationAction: "error"
})
```

### Qué pasa al insertar

```js
// ✅ Válido
db.alumnos.insertOne({
  nombre: "Ana",
  legajo: NumberInt(1001),
  carrera: "Computacion",
  notas: [ { materia: "Algebra", nota: NumberInt(8) } ]
})

// ❌ Falla: nota 11 > maximum 10
db.alumnos.insertOne({
  nombre: "Luis",
  legajo: NumberInt(1002),
  notas: [ { materia: "Algebra", nota: NumberInt(11) } ]
})

// ❌ Falla: falta "notas" (required)
db.alumnos.insertOne({ nombre: "Sol", legajo: NumberInt(1003) })

// ❌ Falla: carrera fuera del enum
db.alumnos.insertOne({
  nombre: "Pedro", legajo: NumberInt(1004), carrera: "Quimica",
  notas: [ { materia: "Algebra", nota: NumberInt(7) } ]
})
```

Error típico: `MongoServerError: Document failed validation`. Para ver el detalle de qué regla falló, mirá `err.errInfo.details`.

## ⚠️ Enteros en el shell: `int` vs `double`

En JavaScript **todo número es `double`**. Si el esquema pide `"int"` y mandás `5`, **falla**.

```js
db.alumnos.insertOne({ ..., legajo: 1001 })               // ❌ es double
db.alumnos.insertOne({ ..., legajo: NumberInt(1001) })    // ✅ int (32 bits)
db.alumnos.insertOne({ ..., legajo: NumberLong(1001) })   // ✅ long (64 bits), bsonType: "long"
```

Alternativa: usar `bsonType: "number"` (acepta int, long, double, decimal).

## `validationAction`: `error` vs `warn`

| Valor | Comportamiento |
|---|---|
| `"error"` (default) | **Rechaza** el documento inválido |
| `"warn"` | **Lo inserta igual** y registra una advertencia en el log |

También existe `validationLevel`: `"strict"` (default, valida inserts y updates) o `"moderate"` (no valida updates sobre docs que ya eran inválidos).

## Ver el validador actual

```js
db.getCollectionInfos({ name: "alumnos" })[0].options.validator
```
