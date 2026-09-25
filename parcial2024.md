# Parcial 2024 - Resolución correcta y ordenada

## Consignas
1. Obtener los usuarios que más gastaron en reservas.
2. Obtener las 10 propiedades con mayor ingreso total por reservas.
3. Crear un trigger para registrar reseñas negativas en la tabla de mensajes.
4. Crear un procedimiento `process_payment` para registrar pagos.

---

## 1) Usuarios que más gastaron

```sql
SELECT u.id, u.name, SUM(py.amount) AS gastado
FROM users AS u
INNER JOIN payments AS py ON py.user_id = u.id
GROUP BY u.id, u.name
ORDER BY gastado DESC;
```

Explicación breve: se agrupa por usuario, se suma el monto pagado y se ordena de mayor a menor gasto.

---

## 2) Top 10 propiedades por ingreso

```sql
SELECT p.id, p.name, SUM(py.amount) AS ganancia
FROM properties AS p
INNER JOIN bookings AS b ON b.property_id = p.id
INNER JOIN payments AS py ON py.booking_id = b.id
GROUP BY p.id, p.name
ORDER BY ganancia DESC
LIMIT 10;
```

Explicación breve: se unen propiedades, reservas y pagos; luego se suma el ingreso y se toman solo las 10 mayor ganancias.

---

## 3) Trigger para reseñas negativas

La clave del error estaba en este punto:

- `receiver_id` debe ser un usuario.
- `NEW.property_id` es un ID de propiedad, no un ID de usuario.
- Por eso hay que buscar el `owner_id` de la propiedad.

### Solución correcta

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

### ¿Por qué estaba mal?

Antes se hacía esto:

```sql
VALUES (NEW.user_id, NEW.property_id, NEW.property_id, NEW.comment);
```

Eso rompe la lógica porque el `receiver_id` debería apuntar a una persona (owner), no a una propiedad.

### Ver y eliminar trigger

```sql
SHOW CREATE TRIGGER malaresena;
```

```sql
DROP TRIGGER IF EXISTS malaresena;
```

---

## 4) Procedimiento `process_payment`

Este procedimiento debe:

- verificar que la reserva exista;
- verificar que esté en estado `confirmed`;
- insertar el pago con columnas explícitas;
- actualizar la reserva a `paid`.

### Solución correcta

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

### Error principal del procedimiento

Se estaba haciendo esto:

```sql
INSERT INTO payments
VALUES (DEFAULT, input_booking_id, input_user_id, input_amount, input_payment_method);
```

Eso falla porque la tabla tiene más columnas que las que se están pasando. La forma correcta es nombrar las columnas explícitamente.

---

## Sintaxis útil para MySQL

### Declarar variable
```sql
DECLARE nombre INT;
DECLARE estado VARCHAR(50) DEFAULT 'pendiente';
```

### Asignar valor
```sql
SET estado = 'confirmed';
```

### Asignar valor desde un `SELECT`
```sql
SELECT status INTO estado
FROM bookings
WHERE id = 1;
```

### IF
```sql
IF condicion THEN
    -- código
END IF;
```

### BEGIN ... END
```sql
BEGIN
    -- operaciones SQL
END;
```

### Transacciones
```sql
START TRANSACTION;
-- operaciones
COMMIT;
-- o
ROLLBACK;
```

---

## Resumen final

- En el trigger, el `receiver_id` debe ser el `owner_id` de la propiedad, no el ID de la propiedad.
- En el procedimiento, hay que validar el estado de la reserva y luego actualizarla a `paid`.
- Al hacer `INSERT` en una tabla, conviene escribir las columnas explícitamente para evitar errores de conteo.
- `DECLARE`, `SET` y `SELECT ... INTO` son las tres sintaxis más importantes para resolver procedimientos y triggers en MySQL.

