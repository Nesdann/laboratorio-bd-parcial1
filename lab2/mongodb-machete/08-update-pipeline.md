# 08 · Actualizaciones con pipeline

Permite usar **operadores de agregación** (`$multiply`, `$switch`, `$concat`...) y **referenciar otros campos** dentro de un update.

## La diferencia clave: un array `[ ]`

```js
// Update clásico: objeto { }
db.productos.updateMany({}, { $set: { precio: 5000 } })          // valor fijo, no puede leer otros campos

// Update con pipeline: array [ ]
db.productos.updateMany({}, [ { $set: { precio: { $multiply: ["$precio", 2] } } } ])   // usa "$precio"
```

Si te olvidás del `[ ]`, `"$precio"` se guarda como el **string literal** `"$precio"`.

En el modo pipeline solo se pueden usar `$set` (o `$addFields`), `$unset` y `$replaceRoot` / `$replaceWith`. Los operadores clásicos (`$inc`, `$push`...) **no** van acá.

## Ejemplo: aumentar precios y etiquetar

Productos: Remera 1000, Buzo 2000, Gorra 500.

```js
db.productos.updateMany(
  {},
  [
    // Etapa 1: nuevo precio = precio + 10%
    { $set: { precioFinal: { $round: [ { $multiply: ["$precio", 1.1] }, 0 ] } } },

    // Etapa 2: etiqueta según el precioFinal (ya calculado en la etapa anterior)
    { $set: {
        etiqueta: {
          $switch: {
            branches: [
              { case: { $gte: ["$precioFinal", 2000] }, then: "Alto" },
              { case: { $gte: ["$precioFinal", 1000] }, then: "Medio" }
            ],
            default: "Bajo"
          }
        }
    } }
  ]
)
```

Resultado:

| nombre | precio | precioFinal (×1.1) | etiqueta |
|---|---|---|---|
| Remera | 1000 | 1100 | Medio |
| Buzo | 2000 | 2200 | Alto |
| Gorra | 500 | 550 | Bajo |

Las etapas se ejecutan **en orden**: la etapa 2 ya "ve" el `precioFinal` calculado en la etapa 1.

> Detalle: `1000 * 1.1` en punto flotante da `1100.0000000000002`. Por eso el `$round`.

## Otros usos frecuentes

```js
// Concatenar campos
db.usuarios.updateMany({}, [
  { $set: { descripcion: { $concat: ["$nombre", " (", "$ciudad", ")"] } } }
])
// Ana -> "Ana (Cordoba)"

// Condicional simple con $cond
db.usuarios.updateMany({}, [
  { $set: { mayor: { $cond: [ { $gte: ["$edad", 18] }, true, false ] } } }
])
// Luis (17) -> mayor: false   Ana (20) -> mayor: true

// Copiar un campo en otro y borrar el viejo
db.usuarios.updateMany({}, [
  { $set: { correo: "$email" } },
  { $unset: "email" }
])

// Setear un campo con el tamaño de un array
db.usuarios.updateMany({}, [
  { $set: { cantTags: { $size: "$tags" } } }
])
// Maria -> 3   Juan -> 0
```

## `$switch` vs `$cond`

| | Cuándo |
|---|---|
| `$cond` | 2 caminos (if / else) |
| `$switch` | 3 o más caminos (`branches` + `default`) |

```js
{ $cond: [ <condicion>, <valorSiTrue>, <valorSiFalse> ] }

{ $switch: {
    branches: [ { case: <cond1>, then: <val1> }, { case: <cond2>, then: <val2> } ],
    default: <valorPorDefecto>
} }
```
