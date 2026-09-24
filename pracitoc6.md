# Práctico 6 - Base de Datos (Classicmodels)

Este práctico reúne consultas agregadas, una vista, una función, un procedimiento, una tabla auxiliar, un trigger y permisos sobre un esquema similar a `classicmodels`.

La relación principal para consultar ventas por oficina es:

```text
orders -> customers -> employees -> offices
```

El vínculo entre clientes y empleados se realiza mediante `customers.salesRepEmployeeNumber`, y el vínculo entre empleados y oficinas mediante `employees.officeCode`.

> Ejecutar las instrucciones usando la base de datos correspondiente, por ejemplo: `USE classicmodels;`.

---

## 1. Oficina con mayor cantidad de empleados

### Problema

Obtener la oficina que tiene más empleados.

```sql
SELECT o.officeCode,
       COUNT(e.employeeNumber) AS cantidadEmpleados
FROM employees AS e
INNER JOIN offices AS o
        ON o.officeCode = e.officeCode
GROUP BY o.officeCode
ORDER BY cantidadEmpleados DESC
LIMIT 1;
```

### Explicación

Se relacionan `employees` y `offices` mediante `officeCode`. Después se cuentan los empleados de cada oficina, se agrupan los resultados por oficina y se ordenan de mayor a menor. `LIMIT 1` devuelve únicamente la oficina con el valor más alto.

---

## 2. Promedio de órdenes y oficina que más productos vendió

### 2a. Promedio de órdenes por oficina

```sql
SELECT AVG(cantidad) AS promedioOrdenesPorOficina
FROM (
    SELECT o.officeCode,
           COUNT(ord.orderNumber) AS cantidad
    FROM offices AS o
    INNER JOIN employees AS e
            ON e.officeCode = o.officeCode
    INNER JOIN customers AS c
            ON c.salesRepEmployeeNumber = e.employeeNumber
    INNER JOIN orders AS ord
            ON ord.customerNumber = c.customerNumber
    GROUP BY o.officeCode
) AS ordenesPorOficina;
```

La subconsulta calcula primero la cantidad de órdenes correspondiente a cada oficina. La consulta externa obtiene el promedio de esas cantidades. Se utiliza una subconsulta porque primero hay que agrupar por oficina y luego calcular un promedio sobre esos grupos.

### 2b. Oficina que vendió más productos

```sql
SELECT o.officeCode,
       SUM(od.quantityOrdered) AS totalProductosVendidos
FROM offices AS o
INNER JOIN employees AS e
        ON e.officeCode = o.officeCode
INNER JOIN customers AS c
        ON c.salesRepEmployeeNumber = e.employeeNumber
INNER JOIN orders AS ord
        ON ord.customerNumber = c.customerNumber
INNER JOIN orderdetails AS od
        ON od.orderNumber = ord.orderNumber
GROUP BY o.officeCode
ORDER BY totalProductosVendidos DESC
LIMIT 1;
```

Esta consulta suma `quantityOrdered`, por lo que mide unidades vendidas y no cantidad de órdenes. El recorrido completo permite atribuir cada detalle de pedido a la oficina del representante de ventas.

---

## 3. Promedio, máximo y mínimo de pagos por mes

```sql
SELECT YEAR(py.paymentDate) AS anio,
       MONTH(py.paymentDate) AS mes,
       AVG(py.amount) AS promedio,
       MAX(py.amount) AS maximo,
       MIN(py.amount) AS minimo
FROM payments AS py
GROUP BY YEAR(py.paymentDate), MONTH(py.paymentDate)
ORDER BY anio, mes;
```

`YEAR()` y `MONTH()` separan el año y el mes de cada fecha. El `GROUP BY` crea un grupo por cada combinación de año y mes. Así se evita mezclar, por ejemplo, enero de años diferentes.

---

## 4. Procedimiento `UpdateCredit`

### Problema

Crear un procedimiento que actualice el límite de crédito de un cliente.

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

### Ejemplo de uso

```sql
CALL UpdateCredit(103, 50000.00);
```

El procedimiento recibe dos parámetros de entrada: el número del cliente y el nuevo límite. Luego actualiza solamente la fila cuyo `customerNumber` coincide.

---

## 5. Vista `PremiumCustomers`

### Problema

Crear una vista con los diez clientes que más dinero pagaron.

```sql
CREATE OR REPLACE VIEW PremiumCustomers AS
SELECT c.customerName,
       c.city,
       SUM(py.amount) AS totalGastado
FROM customers AS c
INNER JOIN payments AS py
        ON c.customerNumber = py.customerNumber
GROUP BY c.customerNumber, c.customerName, c.city
ORDER BY totalGastado DESC
LIMIT 10;
```

### Ejemplo de uso

```sql
SELECT *
FROM PremiumCustomers;
```

La vista guarda la consulta, no una copia independiente de los datos. Cada vez que se consulta, MySQL calcula los totales a partir de `customers` y `payments`.

---

## 6. Función `EmployeeOfTheMonth`

### Problema

