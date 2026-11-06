# 07 · Modelado de datos

> **Regla de oro:** *modelá según las queries que vas a hacer.* No hay una única respuesta correcta; lo que importa es justificar la decisión.

## Las dos opciones

### Anidamiento (embedding)

El documento hijo va **dentro** del padre.

```js
{
  _id: 1,
  nombre: "Ana",
  direcciones: [
    { calle: "San Martin 100", ciudad: "Cordoba" },
    { calle: "Belgrano 250",   ciudad: "Rosario" }
  ]
}
```

**Usalo cuando:**
- La relación es **1 a pocos**.
- Los datos **siempre se leen juntos**.
- El hijo **no va a crecer indefinidamente**.
- No se consulta al hijo por separado.

**Ventajas:** una sola lectura, sin `$lookup`, updates atómicos sobre un documento.

### Referencias (referencing)

Se guarda el `_id` del otro documento (como una FK en SQL).

```js
// peliculas
{ _id: ObjectId("64b0...01"), titulo: "Matrix" }

// comentarios
{ movie_id: ObjectId("64b0...01"), usuario: "Ana", puntaje: 5 }
```

**Usalo cuando:**
- La relación es **1 a muchos** (o muchos a muchos): película → comentarios.
- Los datos **se leen por separado**.
- El hijo **crece sin límite** (el documento padre superaría los **16 MB**, el máximo por documento).
- El hijo se comparte entre varios padres.

**Costo:** para juntar los datos necesitás `$lookup` o dos consultas.

## Comparación con un ejemplo: películas y comentarios

### Opción A: comentarios embebidos

```js
{
  titulo: "Matrix",
  comentarios: [
    { usuario: "Ana",   puntaje: 5 },
    { usuario: "Luis",  puntaje: 4 },
    { usuario: "Maria", puntaje: 5 }
  ]
}
```

- ✅ Mostrar la película con sus comentarios = **1 query**.
- ❌ Una película popular con 500.000 comentarios → el documento **crece sin control** y se acerca a los 16 MB.
- ❌ Listar "todos los comentarios de Ana" obliga a recorrer todas las películas.

### Opción B: colección aparte con referencia (la del seed)

- ✅ El documento de la película es chico y estable.
- ✅ Comentarios por usuario o por fecha: query directa sobre `comentarios`.
- ❌ Mostrar película + comentarios requiere `$lookup`.

**Conclusión para este caso: B**, porque la relación es 1 a muchos sin tope.

## Tabla de decisión

| Pregunta | Si la respuesta es sí → |
|---|---|
| ¿Cuántos hijos tiene un padre? ¿pocos y acotados? | Embedding |
| ¿Siempre leo padre e hijo juntos? | Embedding |
| ¿El hijo puede crecer sin límite? | Referencia |
| ¿Consulto al hijo de forma independiente? | Referencia |
| ¿El hijo pertenece a varios padres? | Referencia |
| ¿Necesito actualizar padre e hijo atómicamente? | Embedding |

## Cómo justificar en el parcial

Una buena respuesta tiene la forma:

> "Elijo **[embedding / referencia]** para **[relación]** porque **[patrón de acceso]**. El costo es **[desventaja]**, que acepto porque **[razón]**."

Ejemplo:

> "Elijo **referencias** para película → comentarios porque la relación es 1 a muchos sin límite y los comentarios se consultan también por usuario. El costo es un `$lookup` al mostrar ambos, que acepto porque el documento de película se mantiene chico."

## Patrón híbrido (también válido)

Embeber un **resumen** y referenciar el detalle:

```js
{
  titulo: "Matrix",
  ultimosComentarios: [ /* los 3 más recientes, embebidos */ ],
  promedioPuntaje: 4.67,
  cantComentarios: 3
}
// + colección "comentarios" completa, con referencia a la película
```
