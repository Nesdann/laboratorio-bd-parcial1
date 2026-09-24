# UPDATE en SQL

## ¿Qué hace `UPDATE`?

`UPDATE` se usa para modificar datos que ya existen en una tabla.

Por ejemplo, sirve para:

- cambiar el nombre de un cliente
- actualizar un precio
- aumentar o disminuir stock
- marcar clientes como premium
- cambiar el estado de un registro

---

## Estructura básica

```sql
UPDATE tabla
SET columna = nuevo_valor
WHERE condicion;
```

### Partes de la consulta

```text
UPDATE -> tabla que quiero modificar
SET    -> columna y nuevo valor
WHERE  -> filas específicas que quiero modificar
```

---

## Ejemplo simple

```sql
UPDATE Products
SET UnitsInStock = 20
WHERE ProductID = 5;
```

Esta consulta:

1. modifica la tabla `Products`
2. cambia la columna `UnitsInStock`
3. establece el stock en `20`
4. modifica únicamente el producto cuyo `ProductID` es `5`

---

## ¿Qué es `SET`?

`SET` indica qué columna se modifica y qué valor recibirá.

```sql
UPDATE Products
SET UnitPrice = 25.50
WHERE ProductID = 3;
```

El precio del producto 3 pasa a ser `25.50`.

---

## ¿Qué es `WHERE`?

`WHERE` selecciona las filas que se van a modificar.

```sql
UPDATE Customers
SET Phone = '555-1234'
WHERE CustomerID = 10;
```

Solo se modifica el teléfono del cliente 10.

---

## Cuidado: `UPDATE` sin `WHERE`

```sql
UPDATE Products
SET UnitsInStock = 0;
```

Esta consulta modifica el stock de **todos los productos**.

Por eso, antes de ejecutar un `UPDATE`, conviene probar primero la condición con un `SELECT`:

```sql
SELECT *
FROM Products
WHERE ProductID = 5;
```

Si el `SELECT` devuelve las filas correctas, se puede ejecutar el `UPDATE`.

---

## Aumentar o disminuir un valor

No hace falta conocer el valor actual. Se puede usar la misma columna dentro de `SET`.

### Disminuir stock

```sql
UPDATE Products
SET UnitsInStock = UnitsInStock - 3
WHERE ProductID = 5;
```

### Aumentar stock

```sql
UPDATE Products
SET UnitsInStock = UnitsInStock + 10
WHERE ProductID = 5;
```

### Aumentar un precio un 10%

```sql
UPDATE Products
SET UnitPrice = UnitPrice * 1.10
WHERE CategoryID = 2;
```

---

## Modificar varias columnas

Se pueden modificar varias columnas dentro del mismo `SET`. Las asignaciones se separan con comas.

```sql
UPDATE Customers
SET ContactName = 'Ana Perez',
    Phone = '555-1234',
    City = 'Cordoba'
WHERE CustomerID = 10;
```

No se coloca una coma después de la última columna.

---

## Usar varias condiciones

```sql
UPDATE Products
SET UnitsInStock = 0
WHERE CategoryID = 2
  AND UnitsInStock < 5;
```

Solo actualiza productos de la categoría 2 cuyo stock sea menor a 5.

También se puede usar `OR`:

```sql
UPDATE Customers
SET City = 'Buenos Aires'
WHERE Country = 'Argentina'
   OR Country = 'Uruguay';
```

---

## `UPDATE` con valores de otra columna

```sql
UPDATE Products
SET ReorderLevel = UnitsInStock
WHERE ProductID = 5;
```

La columna `ReorderLevel` recibe el valor actual de `UnitsInStock`.

---

## `UPDATE` con `JOIN`

En MySQL se puede modificar una tabla usando datos de otra tabla.

```sql
UPDATE Customers c
JOIN (
    SELECT
        o.CustomerID,
        SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS total_gastado
    FROM Orders o
    JOIN `Order Details` od
        ON od.OrderID = o.OrderID
    GROUP BY o.CustomerID
) resumen
    ON resumen.CustomerID = c.CustomerID
SET c.premium_customer = 'T'
WHERE resumen.total_gastado > 10000;
```

### ¿Qué hace?

1. calcula cuánto gastó cada cliente
2. relaciona ese resultado con `Customers`
3. marca como premium a los clientes que gastaron más de 10000

---

## `UPDATE` dentro de un trigger

Un trigger puede ejecutar automáticamente un `UPDATE` cuando ocurre un evento.

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

