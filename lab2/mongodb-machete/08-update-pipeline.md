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



. ¿En un update con pipeline siempre va $set?

No, no siempre va $set. $set es solo uno de los operadores que podés usar.

En un pipeline de actualización (el que va entre corchetes [ ]), cada etapa es un objeto. Las etapas más comunes son:

    $set: Para agregar campos nuevos o modificar los existentes (es el que más vas a usar).

    $unset: Para borrar campos.

    $replaceRoot / $replaceWith: Para reemplazar todo el documento por uno nuevo.

La diferencia con el update normal es que en el pipeline no usás $mul ni $addToSet. En su lugar, usás los operadores de agregación (como $multiply o $setUnion) dentro del $set.
2. El operador $switch (La "calculadora" de casos)

Imaginate que tenés que poner una etiqueta según el promedio. El $switch es como un if / else if / else de la programación.

Su estructura es:
javascript

$switch: {
  branches: [  // Las opciones (los "if")
    { case: { CONDICION 1 }, then: "RESULTADO 1" },
    { case: { CONDICION 2 }, then: "RESULTADO 2" }
  ],
  default: "RESULTADO POR DEFECTO" // El "else" (si no cumple ninguna)
}

¿Qué es cada cosa?

    branches: Una lista (array) de casos posibles.

    case: La pregunta (la condición). Si es true, se ejecuta el then.

    then: El valor que se asigna si la condición es verdadera.

    default: Lo que se asigna si ningún case se cumplió.

3. Ejemplo Completo Explicado Línea por Línea

Vamos a usar el ejercicio de la clase 339. Queremos calcular el promedio (score_avg) y luego asignar una letra (letter) usando $switch.
javascript

db.grades.updateMany(
  // --- PARTE 1: EL FILTRO (A quiénes actualizo) ---
  { class_id: 339 }, 
  
  // --- PARTE 2: EL PIPELINE (Qué les hago, fijate los corchetes [ ]) ---
  [
    // ETAPA 1: Calculamos el promedio y lo guardamos
    {
      $set: {
        score_avg: { $avg: "$scores.score" }
      }
    },
    
    // ETAPA 2: Usamos el promedio de arriba para calcular la letra
    {
      $set: {
        letter: {
          $switch: {
            branches: [
              { 
                case: { $gte: ["$score_avg", 90] }, // Pregunta: ¿score_avg >= 90?
                then: "A"                           // Si sí: pone "A"
              },
              { 
                case: { $gte: ["$score_avg", 70] }, // Pregunta: ¿score_avg >= 70?
                then: "B"                           // Si sí: pone "B"
              }
            ],
            default: "C" // Si no cumplió ninguna de las anteriores, pone "C"
          }
        }
      }
    }
  ]
)

Desglose de la Lógica (Paso a Paso)

    Mongo agarra los documentos de la clase 339.

    Etapa 1: Entra al documento, busca scores.score, calcula el promedio con $avg, y lo guarda en un campo nuevo llamado score_avg. (Mongo guarda este cambio temporalmente y pasa al siguiente paso).

    Etapa 2: Entra al documento (que ya tiene score_avg), y evalúa el $switch:

        Pregunta 1: ¿"$score_avg" es mayor o igual a 90? (Usando $gte). Si es así, guarda "A" en letter.

        Pregunta 2: Si la anterior fue falsa, ¿"$score_avg" es mayor o igual a 70? Si es así, guarda "B".

        Default: Si ninguna fue verdadera, guarda "C".

    Termina el pipeline y guarda el documento en la base de datos.

🧠 Reglas de oro para no olvidar
Elemento	¿Qué es?	¿Va entre llaves {} o corchetes []?
El pipeline	La lista de pasos a seguir	Corchetes [ ]
Cada etapa	Un paso del pipeline	Llaves { }
$set	Instrucción para modificar un campo	Llaves { }
$switch	Evaluador condicional (if/else)	Llaves { }
branches	Lista de opciones del switch	Corchetes [ ]
case / then	La condición y el resultado	Llaves { }

Un truco: Fijate que $gte usa la misma sintaxis que en $expr. Recibe un array [valor1, valor2] y compara si el primero es mayor o igual que el segundo.