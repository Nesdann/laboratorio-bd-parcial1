# Subconsultas en SQL

Una **subconsulta** es una consulta dentro de otra consulta. También se la llama `subquery`.

Sirve para usar el resultado de una consulta como condición, valor o tabla temporal de otra consulta.

---

## 1. Subconsulta que devuelve un solo valor

Se puede comparar el resultado usando `>`, `<`, `=`, `>=` o `<=`.

```sql
SELECT
    ProductName,
    UnitPrice
FROM Products
WHERE UnitPrice > (
    SELECT AVG(UnitPrice)
    FROM Products
);
```

### ¿Qué hace?

1. La subconsulta calcula el precio promedio.
2. La consulta principal muestra los productos cuyo precio es mayor al promedio.

```sql
WHERE UnitPrice > (SELECT AVG(UnitPrice) FROM Products)
```

La subconsulta devuelve un solo valor, por eso se puede usar con `>`.

---

## 2. Operadores para comparar con subconsultas

```sql
WHERE atributo > (SELECT valor)
```

```sql
WHERE atributo < (SELECT valor)
```

```sql
WHERE atributo = (SELECT valor)
```

```sql
WHERE atributo >= (SELECT valor)
```

### Ejemplo con el precio máximo

```sql
SELECT
    ProductName,
    UnitPrice
FROM Products
WHERE UnitPrice = (
    SELECT MAX(UnitPrice)
    FROM Products
);
```

Muestra el o los productos que tienen el precio máximo.

---

## 3. Subconsulta con `IN`

`IN` se usa cuando la subconsulta devuelve varios valores.

```sql
SELECT
    CustomerID,
    CompanyName
FROM Customers
WHERE CustomerID IN (
    SELECT CustomerID
    FROM Orders
);
```

### ¿Qué hace?

Muestra los clientes cuyo `CustomerID` aparece en la tabla `Orders`.

En otras palabras:

> Mostrar clientes que hicieron al menos un pedido.

La subconsulta devuelve una lista de clientes y `IN` verifica si cada cliente pertenece a esa lista.

---

## 4. `NOT IN`

`NOT IN` busca valores que no están en el resultado de la subconsulta.

```sql
SELECT
    CustomerID,
    CompanyName
FROM Customers
WHERE CustomerID NOT IN (
    SELECT CustomerID
    FROM Orders
);
```

Muestra clientes que no aparecen en ningún pedido.

> En consultas reales, `NOT EXISTS` suele ser más seguro que `NOT IN` cuando puede haber valores `NULL`.

---

## 5. `EXISTS`

`EXISTS` verifica si existe al menos una fila que cumpla una condición.

```sql
SELECT
    c.CustomerID,
    c.CompanyName
FROM Customers c
WHERE EXISTS (
    SELECT 1
    FROM Orders o
    WHERE o.CustomerID = c.CustomerID
);
```

### ¿Qué hace?

Muestra clientes para los cuales existe al menos un pedido.

El `1` no es un dato que queramos mostrar. Solo indica que alcanza con comprobar que exista una fila.

---

## 6. `NOT EXISTS`

`NOT EXISTS` verifica que no exista ninguna fila que cumpla una condición.

```sql
SELECT
    c.CustomerID,
    c.CompanyName
FROM Customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM Orders o
    WHERE o.CustomerID = c.CustomerID
);
```

### ¿Qué hace?

Muestra clientes que nunca realizaron un pedido.

---

## 7. Subconsulta correlacionada

Una subconsulta es **correlacionada** cuando utiliza una columna de la consulta exterior.

```sql
SELECT
    p.ProductName,
    p.CategoryID,
    p.UnitPrice
FROM Products p
WHERE p.UnitPrice > (
    SELECT AVG(p2.UnitPrice)
    FROM Products p2
    WHERE p2.CategoryID = p.CategoryID
);
```

### ¿Qué hace?

Muestra productos cuyo precio es mayor al promedio de su propia categoría.

La relación entre la consulta exterior y la subconsulta está en:

```sql
p2.CategoryID = p.CategoryID
```

- `p` pertenece a la consulta exterior.
- `p2` pertenece a la subconsulta.
- La subconsulta se calcula teniendo en cuenta la categoría del producto actual.

### ¿Por qué es correlacionada?

La consulta exterior recorre los productos uno por uno. Para cada producto, la subconsulta vuelve a calcular el promedio de la categoría de ese producto.

Por ejemplo:

```text
Producto A -> categoría 1 -> compara con el promedio de categoría 1
Producto B -> categoría 2 -> compara con el promedio de categoría 2
Producto C -> categoría 1 -> compara con el promedio de categoría 1
```

La subconsulta no calcula un único promedio general. Calcula un promedio distinto según la categoría del producto actual.

### Otro ejemplo: empleados que superan el promedio de su ciudad

```sql
SELECT
    e.FirstName,
    e.LastName,
    e.City,
    e.Salary
FROM Employees e
WHERE e.Salary > (
    SELECT AVG(e2.Salary)
    FROM Employees e2
    WHERE e2.City = e.City
);
```

