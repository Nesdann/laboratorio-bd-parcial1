# Práctica 1 - Repaso parcial SQL

La idea es resolver todo con `JOIN`, `GROUP BY`, `ORDER BY` y `LIMIT`, sin depender tanto de `WITH`.

---

## 1) Los 5 clientes que más ingresos generaron

```sql
SELECT
    c.ContactName AS nombre,
    SUM(od.UnitPrice * (1 - od.Discount) * od.Quantity) AS ingresos
FROM Customers AS c
JOIN Orders AS o ON c.CustomerID = o.CustomerID
JOIN `Order Details` AS od ON od.OrderID = o.OrderID
GROUP BY c.CustomerID, c.ContactName
ORDER BY ingresos DESC
LIMIT 5;
```

Explicación breve:
- se cruzan `Customers`, `Orders` y `Order Details`
- se calcula ingreso por cada detalle: `precio * cantidad * (1 - descuento)`
- se agrupa por cliente
- se ordena de mayor a menor y se toma el top 5

---

## 2) Cada producto con sus ventas totales, por categoría

```sql
SELECT
    p.ProductName AS pname,
    ca.CategoryName,
    SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS ventas_totales
FROM Products AS p
INNER JOIN Categories AS ca ON p.CategoryID = ca.CategoryID
INNER JOIN `Order Details` AS od ON p.ProductID = od.ProductID
GROUP BY p.ProductID, p.ProductName, ca.CategoryID, ca.CategoryName;
```

Explicación breve:
- cada producto tiene un `ProductID`
- la suma se calcula por producto y categoría
- si hay `SUM`, hace falta `GROUP BY` sobre las columnas que se muestran

---

## 3) Total de ventas por categoría

```sql
SELECT
    ca.CategoryName,
    SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS ventas_totales
FROM Categories AS ca
INNER JOIN Products AS p ON p.CategoryID = ca.CategoryID
INNER JOIN `Order Details` AS od ON od.ProductID = p.ProductID
GROUP BY ca.CategoryID, ca.CategoryName;
```

Explicación breve:
- se agrupa por categoría
- se suma el total de ventas de todos los productos de esa categoría

---

## 4) Vista de empleados con más ventas por año

Esto es más avanzado y no suele entrar tan literal en un parcial, pero la idea es:

```sql
CREATE VIEW employeeOfTheYear AS
SELECT
    e.EmployeeID,
    e.FirstName,
    e.LastName,
    YEAR(o.OrderDate) AS anio,
    SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS total_de_ventas
FROM Employees AS e
JOIN Orders AS o ON o.EmployeeID = e.EmployeeID
JOIN `Order Details` AS od ON od.OrderID = o.OrderID
GROUP BY e.EmployeeID, e.FirstName, e.LastName, YEAR(o.OrderDate);
```

Luego se podría usar para ordenar y quedarse con el mejor por año, pero la parte clave es que una vista guarda una consulta y la muestra como si fuera una tabla.

---

## 5) Trigger para descontar stock al insertar un detalle

### Error clásico

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

Esto está mal porque `Order Details` no es una referencia válida dentro del trigger. Hay que usar `NEW`.

### Forma correcta

```sql
DELIMITER $$

CREATE TRIGGER updateStock
AFTER INSERT ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET UnitsInStock = UnitsInStock - NEW.Quantity
    WHERE ProductID = NEW.ProductID;
END$$

DELIMITER ;
```

Explicación breve:
- `NEW.Quantity` = cantidad que se acaba de ingresar
- `NEW.ProductID` = producto asociado a ese detalle
- el trigger descuenta esa cantidad del stock

---

## Regla rápida para SQL

```sql
SELECT ...
FROM ...
JOIN ...
WHERE ...
GROUP BY ...
ORDER BY ...
LIMIT ...;
```

Orden lógico habitual:
1. unir tablas
2. filtrar
3. agrupar
4. ordenar
5. limitar

---

## Columna virtual / calculada

A veces no hace falta calcular todo con `SELECT` cada vez. Se puede crear una columna calculada que se genere sola.

Ejemplo:

```sql
ALTER TABLE `Order Details`
ADD COLUMN subtotal DECIMAL(10,2)
GENERATED ALWAYS AS (UnitPrice * Quantity * (1 - Discount)) STORED;
```

Qué hace:
- toma valores numéricos de `UnitPrice`, `Quantity` y `Discount`
- calcula la expresión automáticamente
- guarda el resultado en una columna nueva

Esto sirve para no repetir la fórmula en todas las consultas.

Ejemplo de uso:

```sql
SELECT ProductID, subtotal
FROM `Order Details`;
```

---

## Resumen final

- `JOIN` se usa para relacionar tablas.
- `GROUP BY` se usa cuando hay `SUM`, `COUNT`, `AVG`, etc.
- `ORDER BY` ordena el resultado.
- `LIMIT` corta la cantidad de filas.
- En triggers, se usa `NEW` para leer los valores del registro insertado.
- Una columna calculada no es magia: es simplemente una expresión matemática que MySQL calcula sola.

Si querés, te lo dejo todavía más corto, tipo “apunte de examen”, solo con el SQL más importante y sin texto extra.
