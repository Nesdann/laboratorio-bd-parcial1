# Conceptos clave dentro de BEGIN...END (MySQL)

Referencia rápida de lo que podés usar dentro del cuerpo de un `PROCEDURE`, `FUNCTION` o `TRIGGER`.

## 1. DECLARE — declarar variables

Siempre va **al principio** del bloque `BEGIN...END`, antes de cualquier otra sentencia.

```sql
DECLARE nombreVariable TIPO [DEFAULT valorInicial];

DECLARE contador INT DEFAULT 0;
DECLARE nombreCliente VARCHAR(100);
DECLARE montoTotal DECIMAL(10,2) DEFAULT 0.0;
DECLARE fechaHoy DATE;
```

- Si no ponés `DEFAULT`, la variable arranca en `NULL`.
- Podés declarar varias del mismo tipo juntas: `DECLARE a, b, c INT;`

## 2. SET — asignar/actualizar un valor

```sql
SET nombreVariable = valor;

SET contador = contador + 1;
SET estado = 'confirmed';
SET fechaHoy = CURDATE();
```

## 3. SELECT ... INTO — traer un valor de una tabla a una variable

Trae **un solo valor** (una fila, una columna) desde una consulta y lo guarda en una variable.

```sql
SELECT columna INTO variable
FROM tabla
WHERE condicion;

SELECT status INTO estadoBooking
FROM bookings
WHERE id = input_booking_id;
```

⚠️ Si la consulta no devuelve ninguna fila, la variable queda en `NULL` (no tira error).
⚠️ Si devuelve más de una fila, **sí tira error**. Asegurate de que la condición devuelva máximo una fila (por ejemplo, filtrando por clave primaria).

## 4. IF / ELSEIF / ELSE — condicionales

```sql
IF condicion THEN
    -- sentencias
ELSEIF otraCondicion THEN
    -- sentencias
ELSE
    -- sentencias
END IF;
```

Ejemplo:
```sql
IF stockActual < 10 THEN
    INSERT INTO ProductRefillment (productCode, orderDate, quantity)
    VALUES (NEW.productCode, CURDATE(), 10);
ELSEIF stockActual < 50 THEN
    SET alerta = 'stock bajo';
ELSE
    SET alerta = 'stock ok';
END IF;
```

## 5. CASE — alternativa a IF para múltiples condiciones

```sql
CASE
    WHEN condicion1 THEN sentencias1;
    WHEN condicion2 THEN sentencias2;
    ELSE sentenciasDefault;
END CASE;
```

## 6. Parámetros de un PROCEDURE

```sql
CREATE PROCEDURE nombre(
    IN parametroEntrada TIPO,      -- recibe un valor
    OUT parametroSalida TIPO,      -- devuelve un valor al llamador
    INOUT parametroAmbos TIPO      -- recibe y devuelve
)
BEGIN
    ...
END $$
```

Se ejecuta con `CALL nombre(valor1, @variableSalida);`

## 7. RETURN — solo en FUNCTION (no en PROCEDURE ni TRIGGER)

```sql
CREATE FUNCTION nombre(parametro TIPO)
RETURNS TIPO
DETERMINISTIC
BEGIN
    DECLARE resultado TIPO;
    ...
    RETURN resultado;
END $$
```

## 8. NEW y OLD — solo dentro de TRIGGER

```sql
-- En INSERT y UPDATE: NEW.columna = el valor nuevo
-- En UPDATE y DELETE: OLD.columna = el valor anterior

CREATE TRIGGER nombre
AFTER INSERT ON tabla
FOR EACH ROW
BEGIN
    IF NEW.rating <= 2 THEN
        ...
    END IF;
END $$
```

## 9. Bucles (menos comunes pero existen)

```sql
-- WHILE
WHILE condicion DO
    -- sentencias
END WHILE;

-- REPEAT
REPEAT
    -- sentencias
UNTIL condicion
END REPEAT;

-- LOOP + LEAVE (para cortar)
miLoop: LOOP
    IF condicion THEN
        LEAVE miLoop;
    END IF;
END LOOP miLoop;
```

## 10. Estructura general que combina todo

```sql
DELIMITER $$

CREATE PROCEDURE ejemplo(IN p_id INT)
BEGIN
    -- 1. Declaraciones primero, siempre arriba
    DECLARE estado VARCHAR(50);
    DECLARE existe INT DEFAULT 0;

    -- 2. Traer datos con SELECT INTO
    SELECT COUNT(*) INTO existe FROM tabla WHERE id = p_id;

    -- 3. Condicional
    IF existe > 0 THEN
        SELECT status INTO estado FROM tabla WHERE id = p_id;

        -- 4. Setear / modificar
        IF estado = 'pendiente' THEN
            UPDATE tabla SET status = 'procesado' WHERE id = p_id;
        END IF;
    END IF;
END $$

DELIMITER ;
```

## Notas rápidas
- `DELIMITER $$` ... `DELIMITER ;` envuelve todo el `CREATE` para que el `;` interno no corte el bloque.
- `DROP PROCEDURE IF EXISTS nombre;` (o `FUNCTION`/`TRIGGER`) antes del `CREATE`, para poder re-ejecutar el script sin error.
- Todo `DECLARE` va antes de cualquier otra sentencia dentro del `BEGIN`.
