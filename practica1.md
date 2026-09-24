# Práctica 1 - Consultas con SQL y CTEs

Este documento reúne las consignas, la lógica de resolución y ejemplos con `WITH` para que sirvan como molde para estudiar.

---

## 1. Listar los 5 clientes que más ingresos han generado a lo largo del tiempo

### Enunciado
Listar los 5 clientes que más ingresos han generado a lo largo del tiempo.

### Solución con `WITH`

```sql
WITH ingresos_cliente AS (
    SELECT
        c.CustomerID,
        c.CompanyName,
        SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS total_ingresos
    FROM Customers c
    JOIN Orders o ON o.CustomerID = c.CustomerID
    JOIN `Order Details` od ON od.OrderID = o.OrderID
    GROUP BY c.CustomerID, c.CompanyName
)
SELECT
    CustomerID,
    CompanyName,
    total_ingresos
FROM ingresos_cliente
ORDER BY total_ingresos DESC
LIMIT 5;
```

### Qué resuelve
- calcula el ingreso total por cliente
- ordena de mayor a menor
- devuelve solo los 5 primeros

---

## 2. Listar cada producto con sus ventas totales, agrupados por categoría

### Enunciado
Listar cada producto con sus ventas totales, agrupados por categoría.

### Solución con `WITH`

```sql
WITH ventas_producto AS (
    SELECT
        p.ProductID,
        p.ProductName,
        p.CategoryID,
        c.CategoryName,
        SUM(od.Quantity) AS total_unidades_vendidas
    FROM Products p
    JOIN `Order Details` od ON od.ProductID = p.ProductID
    JOIN Categories c ON c.CategoryID = p.CategoryID
    GROUP BY p.ProductID, p.ProductName, p.CategoryID, c.CategoryName
)
SELECT
    ProductID,
    ProductName,
    CategoryName,
    total_unidades_vendidas
FROM ventas_producto
ORDER BY CategoryName, ProductName;
```

### Qué resuelve
- suma la cantidad vendida por cada producto
- agrupa la información por categoría
- muestra el producto y su total vendido

---

## 3. Calcular el total de ventas para cada categoría

### Enunciado
Calcular el total de ventas para cada categoría.

### Solución con `WITH`

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

### Qué resuelve
- obtiene el monto total vendido por categoría
- facilita comparar categorías entre sí

---

## 4. Crear una vista que liste los empleados con más ventas por cada año

### Enunciado
Crear una vista que liste los empleados con más ventas por cada año, mostrando empleado, año y total de ventas. Ordenar por año ascendente.

### Solución

```sql
CREATE VIEW best_employees AS
WITH ventas_empleado AS (
    SELECT
        e.EmployeeID,
        e.FirstName,
        e.LastName,
        YEAR(o.OrderDate) AS OrderYear,
        SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS TotalSales
    FROM Employees e
    JOIN Orders o ON o.EmployeeID = e.EmployeeID
    JOIN `Order Details` od ON od.OrderID = o.OrderID
    GROUP BY e.EmployeeID, e.FirstName, e.LastName, YEAR(o.OrderDate)
),
ranking AS (
    SELECT
        EmployeeID,
        FirstName,
        LastName,
        OrderYear,
        TotalSales,
        ROW_NUMBER() OVER (
            PARTITION BY OrderYear
            ORDER BY TotalSales DESC
        ) AS posicion
    FROM ventas_empleado
)
SELECT
    EmployeeID,
    FirstName,
    LastName,
    OrderYear,
    TotalSales
FROM ranking
WHERE posicion = 1
ORDER BY OrderYear ASC;
```

### Qué resuelve
- agrupa ventas por empleado y año
- ordena por ventas totales
- toma solo al empleado con más ventas en cada año

> También se puede consultar luego con:
>
> ```sql
> SELECT *
> FROM best_employees;
> ```

---

## 5. Trigger para descontar stock después de insertar en `Order Details`

### Enunciado
Crear un trigger que se ejecute después de insertar un nuevo registro en la tabla `Order Details`. Este trigger debe actualizar la tabla `Products` para disminuir la cantidad en stock (`UnitsInStock`) del producto correspondiente, restando la cantidad (`Quantity`) que se acaba de insertar en el detalle del pedido.

### Solución

```sql
DELIMITER $$

CREATE TRIGGER update_stock
AFTER INSERT ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET UnitsInStock = UnitsInStock - NEW.Quantity
    WHERE ProductID = NEW.ProductID;
END$$

DELIMITER ;
```

### Qué resuelve
- cuando se agrega una fila a `Order Details`
- toma la cantidad nueva
- resta esa cantidad al stock del producto