Para cada empleado, se calcula el salario promedio de su ciudad y se compara con su salario.

### Otro ejemplo: productos más caros que el promedio de su proveedor

```sql
SELECT
    p.ProductName,
    p.SupplierID,
    p.UnitPrice
FROM Products p
WHERE p.UnitPrice > (
    SELECT AVG(p2.UnitPrice)
    FROM Products p2
    WHERE p2.SupplierID = p.SupplierID
);
```

La condición que conecta ambas consultas es la que hace que sea correlacionada:

```sql
p2.SupplierID = p.SupplierID
```

---

## 8. `EXISTS` como subconsulta correlacionada

Este es uno de los usos más comunes de `EXISTS`:

```sql
SELECT
    c.CompanyName
FROM Customers c
WHERE EXISTS (
    SELECT 1
    FROM Orders o
    WHERE o.CustomerID = c.CustomerID
      AND o.OrderDate >= '1997-01-01'
);
```

Muestra clientes que tienen al menos un pedido desde el año 1997.

La condición relaciona ambas consultas:

```sql
o.CustomerID = c.CustomerID
```

---

## 9. Clientes sin pedidos

```sql
SELECT
    c.CustomerID,
    c.CompanyName
FROM Customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM Orders o
    WHERE o.CustomerID = c.CustomerID
);
```

### Molde general

```sql
SELECT columnas
FROM tabla_principal t
WHERE NOT EXISTS (
    SELECT 1
    FROM tabla_relacionada r
    WHERE r.id = t.id
);
```

---

## 10. Subconsulta en `FROM`

Una subconsulta también puede funcionar como una tabla temporal.

```sql
SELECT
    resumen.CustomerID,
    resumen.total_gastado
FROM (
    SELECT
        o.CustomerID,
        SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS total_gastado
    FROM Orders o
    JOIN `Order Details` od
        ON od.OrderID = o.OrderID
    GROUP BY o.CustomerID
) resumen
ORDER BY resumen.total_gastado DESC;
```

La subconsulta recibe el alias `resumen` y después se puede consultar como una tabla.

> Toda subconsulta ubicada en `FROM` necesita un alias.

---

## 11. Subconsulta en `SELECT`

También se puede usar una subconsulta como una columna calculada. En este caso, la consulta exterior muestra una fila por cliente y la subconsulta calcula un dato adicional para ese cliente.

```sql
SELECT
    c.CompanyName,
    (
        SELECT COUNT(*)
        FROM Orders o
        WHERE o.CustomerID = c.CustomerID
    ) AS cantidad_pedidos
FROM Customers c;
```

### ¿Cómo se lee?

```text
Para cada cliente c:
    contar los pedidos cuyo CustomerID sea igual al del cliente actual
    mostrar ese resultado como cantidad_pedidos
```

La relación está en:

```sql
o.CustomerID = c.CustomerID
```

Como la subconsulta usa `c.CustomerID`, que pertenece a la consulta exterior, también es una subconsulta correlacionada.

El resultado sería parecido a:

```text
CompanyName       cantidad_pedidos
---------------   ----------------
Cliente A         12
Cliente B          0
Cliente C          5
```

### Ejemplo: total gastado por cada cliente

```sql
SELECT
    c.CompanyName,
    (
        SELECT SUM(od.UnitPrice * od.Quantity * (1 - od.Discount))
        FROM Orders o
        JOIN `Order Details` od
            ON od.OrderID = o.OrderID
        WHERE o.CustomerID = c.CustomerID
    ) AS total_gastado
FROM Customers c;
```

Para cada cliente, la subconsulta suma únicamente los pedidos de ese cliente.

### Ejemplo: último pedido de cada cliente

```sql
SELECT
    c.CompanyName,
    (
        SELECT MAX(o.OrderDate)
        FROM Orders o
        WHERE o.CustomerID = c.CustomerID
    ) AS ultimo_pedido
FROM Customers c;
```

La subconsulta busca la fecha máxima de pedido para cada cliente.

### Idea principal

Una subconsulta en `SELECT` agrega un dato calculado al resultado principal:

```sql
SELECT
    tabla_principal.nombre,
    (
        SELECT funcion(tabla_relacionada.valor)
        FROM tabla_relacionada
        WHERE tabla_relacionada.id = tabla_principal.id
    ) AS resultado_calculado
FROM tabla_principal;
```

---

## 12. Subconsulta en `UPDATE`

Se puede utilizar una subconsulta para decidir qué registros actualizar.

```sql
UPDATE Products
SET UnitPrice = UnitPrice * 1.10
WHERE CategoryID IN (
    SELECT CategoryID
    FROM Categories
    WHERE CategoryName = 'Beverages'
);
```

Aumenta un 10% el precio de los productos de la categoría `Beverages`.

---

## 13. Subconsulta en `DELETE`

```sql
DELETE FROM Customers
WHERE CustomerID NOT IN (
    SELECT CustomerID
    FROM Orders
);
```

Elimina clientes que no tienen pedidos.

> Antes de hacer un `DELETE`, conviene ejecutar primero el mismo filtro con un `SELECT` para revisar qué filas serán afectadas.

