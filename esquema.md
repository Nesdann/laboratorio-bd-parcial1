# Esquema general de SQL para el parcial

Este archivo funciona como formulario de consulta rápida. Las partes entre `< >` se reemplazan por los nombres reales de las tablas, columnas o condiciones del ejercicio.

---

## 1. `UPDATE` y `SET`

### ¿Qué hace `UPDATE`?

`UPDATE` modifica registros que ya existen en una tabla.

La estructura básica es:

```sql
UPDATE tabla
SET columna = nuevo_valor
WHERE condicion;
```

- `UPDATE tabla`: indica qué tabla se modifica.
- `SET`: indica qué columna cambia y cuál será su nuevo valor.
- `WHERE`: indica qué filas se modifican.

### Ejemplo simple

```sql
UPDATE Products
SET UnitsInStock = 20
WHERE ProductID = 5;
```

Cambia el stock del producto con `ProductID = 5` a `20`.

### Muy importante: usar `WHERE`

```sql
UPDATE Products
SET UnitsInStock = 20;
```

Esta consulta modifica el stock de **todos** los productos. Si solo se quiere modificar uno o algunos, hay que usar `WHERE`.

### Aumentar o disminuir un valor

```sql
UPDATE Products
SET UnitsInStock = UnitsInStock - 3
WHERE ProductID = 5;
```

```sql
UPDATE Products
SET UnitPrice = UnitPrice * 1.10
WHERE CategoryID = 2;
```

En estos casos, el nuevo valor se calcula usando el valor actual.

### Modificar varias columnas

```sql
UPDATE Customers
SET ContactName = 'Ana Perez',
    Phone = '555-1234'
WHERE CustomerID = 10;
```

Cada asignación del `SET` se separa con una coma.

### `UPDATE` con una condición adicional

```sql
UPDATE Products
SET UnitsInStock = 0
WHERE UnitsInStock < 5;
```

### `UPDATE` usando otra tabla

En MySQL se puede actualizar una tabla usando un `JOIN`:

```sql
UPDATE Customers c
JOIN (
    SELECT
        CustomerID,
        SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS total_gastado
    FROM Orders o
    JOIN `Order Details` od ON od.OrderID = o.OrderID
    GROUP BY CustomerID
) resumen ON resumen.CustomerID = c.CustomerID
SET c.premium_customer = 'T'
WHERE resumen.total_gastado > 10000;
```

### Modelo mental de `UPDATE`

```text
UPDATE  -> qué tabla modifico
SET     -> qué columna cambia y con qué valor
WHERE   -> qué filas modifico
```

---

## 2. `SELECT` básico

```sql
SELECT
    columna1,
    columna2
FROM tabla
WHERE condicion
ORDER BY columna1 DESC
LIMIT 10;
```

### Todos los campos

```sql
SELECT *
FROM tabla;
```

### Alias para nombres más claros

```sql
SELECT
    columna AS nombre_resultado
FROM tabla;
```

---

## 3. Filtros con `WHERE`

```sql
SELECT *
FROM tabla
WHERE columna = 'valor';
```

```sql
SELECT *
FROM tabla
WHERE columna > 100;
```

```sql
SELECT *
FROM tabla
WHERE columna BETWEEN 10 AND 50;
```

```sql
SELECT *
FROM tabla
WHERE columna IN ('A', 'B', 'C');
```

```sql
SELECT *
FROM tabla
WHERE columna IS NULL;
```

```sql
SELECT *
FROM tabla
WHERE columna IS NOT NULL;
```

### Combinar condiciones

```sql
SELECT *
FROM tabla
WHERE condicion1
  AND condicion2;
```

```sql
SELECT *
FROM tabla
WHERE condicion1
   OR condicion2;
```

---

## 4. `JOIN`

### `INNER JOIN`

Devuelve solamente los registros que tienen coincidencia en ambas tablas.

```sql
SELECT
    t1.columna,
    t2.columna
FROM tabla1 t1
INNER JOIN tabla2 t2
    ON t2.id = t1.id_tabla2;
```

### `LEFT JOIN`

Devuelve todos los registros de la tabla izquierda, aunque no tengan coincidencia.

```sql
SELECT
    t1.columna,
    t2.columna
FROM tabla1 t1
LEFT JOIN tabla2 t2
    ON t2.id = t1.id_tabla2;
```