### Explicación

- se inserta una fila en `Order Details`
- el trigger se ejecuta automáticamente
- `NEW.Quantity` es la cantidad recién insertada
- `NEW.ProductID` indica qué producto se vendió
- el `UPDATE` descuenta esa cantidad del stock

---

## `UPDATE` dentro de un trigger de actualización

```sql
DELIMITER $$

CREATE TRIGGER adjust_stock
AFTER UPDATE ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET UnitsInStock = UnitsInStock - (NEW.Quantity - OLD.Quantity)
    WHERE ProductID = NEW.ProductID;
END $$

DELIMITER ;
```

### ¿Por qué se usan `NEW` y `OLD`?

Si la cantidad anterior era 2 y la nueva cantidad es 5:

```text
NEW.Quantity - OLD.Quantity = 5 - 2 = 3
```

Entonces el stock se descuenta en 3 unidades adicionales.

---

## `UPDATE` usando una subconsulta

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

## `UPDATE` con `CASE`

`CASE` permite asignar valores diferentes según una condición.

```sql
UPDATE Products
SET UnitsInStock = CASE
    WHEN UnitsInStock < 5 THEN 0
    WHEN UnitsInStock < 10 THEN 5
    ELSE UnitsInStock
END;
```

### ¿Qué hace?

- si el stock es menor a 5, lo deja en 0
- si el stock es menor a 10, lo deja en 5
- en los demás casos, conserva el valor actual

---

## Valores de texto y números

### Texto

Los valores de texto se escriben entre comillas simples:

```sql
UPDATE Customers
SET City = 'Rosario'
WHERE CustomerID = 4;
```

### Números

Los números no llevan comillas:

```sql
UPDATE Products
SET UnitsInStock = 15
WHERE ProductID = 4;
```

### `NULL`

Para establecer un valor nulo:

```sql
UPDATE Employees
SET Region = NULL
WHERE EmployeeID = 3;
```

Para buscar valores nulos se usa `IS NULL`, no `= NULL`:

```sql
UPDATE Employees
SET Region = 'N/A'
WHERE Region IS NULL;
```

---

## Errores comunes

### Error 1: olvidar `WHERE`

```sql
UPDATE Products
SET UnitPrice = 10;
```

Modifica todos los productos.

### Error 2: usar `==`

Incorrecto:

```sql
UPDATE Products
SET UnitsInStock == 10
WHERE ProductID = 1;
```

Correcto:

```sql
UPDATE Products
SET UnitsInStock = 10
WHERE ProductID = 1;
```

### Error 3: separar asignaciones con `AND`

Incorrecto:

```sql
UPDATE Customers
SET City = 'Cordoba' AND Phone = '555-1234'
WHERE CustomerID = 1;
```

Correcto:

```sql
UPDATE Customers
SET City = 'Cordoba',
    Phone = '555-1234'
WHERE CustomerID = 1;
```

### Error 4: poner coma al final de `SET`

Incorrecto:

```sql
UPDATE Products
SET UnitPrice = 20,
WHERE ProductID = 1;
```

Correcto:

```sql
UPDATE Products
SET UnitPrice = 20
WHERE ProductID = 1;
```

---

## Modelo para memorizar

```sql
UPDATE tabla
SET columna = nuevo_valor
WHERE condicion;
```

### Con varias columnas

```sql
UPDATE tabla
SET columna1 = valor1,
    columna2 = valor2
WHERE condicion;
```

### Con cálculo

```sql
UPDATE tabla
SET columna = columna + cantidad
WHERE condicion;
```

### Con trigger

```sql
UPDATE tabla_destino
SET columna = columna - NEW.cantidad
WHERE id = NEW.id;
```

---

## Checklist antes de ejecutar

- [ ] ¿Elegí la tabla correcta?
- [ ] ¿Escribí `SET`?
- [ ] ¿Indiqué la columna que cambia?
- [ ] ¿El nuevo valor tiene el tipo correcto?
- [ ] ¿Puse `WHERE`?
- [ ] ¿La condición selecciona las filas correctas?
- [ ] ¿Probé antes con un `SELECT`?
- [ ] ¿Usé comillas para texto?
- [ ] ¿Separé varias columnas con comas?

---

## Resumen final

```text
UPDATE modifica registros existentes.
SET indica el nuevo valor.
WHERE limita las filas modificadas.
```

La forma más importante para recordar es:

```sql
UPDATE tabla
SET columna = nuevo_valor
WHERE condicion;
```
