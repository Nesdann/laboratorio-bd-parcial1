# WITH en SQL

`WITH` sirve para crear una consulta temporal llamada CTE (Common Table Expression). La idea es que una consulta se pueda reutilizar dentro de otra consulta, como si fuera una subconsulta nombrada y más legible.

Se usa cuando querés:
- dividir una consulta larga en partes más claras
- evitar subconsultas repetidas
- hacer consultas por pasos
- preparar datos intermedios antes de hacer el resultado final
- resolver problemas de ranking, agregación y análisis

---

## Sintaxis básica

```sql
WITH nombre_cte AS (
    SELECT ...
    FROM ...
    WHERE ...
)
SELECT ...
FROM nombre_cte
WHERE ...;
```

La estructura es:
1. `WITH nombre_cte AS (...)`
2. Luego la consulta final que usa ese resultado

---

## ¿Cuándo se usa?

Se usa en muchos casos, por ejemplo:
- cuando hay varias tablas relacionadas
- cuando querés calcular un total intermedio
- cuando querés obtener top N registros
- cuando querés ranking por año o por categoría
- cuando querés crear consultas más legibles para parciales o entregas

---

## Ejemplo 1: total de ventas por empleado

```sql
WITH ventas_empleado AS (
    SELECT
        e.EmployeeID,
        e.FirstName,
        SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS total_ventas
    FROM Employees e
    JOIN Orders o ON o.EmployeeID = e.EmployeeID
    JOIN `Order Details` od ON od.OrderID = o.OrderID
    GROUP BY e.EmployeeID, e.FirstName
)
SELECT
    EmployeeID,
    FirstName,
    total_ventas
FROM ventas_empleado
ORDER BY total_ventas DESC;
```

### Qué hace
- primero calcula el total vendido por cada empleado
- luego ordena los resultados de mayor a menor

---

## Ejemplo 2: Top 5 empleados con más ventas

```sql
WITH ventas_empleado AS (
    SELECT
        e.EmployeeID,
        e.FirstName,
        SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS total_ventas
    FROM Employees e
    JOIN Orders o ON o.EmployeeID = e.EmployeeID
    JOIN `Order Details` od ON od.OrderID = o.OrderID
    GROUP BY e.EmployeeID, e.FirstName
)
SELECT
    EmployeeID,
    FirstName,
    total_ventas
FROM ventas_empleado
ORDER BY total_ventas DESC
LIMIT 5;
```

### Uso típico
- sirve para responder preguntas como:
  - ¿quiénes vendieron más?
  - ¿cuáles son los mejores empleados?

---

## Ejemplo 3: ventas por categoría

```sql
WITH ventas_categoria AS (
    SELECT
        p.CategoryID,
        c.CategoryName,
        SUM(od.Quantity * od.UnitPrice * (1 - od.Discount)) AS total_ventas
    FROM Products p
    JOIN `Order Details` od ON od.ProductID = p.ProductID
    JOIN Categories c ON c.CategoryID = p.CategoryID
    GROUP BY p.CategoryID, c.CategoryName
)
SELECT
    CategoryID,
    CategoryName,
    total_ventas
FROM ventas_categoria
ORDER BY total_ventas DESC;
```

---

## Ejemplo 4: varias CTEs encadenadas

```sql
WITH ventas_empleado AS (
    SELECT
        e.EmployeeID,
        e.FirstName,
        SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS total_ventas
    FROM Employees e
    JOIN Orders o ON o.EmployeeID = e.EmployeeID
    JOIN `Order Details` od ON od.OrderID = o.OrderID
    GROUP BY e.EmployeeID, e.FirstName
),
ranking AS (
    SELECT
        EmployeeID,
        FirstName,
        total_ventas,
        ROW_NUMBER() OVER (ORDER BY total_ventas DESC) AS posicion
    FROM ventas_empleado
)
SELECT
    EmployeeID,
    FirstName,
    total_ventas
FROM ranking
WHERE posicion <= 5;
```

### Cuándo sirve
- cuando hay que hacer ranking
- cuando querés un paso intermedio antes del resultado final

---

## Modelo general para parciales

```sql
WITH datos_intermedios AS (
    SELECT
        columna1,
        columna2,
        SUM(columna3) AS suma_total
    FROM tabla1 t1
    JOIN tabla2 t2 ON t2.id = t1.id
    GROUP BY columna1, columna2
)
SELECT
    columna1,
    columna2,
    suma_total
FROM datos_intermedios
WHERE condicion
ORDER BY suma_total DESC;
```

Este patrón sirve para:
- resolver un problema en varios pasos
- hacer la consulta legible
- reducir errores de lógica

---

## Ventajas de usar WITH

- mejora la legibilidad
- separa la lógica en pasos
- evita subconsultas muy largas
- ayuda a entender mejor el problema
- es muy útil en parciales y trabajos prácticos

---

## Recomendación

En las entregas, si la consulta es larga o tiene varias operaciones, conviene usar `WITH` porque hace que el SQL se vea más profesional y más fácil de corregir.

> En resumen: `WITH` sirve para crear una consulta temporal que se usa como base para otra consulta.

---

## Ejemplo de resumen para memorizar

```sql
WITH CTE AS (
    SELECT ...
    FROM ...
    GROUP BY ...
)
SELECT ...
FROM CTE
ORDER BY ...;
```

Eso es lo más importante: primero se arma una CTE y luego la consulta final la usa.
