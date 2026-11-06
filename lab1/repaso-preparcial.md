# Repaso pre-parcial - Laboratorio de Base de Datos

## Fecha
18 de septiembre de 2026

## Modalidad
Collaborative / resolución grupal, con correcciones en clase.

## Importante
- Los roles no entran al parcial.
- Los triggers y vistas sí entran.
- Hay que prestar atención al formato y a la lógica de la consulta.
- En SQL se recomienda usar `backticks` cuando el nombre de tabla o columna tiene espacios o es palabra reservada.

---

## Enunciado general

### 1) Listar los 5 clientes que más ingresos han generado a lo largo del tiempo

#### Idea
Cruzá las tablas `Customers`, `Orders` y `Order Details` para calcular ingreso total por cliente.

#### Consulta base

```sql
SELECT
    c.ContactName AS nombre,
    SUM(od.UnitPrice * (1 - od.Discount) * od.Quantity) AS ingresos
FROM Customers c
JOIN Orders o ON c.CustomerID = o.CustomerID
JOIN `Order Details` od ON od.OrderID = o.OrderID
GROUP BY o.CustomerID
ORDER BY ingresos DESC
LIMIT 5;
```

#### Variante más clara

```sql
SELECT
    c.CustomerID,
    c.ContactName AS nombre,
    SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS ingresos
FROM Customers c
JOIN Orders o ON c.CustomerID = o.CustomerID
JOIN `Order Details` od ON o.OrderID = od.OrderID
GROUP BY c.CustomerID, c.ContactName
ORDER BY ingresos DESC
LIMIT 5;
```

#### Observación
La clave está en agrupar por `CustomerID` y calcular el monto total vendido por cada cliente.

---

### 2) Listar cada producto con sus ventas totales, agrupados por categoría

#### Consulta propuesta

```sql
SELECT
    p.ProductName AS pname,
    ca.CategoryName,
    SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS ventas_totales
FROM Products p
INNER JOIN Categories ca ON p.CategoryID = ca.CategoryID
INNER JOIN `Order Details` od ON p.ProductID = od.ProductID
GROUP BY ca.CategoryID, p.ProductID, p.ProductName, ca.CategoryName;
```

#### Observación
Cuando usás una función agregada (`SUM`), es necesario agrupar por las columnas que se muestran en el resultado.

---

### 3) Calcular el total de ventas para cada categoría

#### Consulta propuesta

```sql
SELECT
    ca.CategoryName,
    SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS ventas_totales
FROM Categories ca
INNER JOIN Products p ON p.CategoryID = ca.CategoryID
INNER JOIN `Order Details` od ON od.ProductID = p.ProductID
GROUP BY ca.CategoryID, ca.CategoryName;
```

#### Observación
Este ejercicio agrupa por categoría, no por producto. Por eso el `GROUP BY` debe ser por `CategoryID` y `CategoryName`.

---

### 4) Crear una vista que liste los empleados con más ventas por cada año

#### Idea
Primero calcular ventas por empleado y por año; luego elegir el máximo de cada año.

#### Solución con `WITH`

```sql
CREATE VIEW employeeOfTheYear AS
WITH ventas_ordenadas AS (
    SELECT
        e.EmployeeID,
        YEAR(o.OrderDate) AS anio,
        SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS total_de_ventas
    FROM Employees e
    INNER JOIN Orders o ON o.EmployeeID = e.EmployeeID
    INNER JOIN `Order Details` od ON od.OrderID = o.OrderID
    GROUP BY e.EmployeeID, YEAR(o.OrderDate)
)
SELECT
    v.EmployeeID,
    v.anio,
    v.total_de_ventas
FROM ventas_ordenadas v
WHERE v.total_de_ventas = (
    SELECT MAX(v2.total_de_ventas)
    FROM ventas_ordenadas v2
    WHERE v2.anio = v.anio
)
ORDER BY v.anio ASC;
```

#### Variante más completa con empleado