### Ejemplo con Northwind

```sql
SELECT
    c.CompanyName,
    o.OrderID
FROM Customers c
JOIN Orders o
    ON o.CustomerID = c.CustomerID;
```

### Tres tablas relacionadas

```sql
SELECT
    c.CompanyName,
    p.ProductName,
    od.Quantity
FROM Customers c
JOIN Orders o
    ON o.CustomerID = c.CustomerID
JOIN `Order Details` od
    ON od.OrderID = o.OrderID
JOIN Products p
    ON p.ProductID = od.ProductID;
```

---

## 5. Funciones agregadas

Las funciones agregadas calculan un resultado sobre varias filas:

- `COUNT`: cuenta registros
- `SUM`: suma valores
- `AVG`: calcula promedio
- `MIN`: obtiene el mínimo
- `MAX`: obtiene el máximo

```sql
SELECT COUNT(*) AS cantidad
FROM tabla;
```

```sql
SELECT SUM(columna) AS total
FROM tabla;
```

```sql
SELECT AVG(columna) AS promedio
FROM tabla;
```

```sql
SELECT MIN(columna) AS minimo,
       MAX(columna) AS maximo
FROM tabla;
```

---

## 6. `GROUP BY`

Se usa para agrupar filas y calcular un resultado por grupo.

```sql
SELECT
    categoria,
    SUM(importe) AS total
FROM ventas
GROUP BY categoria;
```

### Regla importante
Toda columna del `SELECT` que no esté dentro de una función agregada normalmente debe aparecer en el `GROUP BY`.

### Ejemplo

```sql
SELECT
    c.CategoryName,
    SUM(od.UnitPrice * od.Quantity) AS ventas_totales
FROM Categories c
JOIN Products p
    ON p.CategoryID = c.CategoryID
JOIN `Order Details` od
    ON od.ProductID = p.ProductID
GROUP BY c.CategoryID, c.CategoryName;
```

---

## 7. `HAVING`

`HAVING` filtra grupos después del `GROUP BY`.

```sql
SELECT
    CustomerID,
    SUM(Amount) AS total
FROM Payments
GROUP BY CustomerID
HAVING SUM(Amount) > 1000;
```

### Diferencia entre `WHERE` y `HAVING`

```text
WHERE  -> filtra filas antes de agrupar
HAVING -> filtra grupos después de agrupar
```

---

## 8. `ORDER BY` y `LIMIT`

```sql
SELECT
    nombre,
    total
FROM tabla
ORDER BY total DESC;
```

- `ASC`: menor a mayor o A-Z
- `DESC`: mayor a menor o Z-A

```sql
SELECT *
FROM tabla
ORDER BY columna DESC
LIMIT 5;
```

Este molde sirve para obtener un `TOP 5`, `TOP 10`, etc.

---

## 9. Cálculos con descuentos

Para calcular el importe final de una línea con descuento:

```sql
UnitPrice * Quantity * (1 - Discount)
```

Consulta completa:

```sql
SELECT
    od.OrderID,
    od.ProductID,
    od.UnitPrice * od.Quantity * (1 - od.Discount) AS total_linea
FROM `Order Details` od;
```

Si el descuento está guardado como porcentaje entero, por ejemplo `10` para 10%, usar:

```sql
UnitPrice * Quantity * (1 - Discount / 100)
```

---

## 10. Subconsulta

### Subconsulta en `WHERE`

```sql
SELECT *
FROM tabla
WHERE id IN (
    SELECT id
    FROM otra_tabla
    WHERE condicion
);
```

### Subconsulta en `FROM`

```sql
SELECT
    resumen.nombre,
    resumen.total
FROM (
    SELECT
        nombre,
        SUM(importe) AS total
    FROM ventas
    GROUP BY nombre
) resumen
ORDER BY resumen.total DESC;
```

### Subconsulta para comparar con un máximo

```sql
SELECT *
FROM ventas
WHERE importe = (
    SELECT MAX(importe)
    FROM ventas
);
```

---

## 11. `WITH` o CTE

Una CTE es una consulta temporal con nombre. Sirve para dividir una consulta larga en pasos.

```sql
WITH resumen AS (
    SELECT
        CustomerID,
        SUM(importe) AS total
    FROM ventas
    GROUP BY CustomerID
)
SELECT
    CustomerID,
    total
FROM resumen
ORDER BY total DESC;
```

