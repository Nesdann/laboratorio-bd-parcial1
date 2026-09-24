# Procedimientos almacenados en MySQL

Un procedimiento almacenado es un conjunto de instrucciones SQL guardado en el servidor. Se utiliza para encapsular un proceso completo, como actualizar datos, insertar registros o ejecutar varias operaciones en un orden determinado.

A diferencia de una función, un procedimiento no tiene que devolver un único valor y se ejecuta con `CALL`.

---

## Estructura básica

```sql
DROP PROCEDURE IF EXISTS nombreProcedimiento;

DELIMITER $$

CREATE PROCEDURE nombreProcedimiento(
    IN p_valor INT
)
BEGIN
    UPDATE algunaTabla
    SET algunCampo = p_valor
    WHERE id = 1;
END$$

DELIMITER ;
```

### Partes principales

- `DROP PROCEDURE IF EXISTS`: permite reemplazar una versión anterior.
- `CREATE PROCEDURE`: crea el procedimiento.
- `IN`: parámetro de entrada que el procedimiento puede leer.
- `OUT`: parámetro que el procedimiento puede completar y devolver.
- `INOUT`: parámetro que entra con un valor y puede salir modificado.
- `BEGIN ... END`: agrupa las instrucciones del procedimiento.
- `CALL`: ejecuta el procedimiento.
- `DELIMITER`: permite escribir varias instrucciones dentro del bloque.

---

## Procedimiento `UpdateCredit`

El siguiente procedimiento actualiza el límite de crédito de un cliente.

```sql
DROP PROCEDURE IF EXISTS UpdateCredit;

DELIMITER $$

CREATE PROCEDURE UpdateCredit(
    IN p_customerNumber INT,
    IN p_newLimit DECIMAL(10,2)
)
BEGIN
    UPDATE customers
    SET creditLimit = p_newLimit
    WHERE customerNumber = p_customerNumber;
END$$

DELIMITER ;
```

### Ejecución

```sql
CALL UpdateCredit(103, 50000.00);
```

### Verificación

```sql
SELECT customerNumber,
       customerName,
       creditLimit
FROM customers
WHERE customerNumber = 103;
```

El procedimiento recibe el identificador del cliente y el nuevo límite. El `WHERE` es fundamental: evita actualizar accidentalmente todos los clientes.

---

## Validar parámetros antes de actualizar

Una versión más segura puede rechazar valores negativos y avisar cuando el cliente no existe.

```sql
DROP PROCEDURE IF EXISTS UpdateCreditValidated;

DELIMITER $$

CREATE PROCEDURE UpdateCreditValidated(
    IN p_customerNumber INT,
    IN p_newLimit DECIMAL(10,2)
)
BEGIN
    DECLARE cantidadClientes INT;

    IF p_newLimit < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El límite de crédito no puede ser negativo';
    END IF;

    SELECT COUNT(*)
    INTO cantidadClientes
    FROM customers
    WHERE customerNumber = p_customerNumber;

    IF cantidadClientes = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El cliente no existe';
    END IF;

    UPDATE customers
    SET creditLimit = p_newLimit
    WHERE customerNumber = p_customerNumber;
END$$

DELIMITER ;
```

Uso:

```sql
CALL UpdateCreditValidated(103, 50000.00);
```

Si se intenta ejecutar con un límite negativo o con un cliente inexistente, `SIGNAL` detiene el procedimiento y genera un error controlado.

---

## Parámetros `OUT`

Un parámetro `OUT` permite que el procedimiento deje un resultado en una variable proporcionada por quien lo llama.

```sql
DROP PROCEDURE IF EXISTS CountCustomerOrders;

DELIMITER $$

CREATE PROCEDURE CountCustomerOrders(
    IN p_customerNumber INT,
    OUT p_totalOrders INT
)
BEGIN
    SELECT COUNT(*)
    INTO p_totalOrders
    FROM orders
    WHERE customerNumber = p_customerNumber;
END$$

DELIMITER ;
```

Ejecución:

```sql
CALL CountCustomerOrders(103, @totalOrders);
SELECT @totalOrders AS totalOrdenes;
```

`@totalOrders` es una variable de sesión. Después del `CALL`, contiene el valor asignado por el procedimiento.

---

## Parámetros `INOUT`

Un parámetro `INOUT` permite recibir un valor y modificarlo dentro del procedimiento.

```sql
DROP PROCEDURE IF EXISTS AddTen;

DELIMITER $$

CREATE PROCEDURE AddTen(INOUT p_value INT)
BEGIN
    SET p_value = p_value + 10;
END$$

DELIMITER ;
```

Uso:

```sql
SET @number = 5;
CALL AddTen(@number);
SELECT @number AS result;
```

El resultado es `15`, porque el valor inicial entra al procedimiento y luego sale actualizado.

---

## Procedimiento con varias instrucciones

Los procedimientos son apropiados cuando hay que realizar más de una operación relacionada.

```sql
DROP PROCEDURE IF EXISTS RegisterRefillment;

DELIMITER $$

CREATE PROCEDURE RegisterRefillment(
    IN p_productCode VARCHAR(15),
    IN p_quantity INT
)
BEGIN
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
END$$

DELIMITER ;
```

Uso:

```sql
CALL RegisterRefillment('S10_1678', 20);
```

Este ejemplo registra la reposición y aumenta el stock del producto. Debe ejecutarse después de crear `ProductRefillment`.

> Si se utiliza este procedimiento junto con un trigger que también modifica el stock, hay que evitar sumar las unidades dos veces. Cada operación debe tener un único responsable del aumento del stock.

---

## Procedimiento contra función

Una función se usa dentro de una expresión y devuelve un valor:

```sql
SELECT EmployeeOfTheMonth(1, 2005);
```

Un procedimiento se ejecuta como una acción:

```sql
CALL UpdateCredit(103, 50000.00);
```

La función `EmployeeOfTheMonth` calcula y retorna un nombre. El procedimiento `UpdateCredit` realiza una actualización y no necesita retornar un valor único.

---

## Transacciones en procedimientos

Cuando varias operaciones deben confirmarse juntas, se puede usar una transacción. Este ejemplo registra una reposición y actualiza el stock; si ocurre un error, los cambios pueden deshacerse.

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
