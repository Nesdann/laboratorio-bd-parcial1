# Funciones almacenadas en MySQL

Una función almacenada es un programa guardado dentro de la base de datos que recibe parámetros, ejecuta una lógica y devuelve un único valor. Puede utilizarse dentro de expresiones SQL, por ejemplo en un `SELECT`, un `WHERE` o un `ORDER BY`.

A diferencia de un procedimiento, una función siempre debe declarar qué tipo de dato retorna y finalizar con `RETURN`.

---

## Estructura básica

```sql
DROP FUNCTION IF EXISTS nombreFuncion;

DELIMITER $$

CREATE FUNCTION nombreFuncion(p_parametro INT)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE resultado INT;

    SET resultado = p_parametro * 2;

    RETURN resultado;
END$$

DELIMITER ;
```

### Partes principales

- `DROP FUNCTION IF EXISTS`: permite volver a crear la función sin que falle porque ya existe.
- `DELIMITER $$`: cambia temporalmente el separador de instrucciones. Es necesario porque el cuerpo usa `;` internamente.
- `CREATE FUNCTION`: crea la función y define su nombre y parámetros.
- `RETURNS INT`: indica el tipo de dato que devuelve.
- `DECLARE`: declara variables locales.
- `RETURN`: devuelve el resultado final.
- `DELIMITER ;`: restaura el separador normal.

---

## Función matemática sencilla

```sql
DROP FUNCTION IF EXISTS DoubleValue;

DELIMITER $$

CREATE FUNCTION DoubleValue(p_value INT)
RETURNS INT
DETERMINISTIC
BEGIN
    RETURN p_value * 2;
END$$

DELIMITER ;
```

Uso:

```sql
SELECT DoubleValue(7) AS resultado;
```

Resultado esperado:

```text
resultado
14
```

Esta función es `DETERMINISTIC` porque para el mismo parámetro siempre devuelve el mismo resultado y no depende de tablas ni de la hora actual.

---

## Función con una consulta sobre tablas

Una función también puede consultar datos y devolver un valor calculado. En ese caso se declara `READS SQL DATA`.

```sql
DROP FUNCTION IF EXISTS CustomerTotalPaid;

DELIMITER $$

CREATE FUNCTION CustomerTotalPaid(p_customerNumber INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
    DECLARE total DECIMAL(10,2);

    SELECT COALESCE(SUM(amount), 0)
    INTO total
    FROM payments
    WHERE customerNumber = p_customerNumber;

    RETURN total;
END$$

DELIMITER ;
```

Uso:

```sql
SELECT CustomerTotalPaid(103) AS totalPagado;
```

`COALESCE` evita que la función devuelva `NULL` cuando el cliente todavía no tiene pagos. En ese caso retorna cero.

---

## Función `EmployeeOfTheMonth`

Esta función recibe un mes y un año, cuenta las órdenes gestionadas por cada empleado y devuelve el nombre del empleado con más órdenes.

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

Uso:

```sql
SELECT EmployeeOfTheMonth(1, 2005) AS empleadoDelMes;
```

### Cómo funciona

1. `p_month` y `p_year` indican el período que se quiere analizar.
2. `employees` se relaciona con `customers` mediante `salesRepEmployeeNumber`.
3. Los clientes se relacionan con `orders` mediante `customerNumber`.
4. `COUNT(o.orderNumber)` cuenta las órdenes de cada empleado.
5. `ORDER BY ... DESC LIMIT 1` selecciona el empleado con mayor cantidad.
6. `CONCAT` une nombre y apellido en un único texto.

Como la función lee tablas, se declara `READS SQL DATA`. No se marca como `DETERMINISTIC`, porque el resultado puede cambiar si cambian las órdenes registradas.

---

## Usar una función en una consulta

Una función puede ejecutarse para cada fila de una consulta:

```sql
SELECT c.customerNumber,
       c.customerName,
       CustomerTotalPaid(c.customerNumber) AS totalPagado
FROM customers AS c
ORDER BY totalPagado DESC;
```

También puede utilizarse para filtrar:

```sql
SELECT customerNumber,
       customerName
FROM customers
WHERE CustomerTotalPaid(customerNumber) > 50000;
```

Hay que tener en cuenta que una función que consulta tablas puede ejecutarse muchas veces en estas consultas. Para grandes volúmenes de datos, una consulta con `JOIN` y `GROUP BY` puede ser más eficiente.

---

## Funciones contra procedimientos

| Función | Procedimiento |
|---|---|
| Devuelve un único valor | Puede devolver resultados mediante `SELECT` o modificar datos |
| Se usa dentro de expresiones SQL | Se ejecuta con `CALL` |
| Declara `RETURNS` | No declara `RETURNS` |
| Termina con `RETURN` | Puede contener varios pasos y parámetros `IN`, `OUT` o `INOUT` |
| Es adecuada para cálculos y consultas puntuales | Es adecuada para procesos completos o actualizaciones |

Una función no reemplaza automáticamente a un procedimiento. La elección depende de si se necesita un valor para una expresión o ejecutar una operación más amplia.

---

## Buenas prácticas

- Usar nombres que indiquen claramente el resultado.
- Declarar el tipo de retorno con la precisión necesaria.
- Validar parámetros cuando un valor inválido pueda producir resultados incorrectos.
- Usar `READS SQL DATA` cuando la función consulte tablas.
- Evitar modificar datos desde funciones de consulta.
- Probar la función con casos normales y con casos sin resultados.