### Molde para un `TOP N`

```sql
WITH totales AS (
    SELECT
        id,
        SUM(cantidad) AS total
    FROM tabla
    GROUP BY id
)
SELECT
    id,
    total
FROM totales
ORDER BY total DESC
LIMIT 5;
```

### Dos CTEs

```sql
WITH primer_resumen AS (
    SELECT ...
),
segundo_resumen AS (
    SELECT ...
    FROM primer_resumen
)
SELECT ...
FROM segundo_resumen;
```

---

## 12. Fechas

```sql
SELECT YEAR(fecha) AS anio,
       MONTH(fecha) AS mes
FROM tabla;
```

```sql
SELECT MONTHNAME(fecha) AS nombre_mes,
       AVG(importe) AS promedio
FROM pagos
GROUP BY YEAR(fecha), MONTH(fecha), MONTHNAME(fecha)
ORDER BY YEAR(fecha), MONTH(fecha);
```

```sql
SELECT MIN(fecha) AS primera_fecha,
       MAX(fecha) AS ultima_fecha
FROM tabla;
```

```sql
SELECT DATEDIFF(fecha_final, fecha_inicial) AS dias
FROM tabla;
```

---

## 13. `INSERT`

### Insertar valores

```sql
INSERT INTO tabla (columna1, columna2)
VALUES ('valor1', 'valor2');
```

### Insertar usando un `SELECT`

```sql
INSERT INTO tabla_destino (columna1, columna2)
SELECT
    columna1,
    columna2
FROM tabla_origen
WHERE condicion;
```

---

## 14. `ALTER TABLE`

### Agregar columna

```sql
ALTER TABLE tabla
ADD COLUMN nueva_columna INT DEFAULT 0;
```

### Agregar una columna de texto

```sql
ALTER TABLE tabla
ADD COLUMN estado CHAR(1) DEFAULT 'F';
```

### Modificar una columna

```sql
ALTER TABLE tabla
MODIFY COLUMN columna VARCHAR(100) NOT NULL;
```

---

## 15. `CREATE TABLE`

```sql
CREATE TABLE tabla_nueva (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    cantidad INT DEFAULT 0,
    importe DECIMAL(10, 2),
    otra_tabla_id INT,
    FOREIGN KEY (otra_tabla_id)
        REFERENCES otra_tabla(id)
);
```

---

## 16. `CREATE VIEW`

Una vista es una consulta guardada que se puede consultar como si fuera una tabla.

```sql
CREATE VIEW nombre_vista AS
SELECT
    columna1,
    columna2,
    SUM(columna3) AS total
FROM tabla
GROUP BY columna1, columna2;
```

### Vista usando `WITH`

```sql
CREATE VIEW ventas_por_cliente AS
WITH totales AS (
    SELECT
        c.CustomerID,
        c.CompanyName,
        SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS total_ventas
    FROM Customers c
    JOIN Orders o
        ON o.CustomerID = c.CustomerID
    JOIN `Order Details` od
        ON od.OrderID = o.OrderID
    GROUP BY c.CustomerID, c.CompanyName
)
SELECT
    CustomerID,
    CompanyName,
    total_ventas
FROM totales;
```

### Consultar una vista

```sql
SELECT *
FROM nombre_vista;
```

---

## 17. Triggers

Un trigger se ejecuta automáticamente cuando ocurre un `INSERT`, `UPDATE` o `DELETE`.

### Esqueleto general

```sql
DELIMITER $$

CREATE TRIGGER nombre_trigger
AFTER INSERT ON tabla_origen
FOR EACH ROW
BEGIN
    -- instrucciones
END $$

DELIMITER ;
```

### Trigger para descontar stock

```sql
DELIMITER $$

CREATE TRIGGER update_stock
AFTER INSERT ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET UnitsInStock = UnitsInStock - NEW.Quantity
    WHERE ProductID = NEW.ProductID;
END $$

DELIMITER ;
```

### Trigger con `UPDATE`

```sql
DELIMITER $$

CREATE TRIGGER ajustar_stock
AFTER UPDATE ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET UnitsInStock = UnitsInStock - (NEW.Quantity - OLD.Quantity)
    WHERE ProductID = NEW.ProductID;
END $$

DELIMITER ;
```

