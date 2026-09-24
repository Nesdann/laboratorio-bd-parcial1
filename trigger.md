# Triggers en SQL

Un trigger es un bloque de código que se ejecuta automáticamente cuando ocurre un evento sobre una tabla. Los eventos más comunes son:

- `INSERT`
- `UPDATE`
- `DELETE`

Se usan para:
- validar datos
- mantener integridad
- actualizar otras tablas automáticamente
- controlar stock, logs, auditoría, etc.

---

## Estructura básica de un trigger

```sql
DELIMITER $$

CREATE TRIGGER nombre_trigger
AFTER INSERT ON tabla
FOR EACH ROW
BEGIN
    -- lógica del trigger
END $$

DELIMITER ;
```

### Partes importantes

- `CREATE TRIGGER nombre_trigger`: nombre del trigger
- `AFTER INSERT ON tabla`: cuándo se dispara y sobre qué tabla
- `FOR EACH ROW`: se ejecuta por cada fila afectada
- `BEGIN ... END`: bloque principal

---

## Cuándo se dispara

### 1. AFTER INSERT
Se ejecuta después de hacer un insert.

```sql
CREATE TRIGGER ejemplo_after_insert
AFTER INSERT ON Customers
FOR EACH ROW
BEGIN
    SELECT 'Se insertó un cliente';
END;
```

### 2. AFTER UPDATE
Se ejecuta después de actualizar una fila.

```sql
CREATE TRIGGER ejemplo_after_update
AFTER UPDATE ON Products
FOR EACH ROW
BEGIN
    -- lógica
END;
```

### 3. AFTER DELETE
Se ejecuta después de borrar una fila.

```sql
CREATE TRIGGER ejemplo_after_delete
AFTER DELETE ON Orders
FOR EACH ROW
BEGIN
    -- lógica
END;
```

---

## ¿Qué son NEW y OLD?

En MySQL, dentro de un trigger, se usan `NEW` y `OLD` para acceder a los valores de la fila afectada.

### `NEW`
Representa el valor nuevo de una fila.

- en un `INSERT`, `NEW` tiene los valores que se insertan
- en un `UPDATE`, `NEW` tiene los valores nuevos

### `OLD`
Representa el valor anterior de una fila.

- en un `UPDATE`, `OLD` tiene los valores viejos
- en un `DELETE`, `OLD` tiene la fila que se elimina

### Ejemplo con `NEW`

```sql
CREATE TRIGGER trg_insert_cliente
AFTER INSERT ON Customers
FOR EACH ROW
BEGIN
    INSERT INTO auditoria (mensaje)
    VALUES (CONCAT('Se insertó el cliente: ', NEW.CustomerID));
END;
```

### Ejemplo con `OLD`

```sql
CREATE TRIGGER trg_delete_cliente
AFTER DELETE ON Customers
FOR EACH ROW
BEGIN
    INSERT INTO auditoria (mensaje)
    VALUES (CONCAT('Se eliminó el cliente: ', OLD.CustomerID));
END;
```

### Ejemplo con `OLD` y `NEW` en `UPDATE`

```sql
CREATE TRIGGER trg_update_precio
AFTER UPDATE ON Products
FOR EACH ROW
BEGIN
    INSERT INTO auditoria (mensaje)
    VALUES (
        CONCAT(
            'Antes: ', OLD.UnitPrice,
            ' - Ahora: ', NEW.UnitPrice
        )
    );
END;
```

---

## Trigger con `UPDATE`

Cuando el trigger hace un `UPDATE`, normalmente se usa `SET` para cambiar valores de otra tabla o de la misma tabla.

### Esquema general

```sql
DELIMITER $$

CREATE TRIGGER nombre_trigger
AFTER UPDATE ON tabla_origen
FOR EACH ROW
BEGIN
    UPDATE tabla_destino
    SET campo = valor
    WHERE condicion;
END $$

DELIMITER ;
```

### Ejemplo 1: actualizar stock al modificar una cantidad

```sql
DELIMITER $$

CREATE TRIGGER update_stock_on_update
AFTER UPDATE ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET UnitsInStock = UnitsInStock - (NEW.Quantity - OLD.Quantity)
    WHERE ProductID = NEW.ProductID;
END $$

DELIMITER ;
```