### Observación
Este trigger es correcto para la lógica básica de stock. Si se quiere evitar stock negativo, se puede agregar una validación adicional:

```sql
DELIMITER $$

CREATE TRIGGER update_stock
AFTER INSERT ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET UnitsInStock = UnitsInStock - NEW.Quantity
    WHERE ProductID = NEW.ProductID
      AND UnitsInStock >= NEW.Quantity;
END$$

DELIMITER ;
```

---

## 6. Crear el rol `admin` con permisos específicos

### Enunciado
Crear un rol llamado admin y otorgarle los siguientes permisos:
- crear registros en la tabla `Customers`
- actualizar solamente la columna `Phone` de `Customers`

### Solución

```sql
CREATE ROLE admin;

GRANT INSERT ON Northwind.Customers TO admin;
GRANT UPDATE (Phone) ON Northwind.Customers TO admin;
```

### Si querés asignarlo a un usuario

```sql
GRANT admin TO 'usuario1'@'localhost';
```

### Qué resuelve
- crea un rol administrativo básico
- permite agregar clientes
- permite modificar únicamente el teléfono
- no da permiso para tocar otras columnas

---

## Consultas iniciales del práctico

Estas fueron las consultas base que se trabajaron al principio:

### 1) Empleados con mayor total de ventas

```sql
SELECT
    e.EmployeeID,
    e.FirstName,
    SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS TotalPrice
FROM Employees AS e
JOIN Orders AS ord ON e.EmployeeID = ord.EmployeeID
JOIN `Order Details` AS od ON od.OrderID = ord.OrderID
GROUP BY e.EmployeeID, e.FirstName
ORDER BY TotalPrice DESC
LIMIT 10;
```

### 2) Productos con ventas totales por categoría

```sql
SELECT
    p.ProductID,
    p.CategoryID,
    p.ProductName,
    c.CategoryName,
    SUM(od.Quantity) AS total_vendido
FROM Products AS p
JOIN `Order Details` AS od ON p.ProductID = od.ProductID
JOIN Categories AS c ON p.CategoryID = c.CategoryID
GROUP BY p.CategoryID, p.ProductID, p.ProductName, c.CategoryName;
```

### 3) Total de ventas por categoría

```sql
SELECT
    p.CategoryID,
    c.CategoryName,
    SUM(od.Quantity * od.UnitPrice * (1 - od.Discount)) AS total_ventas
FROM Products AS p
JOIN `Order Details` AS od ON p.ProductID = od.ProductID
JOIN Categories AS c ON p.CategoryID = c.CategoryID
GROUP BY p.CategoryID, c.CategoryName;
```

### 4) Vista de empleados con más ventas por año

```sql
CREATE VIEW best_employees AS
SELECT
    e.EmployeeID,
    e.FirstName,
    e.LastName,
    SUM(od.Quantity * od.UnitPrice * (1 - od.Discount)) AS TotalQuantity,
    YEAR(ord.OrderDate) AS OrderYear
FROM Employees AS e
JOIN Orders AS ord ON ord.EmployeeID = e.EmployeeID
JOIN `Order Details` AS od ON od.OrderID = ord.OrderID
GROUP BY OrderYear, e.EmployeeID, e.FirstName, e.LastName
ORDER BY OrderYear ASC, TotalQuantity DESC;
```

> La versión anterior se puede mejorar usando `ROW_NUMBER()` para quedarse con solo el mejor empleado por año.

---

## Modelo general de solución para consultas de parcial

```sql
WITH datos AS (
    SELECT
        t1.campo1,
        t2.campo2,
        SUM(t3.campo3) AS total
    FROM tabla1 t1
    JOIN tabla2 t2 ON t2.id = t1.id
    JOIN tabla3 t3 ON t3.id = t2.id
    GROUP BY t1.campo1, t2.campo2
)
SELECT
    campo1,
    campo2,
    total
FROM datos
WHERE condicion
ORDER BY total DESC;
```

---

## Resumen rápido

En esta práctica se trabajan principalmente:
- joins entre varias tablas
- agregaciones (`SUM`, `COUNT`, `GROUP BY`)
- CTEs con `WITH`
- vistas (`CREATE VIEW`)
- triggers
- permisos y roles

Estos temas son muy típicos en parciales de Base de Datos.

---

## Recomendación final

Si te van a evaluar por SQL, conviene que tengas bien claro esto:
1. hacer joins correctos
2. agrupar bien con `GROUP BY`
3. ordenar con `ORDER BY`
4. usar `WITH` para consultas más legibles
5. saber crear triggers y roles

Si querés, después te puedo armar una versión todavía más corta tipo “apunte final para estudiar 10 minutos antes del parcial”.