Crear una función que reciba un mes y un año, y devuelva el nombre del empleado cuyos clientes generaron más órdenes durante ese período.

```sql
DROP FUNCTION IF EXISTS EmployeeOfTheMonth;

DELIMITER $$

CREATE FUNCTION EmployeeOfTheMonth(
    p_month INT,
    p_year INT
)
RETURNS VARCHAR(100)
READS SQL DATA
BEGIN
    DECLARE resultado VARCHAR(100);

    SELECT CONCAT(e.firstName, ' ', e.lastName)
    INTO resultado
    FROM employees AS e
    INNER JOIN customers AS c
            ON c.salesRepEmployeeNumber = e.employeeNumber
    INNER JOIN orders AS o
            ON o.customerNumber = c.customerNumber
    WHERE MONTH(o.orderDate) = p_month
      AND YEAR(o.orderDate) = p_year
    GROUP BY e.employeeNumber, e.firstName, e.lastName
    ORDER BY COUNT(o.orderNumber) DESC
    LIMIT 1;

    RETURN resultado;
END$$

DELIMITER ;
```

### Ejemplo de uso

```sql
SELECT EmployeeOfTheMonth(1, 2005) AS empleadoDelMes;
```

La función devuelve un solo valor de texto. Filtra las órdenes por mes y año, agrupa por empleado, cuenta sus órdenes y retorna el primer nombre de la lista ordenada.

---

## 7. Tabla `ProductRefillment`

### Problema

Crear una tabla para registrar reposiciones de productos. Un producto puede tener muchas reposiciones, por eso la relación es de varios a uno: muchas filas de `ProductRefillment` apuntan a un producto de `products`.

```sql
DROP TABLE IF EXISTS ProductRefillment;

CREATE TABLE ProductRefillment (
    refillmentID INT AUTO_INCREMENT PRIMARY KEY,
    productCode VARCHAR(15) NOT NULL,
    orderDate DATE NOT NULL,
    quantity INT NOT NULL,
    CONSTRAINT fk_refillment_product
        FOREIGN KEY (productCode)
        REFERENCES products(productCode)
);
```

La clave foránea garantiza que no se pueda registrar una reposición para un producto inexistente.

---

## 8. Trigger `RestockProduct`

### Problema

Cuando se inserta un detalle de pedido, verificar el stock del producto. Si queda por debajo de 10 unidades, registrar una reposición.

La tabla `ProductRefillment` debe existir antes de crear el trigger.

```sql
DROP TRIGGER IF EXISTS RestockProduct;

DELIMITER $$

CREATE TRIGGER RestockProduct
AFTER INSERT ON orderdetails
FOR EACH ROW
BEGIN
    DECLARE stockActual INT;

    SELECT quantityInStock
    INTO stockActual
    FROM products
    WHERE productCode = NEW.productCode;

    IF stockActual < 10 THEN
        INSERT INTO ProductRefillment (
            productCode,
            orderDate,
            quantity
        )
        VALUES (
            NEW.productCode,
            CURDATE(),
            10
        );
    END IF;
END$$

DELIMITER ;
```

`NEW.productCode` representa el producto del detalle recién insertado. El trigger no modifica directamente el stock: registra en `ProductRefillment` la necesidad de reponer diez unidades.

### Prueba

Usar un número de orden y un producto que existan realmente y que no generen una violación de clave primaria o de otras restricciones.

```sql
INSERT INTO orderdetails (
    orderNumber,
    productCode,
    quantityOrdered,
    priceEach,
    orderLineNumber
)
VALUES (10100, 'S10_1678', 1, 95.70, 1);
```

Verificar la reposición registrada:

```sql
SELECT *
FROM ProductRefillment
ORDER BY refillmentID DESC;
```

---

## 9. Rol `Empleado`

### Problema

Crear un rol con permiso de lectura sobre todas las tablas de `classicmodels` y permiso para crear vistas.

```sql
CREATE ROLE IF NOT EXISTS Empleado;

GRANT SELECT ON classicmodels.* TO Empleado;
GRANT CREATE VIEW ON classicmodels.* TO Empleado;
```

Para asignar el rol a un usuario:

```sql
GRANT Empleado TO 'nombre_usuario'@'localhost';
SET DEFAULT ROLE Empleado TO 'nombre_usuario'@'localhost';
```

El privilegio `SELECT` permite consultar las tablas. `CREATE VIEW` permite crear vistas, pero el usuario no obtiene permisos de modificación, inserción o eliminación de datos.

---

## Orden recomendado de ejecución

1. Seleccionar la base de datos con `USE classicmodels;`.
2. Ejecutar las consultas de los puntos 1, 2 y 3.
3. Crear el procedimiento del punto 4.
4. Crear la vista del punto 5.
5. Crear la función del punto 6.
6. Crear la tabla `ProductRefillment` del punto 7.
7. Crear el trigger del punto 8.
8. Crear el rol y otorgar permisos en el punto 9.

Los objetos que dependen de otros deben crearse después de sus tablas relacionadas. En particular, el trigger necesita que exista previamente `ProductRefillment`.
