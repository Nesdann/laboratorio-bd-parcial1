# Procedimientos en MySQL

## Estructura

```sql
DROP PROCEDURE IF EXISTS nombre_proc;

DELIMITER $$

CREATE PROCEDURE nombre_proc(
    IN p_id INT,
    IN p_monto DECIMAL(10,2)
)
BEGIN
    DECLARE estado VARCHAR(20) DEFAULT 'pendiente';

    SELECT status INTO estado
    FROM bookings
    WHERE id = p_id;

    IF estado = 'confirmed' THEN
        UPDATE bookings
        SET status = 'paid'
        WHERE id = p_id;
    END IF;
END$$

DELIMITER ;
```

## Variables

```sql
DECLARE v_id INT;
DECLARE v_estado VARCHAR(20) DEFAULT 'pendiente';
DECLARE v_total DECIMAL(10,2) DEFAULT 0;
```

## Darle valor

```sql
SET v_estado = 'confirmed';
SET v_total = 1500.00;
```

## Asignar valor desde `SELECT`

```sql
SELECT status INTO v_estado
FROM bookings
WHERE id = 1;
```

## Si `SELECT` no devuelve nada

```sql
-- la variable queda NULL
SELECT status INTO v_estado
FROM bookings
WHERE id = 9999;
```

Si no existe la fila, `v_estado` queda en `NULL`.

## `IF` en MySQL

```sql
IF condicion THEN
    -- código
ELSEIF otra_condicion THEN
    -- código
ELSE
    -- código
END IF;
```

Ejemplo:

```sql
IF v_total > 1000 THEN
    SET v_estado = 'vip';
ELSE
    SET v_estado = 'normal';
END IF;
```

## Dentro de `BEGIN ... END`

Se pueden poner:

```sql
BEGIN
    DECLARE v_id INT;
    SET v_id = 10;

    SELECT status INTO v_estado
    FROM bookings
    WHERE id = v_id;

    IF v_estado = 'confirmed' THEN
        INSERT INTO payments (...)
        VALUES (...);
    END IF;
END;
```

## Ejemplo completo

```sql
DROP PROCEDURE IF EXISTS process_payment;

DELIMITER $$

CREATE PROCEDURE process_payment(
    IN input_booking_id INT,
    IN input_user_id INT,
    IN input_amount DECIMAL(10,2),
    IN input_payment_method VARCHAR(50)
)
BEGIN
    DECLARE estadoBooking VARCHAR(50);

    SELECT status INTO estadoBooking
    FROM bookings
    WHERE id = input_booking_id;

    IF estadoBooking = 'confirmed' THEN
        INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_date, status)
        VALUES (input_booking_id, input_user_id, input_amount, input_payment_method, NOW(), 'completed');

        UPDATE bookings
        SET status = 'paid'
        WHERE id = input_booking_id;
    END IF;
END$$

DELIMITER ;
```

## Resumen rápido

```sql
DECLARE nombre_tipo DEFAULT valor;
SET nombre = valor;
SELECT columna INTO nombre FROM tabla WHERE ...;
IF condicion THEN
    -- bloque
END IF;
```

Esto es lo básico que aparece en procedimientos MySQL y sirve para debug y examen.

```sql
DROP PROCEDURE IF EXISTS RegisterRefillmentTransactional;

DELIMITER $$

CREATE PROCEDURE RegisterRefillmentTransactional(
    IN p_productCode VARCHAR(15),
    IN p_quantity INT
)
BEGIN
    START TRANSACTION;

    INSERT INTO ProductRefillment (
        productCode,
        orderDate,
        quantity
    )
    VALUES (
        p_productCode,
        CURDATE(),
        p_quantity
    );

    UPDATE products
    SET quantityInStock = quantityInStock + p_quantity
    WHERE productCode = p_productCode;

    COMMIT;
END$$

DELIMITER ;
```

En un procedimiento de producción conviene agregar un manejador de errores que ejecute `ROLLBACK` si alguna instrucción falla. La transacción es útil porque evita dejar registrada la reposición sin actualizar el stock, o actualizar el stock sin registrar la reposición.

---

## Buenas prácticas

- Usar nombres claros para procedimientos y parámetros.
- Anteponer un prefijo a los parámetros, por ejemplo `p_`, para distinguirlos de las columnas.
- Escribir siempre condiciones `WHERE` precisas en `UPDATE` y `DELETE`.
- Validar parámetros antes de modificar datos.
- Usar transacciones cuando varias operaciones formen una sola unidad lógica.
- Probar el procedimiento con datos existentes y con datos inválidos.
- Documentar qué tablas modifica y qué permisos necesita el usuario.
