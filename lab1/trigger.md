# Triggers en MySQL

## Estructura

```sql
DELIMITER $$

CREATE TRIGGER nombre_trigger
AFTER INSERT ON tabla
FOR EACH ROW
BEGIN
    -- código
END$$

DELIMITER ;
```

## `NEW` y `OLD`

```sql
AFTER INSERT: NEW
AFTER UPDATE: NEW y OLD
AFTER DELETE: OLD
```

Ejemplo:

```sql
CREATE TRIGGER trg_reviews
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    INSERT INTO auditoria (mensaje)
    VALUES (CONCAT('Nueva review: ', NEW.comment));
END;
```

## Ver un trigger

```sql
SHOW CREATE TRIGGER nombre_trigger;
```

```sql
SHOW TRIGGERS;
```

## Eliminar un trigger

```sql
DROP TRIGGER IF EXISTS nombre_trigger;
```

## Trigger de ejemplo: reseña negativa

```sql
DELIMITER $$

CREATE TRIGGER malaresena
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    DECLARE ownerId INT;

    IF NEW.rating <= 2 THEN
        SELECT owner_id INTO ownerId
        FROM properties
        WHERE id = NEW.property_id;

        INSERT INTO messages (sender_id, receiver_id, property_id, content)
        VALUES (NEW.user_id, ownerId, NEW.property_id, NEW.comment);
    END IF;
END$$

DELIMITER ;
```

## Importante

- `receiver_id` debe ser un usuario.
- `NEW.property_id` no sirve como `receiver_id`.
- Hay que buscar el `owner_id` de esa propiedad.

## Error clásico

```sql
INSERT INTO messages (sender_id, receiver_id, property_id, content)
VALUES (NEW.user_id, NEW.property_id, NEW.property_id, NEW.comment);
```

Esto está mal porque `receiver_id` espera un usuario, no un ID de propiedad.

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