### `NEW` y `OLD`

```text
INSERT -> NEW
UPDATE -> NEW y OLD
DELETE -> OLD
```

- `NEW`: valor nuevo
- `OLD`: valor anterior

---

## 18. Procedimiento almacenado

```sql
DELIMITER $$

CREATE PROCEDURE nombre_procedimiento()
BEGIN
    SELECT
        columna1,
        SUM(columna2) AS total
    FROM tabla
    GROUP BY columna1;
END $$

DELIMITER ;
```

### Ejecutar procedimiento

```sql
CALL nombre_procedimiento();
```

### Procedimiento con `INSERT`

```sql
DELIMITER $$

CREATE PROCEDURE generar_resumen()
BEGIN
    INSERT INTO resumen (id, total)
    SELECT
        id,
        SUM(importe)
    FROM ventas
    GROUP BY id;
END $$

DELIMITER ;
```

---

## 19. Roles y permisos

Aunque roles no entre en el parcial, este es el esquema general.

```sql
CREATE ROLE nombre_rol;
```

```sql
GRANT SELECT, INSERT, UPDATE
ON base_de_datos.tabla
TO nombre_rol;
```

### Actualizar solo una columna

```sql
GRANT UPDATE (Phone)
ON Northwind.Customers
TO admin;
```

### Quitar un permiso

```sql
REVOKE DELETE
ON base_de_datos.tabla
FROM nombre_rol;
```

---

## 20. Nombres con espacios o reservados

Usar backticks:

```sql
SELECT *
FROM `Order Details`;
```

```sql
SELECT u.username
FROM `user` u;
```

---

## 21. Orden para resolver un ejercicio

Cuando te den una consigna, buscá estas palabras:

| Palabra del enunciado | SQL que probablemente necesitás |
|---|---|
| listar | `SELECT` |
| relacionar tablas | `JOIN` |
| total, suma | `SUM` |
| cantidad | `COUNT` |
| promedio | `AVG` |
| mayor o menor | `MAX` / `MIN` |
| por cada categoría | `GROUP BY` |
| los 5 primeros | `ORDER BY` + `LIMIT 5` |
| solo grupos que cumplen | `HAVING` |
| modificar datos | `UPDATE` + `SET` |
| agregar registros | `INSERT INTO` |
| automáticamente | `TRIGGER` |
| crear consulta guardada | `VIEW` |
| por pasos o consulta compleja | `WITH` |

---

## 22. Plantilla completa de consulta

```sql
WITH datos AS (
    SELECT
        t1.id,
        t1.nombre,
        SUM(t2.cantidad * t2.precio) AS total
    FROM tabla1 t1
    JOIN tabla2 t2
        ON t2.id_tabla1 = t1.id
    WHERE condicion_inicial
    GROUP BY t1.id, t1.nombre
)
SELECT
    id,
    nombre,
    total
FROM datos
WHERE total > 0
ORDER BY total DESC
LIMIT 10;
```

---

## 23. Checklist antes de entregar

- [ ] ¿Usé los nombres correctos de las tablas y columnas?
- [ ] ¿Puse `JOIN ... ON ...` correctamente?
- [ ] ¿Las columnas no agregadas aparecen en `GROUP BY`?
- [ ] ¿Usé `WHERE` para limitar un `UPDATE`?
- [ ] ¿Usé `SET` dentro de `UPDATE`?
- [ ] ¿Usé `NEW` y `OLD` correctamente en el trigger?
- [ ] ¿Puse `DELIMITER` en procedimientos y triggers?
- [ ] ¿Ordené el resultado si la consigna lo pide?
- [ ] ¿Usé `LIMIT` si pide los primeros 5 o 10?
- [ ] ¿Mostré únicamente las columnas solicitadas?
- [ ] ¿La consulta está indentada y es legible?

---

## Fórmula rápida para recordar

```text
SELECT  -> qué quiero mostrar
FROM    -> de dónde sale
JOIN    -> cómo relaciono tablas
WHERE   -> qué filas filtro
GROUP BY -> cómo agrupo
HAVING  -> qué grupos filtro
ORDER BY -> cómo ordeno
LIMIT   -> cuántos muestro
```

Para modificar:

```text
UPDATE -> tabla que modifico
SET    -> nuevo valor
WHERE  -> filas que modifico
```