---

## 14. Subconsulta con `ALL`

`ALL` compara un valor con todos los valores devueltos por la subconsulta.

```sql
SELECT
    ProductName,
    UnitPrice
FROM Products
WHERE UnitPrice > ALL (
    SELECT UnitPrice
    FROM Products
    WHERE CategoryID = 1
);
```

Muestra productos cuyo precio es mayor que todos los precios de la categoría 1.

---

## 15. Subconsulta con `ANY`

`ANY` o `SOME` compara un valor con al menos uno de los valores devueltos.

```sql
SELECT
    ProductName,
    UnitPrice
FROM Products
WHERE UnitPrice > ANY (
    SELECT UnitPrice
    FROM Products
    WHERE CategoryID = 1
);
```

Muestra productos cuyo precio es mayor que al menos un precio de la categoría 1.

---

## 16. Diferencia entre `IN` y `EXISTS`

### Con `IN`

```sql
SELECT *
FROM Customers
WHERE CustomerID IN (
    SELECT CustomerID
    FROM Orders
);
```

La subconsulta devuelve una lista de valores y se compara con esa lista.

### Con `EXISTS`

```sql
SELECT *
FROM Customers c
WHERE EXISTS (
    SELECT 1
    FROM Orders o
    WHERE o.CustomerID = c.CustomerID
);
```

Se verifica si existe una coincidencia para cada cliente.

### Regla rápida

```text
IN      -> comparar contra una lista
EXISTS  -> verificar si existe una coincidencia
```

---

## 17. Subconsulta versus `JOIN`

Muchas veces el mismo problema se puede resolver con una subconsulta o con un `JOIN`.

### Con subconsulta

```sql
SELECT *
FROM Customers c
WHERE EXISTS (
    SELECT 1
    FROM Orders o
    WHERE o.CustomerID = c.CustomerID
);
```

### Con `JOIN`

```sql
SELECT DISTINCT
    c.CustomerID,
    c.CompanyName
FROM Customers c
JOIN Orders o
    ON o.CustomerID = c.CustomerID;
```

Las dos consultas buscan clientes con pedidos. `EXISTS` expresa mejor la idea de “existe al menos uno”, mientras que `JOIN` sirve cuando también se necesitan columnas de la tabla relacionada.

---

## 18. Subconsulta versus `WITH`

### Subconsulta

```sql
SELECT *
FROM (
    SELECT
        CustomerID,
        SUM(Amount) AS total
    FROM Payments
    GROUP BY CustomerID
) resumen
WHERE total > 1000;
```

### CTE con `WITH`

```sql
WITH resumen AS (
    SELECT
        CustomerID,
        SUM(Amount) AS total
    FROM Payments
    GROUP BY CustomerID
)
SELECT *
FROM resumen
WHERE total > 1000;
```

`WITH` suele ser más legible cuando la consulta tiene varios pasos o cuando se reutiliza el resultado intermedio.

---

## 19. Esquema para reconocer qué usar

```text
¿La subconsulta devuelve un solo valor?
    -> usar =, >, <, >= o <=

¿La subconsulta devuelve una lista de valores?
    -> usar IN o NOT IN

¿Solo necesito saber si existe una coincidencia?
    -> usar EXISTS

¿Necesito saber si no existe una coincidencia?
    -> usar NOT EXISTS

¿La subconsulta usa una columna de la consulta exterior?
    -> es correlacionada

¿La consulta es larga o tiene varios pasos?
    -> considerar WITH
```

---

## 20. Moldes generales

### Comparar con un valor

```sql
SELECT columnas
FROM tabla
WHERE atributo > (
    SELECT funcion(atributo)
    FROM tabla
);
```

### Buscar coincidencias

```sql
SELECT columnas
FROM tabla_principal t
WHERE t.id IN (
    SELECT id
    FROM tabla_relacionada
);
```

### Verificar existencia

```sql
SELECT columnas
FROM tabla_principal t
WHERE EXISTS (
    SELECT 1
    FROM tabla_relacionada r
    WHERE r.id = t.id
);
```

### Verificar ausencia

```sql
SELECT columnas
FROM tabla_principal t
WHERE NOT EXISTS (
    SELECT 1
    FROM tabla_relacionada r
    WHERE r.id = t.id
);
```

### Comparar con el promedio del grupo

```sql
SELECT columnas
FROM tabla t
WHERE valor > (
    SELECT AVG(valor)
    FROM tabla t2
    WHERE t2.grupo_id = t.grupo_id
);
```

---

## Resumen final

El nombre general es **subconsulta**.

```sql
WHERE atributo > (SELECT algo)
```

Es una subconsulta que devuelve un valor.

```sql
WHERE atributo IN (SELECT algo)
```

Es una subconsulta que devuelve una lista.

```sql
WHERE EXISTS (SELECT 1 ...)
```

Comprueba si existe al menos una fila.

```sql
WHERE NOT EXISTS (SELECT 1 ...)
```

Comprueba que no exista ninguna fila.

Si la subconsulta usa una columna de la consulta exterior, es una **subconsulta correlacionada**.