### ¿Qué hace?
- si la cantidad vendida cambió
- calcula la diferencia: `NEW.Quantity - OLD.Quantity`
- ajusta el stock en consecuencia

---

## Trigger con `INSERT`

### Esquema general

```sql
DELIMITER $$

CREATE TRIGGER nombre_trigger
AFTER INSERT ON tabla
FOR EACH ROW
BEGIN
    UPDATE otra_tabla
    SET campo = campo - NEW.campo_cantidad
    WHERE id = NEW.id_relacionado;
END $$

DELIMITER ;
```

### Ejemplo 2: descontar stock al insertar detalle de pedido

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

### Qué hace
- cada vez que se inserta un detalle de pedido
- toma la cantidad nueva (`NEW.Quantity`)
- resta esa cantidad al stock del producto

---

## Trigger con `DELETE`

### Esquema general

```sql
DELIMITER $$

CREATE TRIGGER nombre_trigger
AFTER DELETE ON tabla
FOR EACH ROW
BEGIN
    UPDATE otra_tabla
    SET campo = campo + OLD.cantidad
    WHERE id = OLD.id_relacionado;
END $$

DELIMITER ;
```

### Ejemplo 3: devolver stock al borrar un detalle

```sql
DELIMITER $$

CREATE TRIGGER restore_stock_after_delete
AFTER DELETE ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET UnitsInStock = UnitsInStock + OLD.Quantity
    WHERE ProductID = OLD.ProductID;
END $$

DELIMITER ;
```

### Qué hace
- si se borra una fila de detalle
- vuelve a sumar la cantidad eliminada al stock

---

## Ejemplo resumen sencillo

```sql
DELIMITER $$

CREATE TRIGGER trg_update_producto
AFTER UPDATE ON Products
FOR EACH ROW
BEGIN
    UPDATE auditoria
    SET ultimo_cambio = NOW()
    WHERE producto_id = NEW.ProductID;
END $$

DELIMITER ;
```

### Explicación
- se dispara después de actualizar `Products`
- usa `NEW.ProductID` para saber qué producto fue modificado
- actualiza otra tabla llamada `auditoria`

---

## Esquema para estudiar

```sql
DELIMITER $$

CREATE TRIGGER nombre_trigger
AFTER INSERT ON tabla
FOR EACH ROW
BEGIN
    UPDATE tabla2
    SET campo = campo - NEW.campo_cantidad
    WHERE id = NEW.id_relacionado;
END $$

DELIMITER ;
```

### Regla rápida:
- `INSERT` -> usa `NEW`
- `UPDATE` -> usa `NEW` y `OLD`
- `DELETE` -> usa `OLD`

---

## Puntos clave para parcial

- `NEW` = valor nuevo
- `OLD` = valor anterior
- `SET` se usa dentro del `UPDATE`
- `WHERE` siempre condiciona la fila que se va a modificar
- los triggers sirven para automatizar procesos
- hay que indicar bien la tabla sobre la cual se dispara el trigger

---

## Resumen corto

```sql
CREATE TRIGGER trg_ejemplo
AFTER UPDATE ON tabla
FOR EACH ROW
BEGIN
    UPDATE otra_tabla
    SET campo = campo + (NEW.valor - OLD.valor)
    WHERE id = NEW.id;
END;
```

Esto significa:
- cuando se actualiza una fila de `tabla`
- se mira el valor viejo y el nuevo
- se hace un cálculo
- se actualiza otra tabla

---

## Consejo final

Para escribir trigger en un parcial, conviene seguir esta secuencia:

1. pensar qué evento ocurre: `INSERT`, `UPDATE` o `DELETE`
2. ver si se usa `NEW` o `OLD`
3. decidir qué tabla se va a actualizar
4. escribir `UPDATE ... SET ... WHERE ...`
5. verificar la lógica del cálculo

---

## Funcionalidades extra

Además de hacer `UPDATE`, un trigger puede usar condicionales, variables y validaciones.