```sql
CREATE VIEW employeeOfTheYear AS
WITH ventas_empleado AS (
    SELECT
        e.EmployeeID,
        e.FirstName,
        e.LastName,
        YEAR(o.OrderDate) AS anio,
        SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS total_de_ventas
    FROM Employees e
    INNER JOIN Orders o ON o.EmployeeID = e.EmployeeID
    INNER JOIN `Order Details` od ON od.OrderID = o.OrderID
    GROUP BY e.EmployeeID, e.FirstName, e.LastName, YEAR(o.OrderDate)
),
ranking AS (
    SELECT
        EmployeeID,
        FirstName,
        LastName,
        anio,
        total_de_ventas,
        ROW_NUMBER() OVER (
            PARTITION BY anio
            ORDER BY total_de_ventas DESC
        ) AS posicion
    FROM ventas_empleado
)
SELECT
    EmployeeID,
    FirstName,
    LastName,
    anio,
    total_de_ventas
FROM ranking
WHERE posicion = 1
ORDER BY anio ASC;
```

#### Observación
Este ejercicio es más complicado y no suele aparecer en forma exacta en parcial, pero sí es un tipo de ejercicio muy típico con vistas y `WITH`.

---

### 5) Trigger para descontar stock después de insertar en `Order Details`

#### Error común
No se debe hacer referencia a la tabla completa como `Order Details`. En el trigger, se usa `NEW` para acceder al registro recién insertado.

#### Trigger incorrecto

```sql
CREATE TRIGGER updateStock
AFTER INSERT ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET Products.UnitsInStock = Products.UnitsInStock - `Order Details`.Quantity
    WHERE Products.ProductID = `Order Details`.ProductID;
END;
```

#### Trigger correcto

```sql
CREATE TRIGGER updateStock
AFTER INSERT ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET UnitsInStock = UnitsInStock - NEW.Quantity
    WHERE ProductID = NEW.ProductID;
END;
```

#### Observación
- `NEW.Quantity` representa la cantidad ingresada en el detalle nuevo.
- `NEW.ProductID` es el producto que se acaba de vender.
- El trigger decrece la cantidad disponible en stock del producto correspondiente.

---

## Resumen de conceptos clave

### JOINS
Se usan para relacionar tablas:

```sql
SELECT *
FROM Customers c
JOIN Orders o ON c.CustomerID = o.CustomerID;
```

### GROUP BY
Se usa cuando hay funciones agregadas:

```sql
SELECT
    CustomerID,
    SUM(Amount)
FROM Orders
GROUP BY CustomerID;
```

### ORDER BY
Ordena resultados:

```sql
ORDER BY ingresos DESC;
```

### LIMIT
Muestra solo una cantidad de filas:

```sql
LIMIT 5;
```

### WITH (CTE)
Sirve para dividir la consulta en pasos lógicos:

```sql
WITH ventas AS (
    SELECT ...
    FROM ...
    GROUP BY ...
)
SELECT ...
FROM ventas;
```

---

## Formato ideal para entregar en parcial

```sql
SELECT
    columna1,
    columna2,
    SUM(columna3) AS total
FROM tabla1 t1
JOIN tabla2 t2 ON t1.id = t2.id
GROUP BY columna1, columna2
ORDER BY total DESC;
```

### Reglas útiles
- usar mayúsculas en palabras clave (`SELECT`, `FROM`, `JOIN`, `WHERE`, `GROUP BY`)
- indentar en bloques
- separar por líneas
- usar `backticks` para nombres con espacios
- no escribir todo en una sola línea

---

## Modelo general para consultas con CTE

```sql
WITH datos_intermedios AS (
    SELECT
        t1.campo1,
        t2.campo2,
        SUM(t3.cantidad) AS total
    FROM tabla1 t1
    JOIN tabla2 t2 ON t1.id = t2.id
    JOIN tabla3 t3 ON t2.id = t3.id
    GROUP BY t1.campo1, t2.campo2
)
SELECT
    campo1,
    campo2,
    total
FROM datos_intermedios
WHERE total > 0
ORDER BY total DESC;
```

---

## Conclusión

Los ejercicios del parcial viejo apuntan a tres ideas principales:

1. relacionar tablas con `JOIN`
2. calcular totales con `SUM` y `GROUP BY`
3. usar vistas y triggers para automatizar lógica

La mayoría de los problemas se resuelven con esta lógica básica:
- unir tablas
- agrupar
- ordenar
- filtrar
- calcular resultados

---

## Consejo para estudiar

Si te toman un parcial, conviene que repases estos 5 puntos:

1. `JOIN` correcto
2. `GROUP BY` con funciones agregadas
3. `ORDER BY` y `LIMIT`
4. `WITH` para consultas más legibles
5. trigger y vista como conceptos clave

Si querés, te puedo dejar también una versión final en formato “resumen ultra corto” para estudiar 10 minutos antes del parcial.
