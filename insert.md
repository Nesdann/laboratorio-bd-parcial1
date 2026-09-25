# INSERT en MySQL

## Básico

```sql
INSERT INTO tabla (columna1, columna2, columna3)
VALUES (valor1, valor2, valor3);
```

Si la tabla tiene `AUTO_INCREMENT`, el `id` puede dejarse en `DEFAULT` o omitirse.

```sql
INSERT INTO usuarios (nombre, email)
VALUES ('Ana', 'ana@mail.com');
```

Si el campo `id` es `NOT NULL` y es autoincremental, no hace falta saber el siguiente valor. Se deja que MySQL lo genere solo.

```sql
INSERT INTO usuarios (id, nombre)
VALUES (DEFAULT, 'Ana');
```

También se puede omitir el campo si tiene valor por default o es auto_increment:

```sql
INSERT INTO usuarios (nombre)
VALUES ('Ana');
```

## Insert con varias filas

```sql
INSERT INTO usuarios (nombre, email)
VALUES
    ('Ana', 'ana@mail.com'),
    ('Luis', 'luis@mail.com');
```

## Insert con `SELECT`

```sql
INSERT INTO tabla_destino (campo1, campo2)
SELECT campo1, campo2
FROM tabla_origen
WHERE condicion;
```

## Si quiero insertar todos los campos

```sql
INSERT INTO tabla
VALUES (valor1, valor2, valor3);
```

Esto solo sirve si sabes el orden exacto de las columnas de la tabla. Mejor poner los nombres de columnas para evitar errores.

## Regla importante

```sql
INSERT INTO payments (booking_id, user_id, amount, payment_method)
VALUES (1, 2, 1500.00, 'credit_card');
```

Si la tabla tiene columnas como `id`, `payment_date`, `status`, y no las pasás, depende del schema. Si tienen default o auto_increment, pueden quedar vacías o generadas. Si no tienen default, hay que pasarlas.

## Cuando el id es `NOT NULL` y no sabes el próximo valor

```sql
INSERT INTO tabla (id, nombre)
VALUES (DEFAULT, 'Pedro');
```

`DEFAULT` significa: “dejame que MySQL ponga el siguiente valor correcto”.

No hace falta calcular el próximo id manualmente si es `AUTO_INCREMENT`.

---

## Insert dentro de trigger

```sql
DELIMITER $$

CREATE TRIGGER malaresena
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    INSERT INTO messages (sender_id, receiver_id, property_id, content)
    VALUES (NEW.user_id, 1, NEW.property_id, NEW.comment);
END$$

DELIMITER ;
```

## Insert dentro de procedimiento

```sql
DELIMITER $$

CREATE PROCEDURE process_payment(
    IN input_booking_id INT,
    IN input_user_id INT,
    IN input_amount DECIMAL(10,2),
    IN input_payment_method VARCHAR(50)
)
BEGIN
    INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_date, status)
    VALUES (input_booking_id, input_user_id, input_amount, input_payment_method, NOW(), 'completed');
END$$

DELIMITER ;
```

## Insert con variables en procedimiento

```sql
DELIMITER $$

CREATE PROCEDURE insertar_usuario(
    IN p_nombre VARCHAR(50),
    IN p_email VARCHAR(100)
)
BEGIN
    DECLARE v_estado VARCHAR(20) DEFAULT 'activo';

    INSERT INTO usuarios (nombre, email, estado)
    VALUES (p_nombre, p_email, v_estado);
END$$

DELIMITER ;
```

## Resumen corto

```sql
INSERT INTO tabla (columna1, columna2)
VALUES (valor1, valor2);

INSERT INTO tabla (id, nombre)
VALUES (DEFAULT, 'Ana');
```

- si la columna es `AUTO_INCREMENT`, no hace falta saber el valor;
- si es `DEFAULT`, se usa `DEFAULT`;
- si la columna no tiene default, hay que mandarla;
- mejor poner columnas explícitas siempre.
