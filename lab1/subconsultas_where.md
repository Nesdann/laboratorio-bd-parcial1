# Subconsultas (consultas anidadas) en el WHERE

## ¿Qué es?

Una subconsulta es un `SELECT` metido **dentro** de otra consulta, generalmente entre paréntesis. La de adentro se ejecuta (conceptualmente) primero, y su resultado lo usa la de afuera para filtrar.

```sql
SELECT columnas
FROM tabla
WHERE columna OPERADOR (SELECT algo FROM otraTabla ...);
```

Hay dos tipos importantes y se comportan distinto: **subconsulta simple (no correlacionada)** y **subconsulta correlacionada**.

---

## 1. Subconsulta simple (no correlacionada)

La de adentro **no depende** de la consulta de afuera — se podría ejecutar sola, suelta, y tendría sentido. MySQL la resuelve una sola vez.

### Con `=` (subconsulta devuelve un solo valor)

```sql
-- Clientes que están en la misma ciudad que el cliente 103
SELECT customerName, city
FROM customers
WHERE city = (
    SELECT city FROM customers WHERE customerNumber = 103
);
```

### Con `IN` (subconsulta devuelve varios valores)

```sql
-- Empleados que trabajan en oficinas de Estados Unidos
SELECT firstName, lastName
FROM employees
WHERE officeCode IN (
    SELECT officeCode FROM offices WHERE country = 'USA'
);
```

### Con `NOT IN`

```sql
-- Productos que nunca fueron pedidos
SELECT productName
FROM products
WHERE productCode NOT IN (
    SELECT productCode FROM orderdetails
);
```

### Con `>`, `<`, `>=` junto a una función de agregación

```sql
-- Clientes con un límite de crédito mayor al promedio de todos
SELECT customerName, creditLimit
FROM customers
WHERE creditLimit > (
    SELECT AVG(creditLimit) FROM customers
);
```

### Con `EXISTS` / `NOT EXISTS`

`EXISTS` no mira el valor devuelto, solo si la subconsulta devuelve **alguna fila o ninguna**.

```sql
-- Clientes que tienen al menos un pedido
SELECT customerName
FROM customers AS c
WHERE EXISTS (
    SELECT 1 FROM orders AS o WHERE o.customerNumber = c.customerNumber
);
```

Este último ejemplo ya es correlacionado (mirá el punto 2) — es el caso más común de `EXISTS`.

---

## 2. Subconsulta correlacionada (la que preguntás)

Es cuando la subconsulta de adentro **hace referencia a una columna de la tabla de afuera**. No se puede ejecutar sola porque necesita ese valor externo. MySQL la re-evalúa (conceptualmente) **fila por fila** de la consulta externa.

Esta es la forma típica:

```sql
SELECT columnas
FROM tablaExterna AS ext
WHERE columna OPERADOR (
    SELECT algo
    FROM tablaInterna AS intr
    WHERE intr.columnaRelacion = ext.columnaRelacion   -- acá está la "llamada" a la tabla externa
);
```

### Ejemplo 1: empleados que ganan más que el promedio de su propia oficina

```sql
SELECT e.firstName, e.lastName, e.officeCode
FROM employees AS e
WHERE e.salary > (
    SELECT AVG(e2.salary)
    FROM employees AS e2
    WHERE e2.officeCode = e.officeCode   -- referencia a la tabla externa "e"
);
```
Para cada empleado `e`, la subconsulta calcula el promedio de salario **solo de su oficina** (no el promedio general) y lo compara.

### Ejemplo 2: clientes que gastaron más que el promedio de gasto de todos los clientes de su misma ciudad

```sql
SELECT c.customerName, c.city
FROM customers AS c
WHERE (
    SELECT SUM(py.amount) FROM payments AS py WHERE py.customerNumber = c.customerNumber
) > (
    SELECT AVG(totalPorCliente.gastado)
    FROM (
        SELECT c2.customerNumber, SUM(py2.amount) AS gastado
        FROM customers AS c2
        INNER JOIN payments AS py2 ON py2.customerNumber = c2.customerNumber
        WHERE c2.city = c.city
        GROUP BY c2.customerNumber
    ) AS totalPorCliente
);
```
(Este es más complejo, para mostrar que se pueden anidar varios niveles — normalmente esto se resuelve mejor con un `JOIN` + `GROUP BY`, pero sirve como ejemplo de anidamiento.)

### Ejemplo 3: propiedades que nunca tuvieron una reserva (con NOT EXISTS correlacionado)

```sql
SELECT p.id, p.name
FROM properties AS p
WHERE NOT EXISTS (
    SELECT 1
    FROM bookings AS b
    WHERE b.property_id = p.id   -- referencia a la tabla externa "p"
);
```

### Ejemplo 4: el último pago de cada usuario (usando MAX correlacionado)

```sql
SELECT py.*
FROM payments AS py
WHERE py.payment_date = (
    SELECT MAX(py2.payment_date)
    FROM payments AS py2
    WHERE py2.user_id = py.user_id   -- referencia a la tabla externa "py"
);
```

---

## Diferencia clave: simple vs. correlacionada

| | Simple (no correlacionada) | Correlacionada |
|---|---|---|
| ¿La subconsulta usa columnas de la tabla externa? | No | Sí |
| ¿Se puede ejecutar sola? | Sí | No (le falta el valor externo) |
| ¿Cuándo se re-evalúa? | Una sola vez | Conceptualmente, una vez por fila externa |
| Rendimiento | Generalmente más rápida | Puede ser más lenta con tablas grandes |

---

## Tip para reconocerlas

Si dentro del `WHERE` de la subconsulta ves algo como:

```sql
WHERE tablaInterna.columna = tablaExterna.columna
```

y `tablaExterna` es la tabla que estás usando en el `FROM` de **afuera** (con su alias), eso es lo que hace que sea correlacionada — la subconsulta "le pregunta" a cada fila de afuera antes de resolver su propio resultado.

## Subconsulta en el SELECT (bonus, se ve seguido junto con esto)

También se puede meter una subconsulta correlacionada en el `SELECT`, no solo en el `WHERE`:

```sql
SELECT
    c.customerName,
    (SELECT COUNT(*) FROM orders AS o WHERE o.customerNumber = c.customerNumber) AS cantidadOrdenes
FROM customers AS c;
```
Acá, para cada fila de `customers`, se ejecuta la subconsulta contando sus órdenes. Misma lógica de correlación, distinto lugar.