### `IF`, `ELSEIF` y `ELSE`

La estructura general es:

```sql
IF condicion THEN
    instrucciones;
ELSEIF otra_condicion THEN
    instrucciones;
ELSE
    instrucciones;
END IF;
```

### Ejemplo con `IF`

```sql
DELIMITER $$

CREATE TRIGGER check_stock
AFTER INSERT ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET UnitsInStock = UnitsInStock - NEW.Quantity
    WHERE ProductID = NEW.ProductID;

    IF NEW.Quantity > 10 THEN
        INSERT INTO audit_log (message)
        VALUES ('Se realizó una venta grande');
    END IF;
END $$

DELIMITER ;
```

### Ejemplo con `IF`, `ELSEIF` y `ELSE`

```sql
DELIMITER $$

CREATE TRIGGER classify_order_detail
AFTER INSERT ON `Order Details`
FOR EACH ROW
BEGIN
    IF NEW.Quantity >= 20 THEN
        INSERT INTO audit_log (message)
        VALUES ('Venta muy grande');
    ELSEIF NEW.Quantity >= 10 THEN
        INSERT INTO audit_log (message)
        VALUES ('Venta mediana');
    ELSE
        INSERT INTO audit_log (message)
        VALUES ('Venta pequeña');
    END IF;
END $$

DELIMITER ;
```

### Variables dentro de un trigger

Se declaran al principio del bloque `BEGIN`, antes de las demás instrucciones.

```sql
DELIMITER $$

CREATE TRIGGER calculate_discount
BEFORE INSERT ON Orders
FOR EACH ROW
BEGIN
    DECLARE total_order DECIMAL(10, 2);

    SET total_order = NEW.Freight + NEW.ShipVia;

    IF total_order > 100 THEN
        SET NEW.Freight = 0;
    END IF;
END $$

DELIMITER ;
```

### Reglas para variables

```sql
DECLARE nombre_variable tipo;
SET nombre_variable = valor;
```

La declaración debe estar antes de cualquier `SELECT`, `UPDATE`, `INSERT` o `IF` dentro del trigger.

### Validar con `BEFORE`

Un trigger `BEFORE` se ejecuta antes de guardar el cambio. Sirve para validar o modificar los valores nuevos.

```sql
DELIMITER $$

CREATE TRIGGER validate_product_price
BEFORE INSERT ON Products
FOR EACH ROW
BEGIN
    IF NEW.UnitPrice < 0 THEN
        SET NEW.UnitPrice = 0;
    END IF;
END $$

DELIMITER ;
```

En este ejemplo, si el precio llega negativo, se transforma en `0` antes de insertar el producto.

### Rechazar una operación con `SIGNAL`

`SIGNAL` permite detener la operación y devolver un error.

```sql
DELIMITER $$

CREATE TRIGGER reject_negative_stock
BEFORE UPDATE ON Products
FOR EACH ROW
BEGIN
    IF NEW.UnitsInStock < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El stock no puede ser negativo';
    END IF;
END $$

DELIMITER ;
```

### Trigger para controlar stock antes de descontar

```sql
DELIMITER $$

CREATE TRIGGER validate_order_stock
BEFORE INSERT ON `Order Details`
FOR EACH ROW
BEGIN
    DECLARE current_stock INT;

    SELECT UnitsInStock
    INTO current_stock
    FROM Products
    WHERE ProductID = NEW.ProductID;

    IF current_stock < NEW.Quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No hay stock suficiente';
    END IF;
END $$

DELIMITER ;
```

### Ejemplo: insertar un pedido y descontar una unidad si hay stock

Supongamos que se inserta un nuevo registro en `Orders` y se quiere descontar una unidad del producto correspondiente. Antes de hacer el descuento, se verifica que el stock sea mayor que cero.

```sql
DELIMITER $$

CREATE TRIGGER decrease_product_stock
AFTER INSERT ON Orders
FOR EACH ROW
BEGIN
    IF NEW.ProductID IS NOT NULL THEN
        UPDATE Products
        SET UnitsInStock = UnitsInStock - 1
        WHERE ProductID = NEW.ProductID
          AND UnitsInStock > 0;
    END IF;
END $$

DELIMITER ;
```

