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

Si querés, te puedo hacer ahora un archivo extra con triggers de ejemplo resueltos tipo “parcial” y con varios casos de uso. 