### Cómo funciona

- `AFTER INSERT ON Orders`: se ejecuta después de insertar un pedido.
- `NEW.ProductID`: identifica el producto del registro nuevo.
- `SET UnitsInStock = UnitsInStock - 1`: descuenta una unidad.
- `AND UnitsInStock > 0`: evita descontar si el stock ya es cero.
- `IF NEW.ProductID IS NOT NULL`: evita intentar actualizar sin producto.

### Variante recomendada para Northwind

En Northwind, normalmente `Orders` no tiene `ProductID` directamente. El producto está en `Order Details`, por lo que el trigger debe dispararse sobre esa tabla:

```sql
DELIMITER $$

CREATE TRIGGER decrease_product_stock
AFTER INSERT ON `Order Details`
FOR EACH ROW
BEGIN
    UPDATE Products
    SET UnitsInStock = UnitsInStock - NEW.Quantity
    WHERE ProductID = NEW.ProductID
      AND UnitsInStock >= NEW.Quantity;
END $$

DELIMITER ;
```

En esta variante, el stock solo se descuenta si alcanza para toda la cantidad solicitada. Por ejemplo, si `NEW.Quantity` es `3`, el producto debe tener al menos 3 unidades.

### Variante que muestra un error si no hay stock

Si se quiere impedir que el detalle se inserte cuando no hay stock suficiente, conviene usar un trigger `BEFORE INSERT`:

```sql
DELIMITER $$

CREATE TRIGGER validate_product_stock
BEFORE INSERT ON `Order Details`
FOR EACH ROW
BEGIN
    DECLARE available_stock INT;

    SELECT UnitsInStock
    INTO available_stock
    FROM Products
    WHERE ProductID = NEW.ProductID;

    IF available_stock IS NULL OR available_stock < NEW.Quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No hay stock suficiente';
    END IF;
END $$

DELIMITER ;
```

Este último trigger valida antes de insertar. Si hay stock suficiente, permite la inserción; si no, cancela la operación con un error.

### `SELECT ... INTO`

Permite guardar el resultado de una consulta en una variable:

```sql
DECLARE variable INT;

SELECT columna
INTO variable
FROM tabla
WHERE id = valor;
```

### Comparar `OLD` y `NEW`

Es útil para ejecutar una acción solo cuando un valor realmente cambia.

```sql
DELIMITER $$

CREATE TRIGGER log_price_change
AFTER UPDATE ON Products
FOR EACH ROW
BEGIN
    IF OLD.UnitPrice <> NEW.UnitPrice THEN
        INSERT INTO audit_log (message)
        VALUES ('El precio del producto cambió');
    END IF;
END $$

DELIMITER ;
```

### Tabla de auditoría para ejemplos

Si se quiere guardar un historial de cambios, primero se puede crear una tabla como esta:

```sql
CREATE TABLE audit_log (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    message VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Resumen de `BEFORE` y `AFTER`

```text
BEFORE -> validar o modificar NEW antes de guardar
AFTER  -> ejecutar acciones después de guardar
```

### Resumen de las funcionalidades

```text
IF / ELSEIF / ELSE -> tomar decisiones
DECLARE             -> crear variables locales
SET                 -> asignar valores
SELECT ... INTO     -> guardar resultados en variables
SIGNAL              -> detener la operación con un error
NEW                 -> valor nuevo
OLD                 -> valor anterior
BEFORE              -> antes de la operación
AFTER               -> después de la operación
```

### Esqueleto completo para estudiar

```sql
DELIMITER $$

CREATE TRIGGER nombre_trigger
BEFORE INSERT ON tabla
FOR EACH ROW
BEGIN
    DECLARE valor_actual INT;

    SELECT columna
    INTO valor_actual
    FROM otra_tabla
    WHERE id = NEW.id;

    IF valor_actual < NEW.cantidad THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se puede realizar la operación';
    ELSE
        UPDATE otra_tabla
        SET columna = columna - NEW.cantidad
        WHERE id = NEW.id;
    END IF;
END $$

DELIMITER ;
```
