# Práctico 5 - Base de Datos (Sakila)

Este práctico reúne varios ejercicios de DDL, DML, consultas agregadas, triggers, procedimientos y permisos. La idea es que sirva como material de estudio y como plantilla para parciales.

---

## 1) Crear tabla `directors`

### Problema
Crear una tabla para guardar información básica de directores, junto con la cantidad de películas en las que participaron.

```sql
CREATE TABLE directors (
    director_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(45) NOT NULL,
    last_name  VARCHAR(45) NOT NULL,
    num_peliculas INT DEFAULT 0
);
```

### Qué resuelve
- Define la estructura de la tabla `directors`.
- Permite almacenar nombre, apellido y cantidad de películas.

---

## 2) Insertar Top 5 de actores con más experiencia en la tabla `directors`

### Problema
Se quiere cargar en `directors` a los 5 actores con mayor cantidad de películas filmadas, usando una subconsulta.

```sql
INSERT INTO directors (first_name, last_name, num_peliculas)
SELECT a.first_name,
       a.last_name,
       COUNT(*) AS num_peliculas
FROM actor a
JOIN film_actor fa ON fa.actor_id = a.actor_id
GROUP BY a.actor_id, a.first_name, a.last_name
ORDER BY num_peliculas DESC
LIMIT 5;
```

### Qué resuelve
- Calcula cuántas películas tuvo cada actor.
- Inserta los top 5 en la tabla `directors`.
- Muestra uso de `INSERT INTO ... SELECT` con `GROUP BY` y `LIMIT`.

> En este caso, la tabla `directors` se usa como almacenamiento de personas con mayor experiencia, aunque en la práctica se suele trabajar con una tabla más general de `people` o `personas`.

---

## 3) Agregar columna `premium_customer`

### Problema
Agregar una columna para marcar si un cliente es premium o no, por defecto sin cliente premium.

```sql
ALTER TABLE customer
ADD COLUMN premium_customer CHAR(1) DEFAULT 'F';
```

### Qué resuelve
- Extiende la tabla `customer` con un campo lógico básico.
- Permite guardar `T` o `F` para premium.

---

## 4) Marcar a los 10 clientes con más gastos como premium

### Problema
Actualizar la columna `premium_customer` en los 10 clientes que más gastaron en la plataforma.

```sql
UPDATE customer c
JOIN (
    SELECT customer_id,
           SUM(amount) AS total_gasto
    FROM payment
    GROUP BY customer_id
    ORDER BY total_gasto DESC
    LIMIT 10
) top10 ON top10.customer_id = c.customer_id
SET c.premium_customer = 'T';
```

### Qué resuelve
- Calcula el gasto total por cliente.
- Identifica los 10 con mayor gasto.
- Actualiza su estado premium.

---

## 5) Cantidad de películas por rating

### Problema
Listar los distintos ratings de películas y cuántas películas hay en cada uno.

```sql
SELECT rating,
       COUNT(*) AS cantidad_peliculas
FROM film
GROUP BY rating
ORDER BY cantidad_peliculas DESC;
```

### Qué resuelve
- Agrupa películas por clasificación según edad (`G`, `PG`, `R`, etc.).
- Ordena desde el rating más frecuente al menos frecuente.

---

## 6) Primera y última fecha de pago

### Problema
Determinar cuándo hubo el primer y último pago registrado.

```sql
SELECT MIN(payment_date) AS primera_fecha,
       MAX(payment_date) AS ultima_fecha
FROM payment;
```

### Qué resuelve
- Muestra la fecha mínima y máxima del campo `payment_date`.
- Es una consulta típica para análisis temporal.

---

## 7) Promedio de pagos por mes

### Problema
Calcular el promedio de pagos por cada mes del año.

```sql
SELECT MONTHNAME(payment_date) AS mes,
       YEAR(payment_date) AS anio,
       ROUND(AVG(amount), 2) AS promedio_pago
FROM payment
GROUP BY YEAR(payment_date), MONTH(payment_date), MONTHNAME(payment_date)
ORDER BY YEAR(payment_date), MONTH(payment_date);
```

### Qué resuelve
- Extrae mes y año de una fecha.
- Calcula promedio mensual de pagos.
- Es útil para reportes y análisis económico.

---

## 8) 10 distritos con más alquileres

### Problema
Identificar los 10 distritos donde se realizaron más alquileres.

```sql
SELECT a.district,
       COUNT(r.rental_id) AS total_alquileres
FROM address a
JOIN customer c ON c.address_id = a.address_id
JOIN rental r ON r.customer_id = c.customer_id
GROUP BY a.district
ORDER BY total_alquileres DESC
LIMIT 10;
```

### Qué resuelve
- Relaciona direcciones, clientes y alquileres.
- Cuenta alquileres por distrito.
- Ordena de mayor a menor.

---

## 9) Agregar columna `stock` a `inventory`

### Problema
Agregar un campo que indique cuántas copias de una película hay en inventario en una tienda.

```sql
ALTER TABLE inventory
ADD COLUMN stock INT NOT NULL DEFAULT 5;
```

### Qué resuelve
- Guarda la cantidad disponible por copia.
- Cada inventario de una película tendrá por defecto 5
  unidades.

> Importante: en Sakila el nombre correcto es `inventory`, no `inventory_id`; `inventory_id` es la clave primaria de la tabla.

---

## 10) Trigger `update_stock`

### Problema
Cada vez que se registre un alquiler, restar una unidad del stock de ese inventario, considerando que el alquiler tiene información del cliente y ese cliente pertenece a una tienda.

```sql
DELIMITER $$

CREATE TRIGGER update_stock
AFTER INSERT ON rental
FOR EACH ROW
BEGIN
    UPDATE inventory i
    JOIN customer c ON c.customer_id = NEW.customer_id
    SET i.stock = i.stock - 1
    WHERE i.inventory_id = NEW.inventory_id
      AND i.store_id = c.store_id
      AND i.stock > 0;
END$$

DELIMITER ;
```

### Qué resuelve
- Detecta un alquiler nuevo.
- Busca la tienda del cliente.
- Resta 1 del stock de ese inventario.
- Evita que el stock quede negativo.

### Observación
Este trigger resuelve el detalle clave del enunciado: el `rental` no tiene la tienda directamente, pero el `customer` sí está asociado a una `store_id`.

---

## 11) Crear tabla `fines`

### Problema
Crear una tabla para registrar multas por retraso en devoluciones.

```sql
CREATE TABLE fines (
    rental_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (rental_id),
    CONSTRAINT fk_fines_rental
        FOREIGN KEY (rental_id) REFERENCES rental(rental_id)
);
```

### Qué resuelve
- Guarda multas por alquiler.
- Relaciona la multa con el alquiler correspondiente.
- `amount` guarda el valor decimal con 2 decimales.

---

## 12) Procedimiento `check_date_and_fine`

### Problema
Revisar los alquileres y generar una multa cuando la devolución tardó más de 3 días. El valor de la multa será: `(días de retraso) * 1.5`.

```sql
DELIMITER $$

CREATE PROCEDURE check_date_and_fine()
BEGIN
    INSERT INTO fines (rental_id, amount)
    SELECT r.rental_id,
           ROUND((DATEDIFF(r.return_date, r.rental_date) - 3) * 1.5, 2) AS amount
    FROM rental r
    WHERE r.return_date IS NOT NULL
      AND DATEDIFF(r.return_date, r.rental_date) > 3
      AND NOT EXISTS (
          SELECT 1
          FROM fines f
          WHERE f.rental_id = r.rental_id
      );
END$$

DELIMITER ;
```

### Qué resuelve
- Calcula los días de retraso.
- Filtra solo los alquileres cuya devolución tardó más de 3 días.
- Inserta la multa en la tabla `fines`.

> Para ejecutarlo: `CALL check_date_and_fine();`

---

## 13) Crear rol `employee`

### Problema
Crear un rol con permisos de inserción, eliminación y actualización sobre la tabla `rental`.

```sql
CREATE ROLE employee;
GRANT INSERT, UPDATE, DELETE ON sakila.rental TO employee;
```

### Qué resuelve
- Define un rol de operación básica sobre alquileres.
- Permite administrar registros de alquiler.

---

## 14) Quitar DELETE al rol `employee` y crear rol `administrator`

### Problema
Eliminar el permiso de borrado a `employee` y crear un rol con todos los privilegios sobre la base de datos `sakila`.

```sql
REVOKE DELETE ON sakila.rental FROM employee;

CREATE ROLE administrator;
GRANT ALL PRIVILEGES ON sakila.* TO administrator;
```

### Qué resuelve
- Reduce permisos de `employee` a solo inserción y actualización.
- Crea un rol con acceso completo a la base de datos.

---

## 15) Asignar roles a dos usuarios/empleados

### Problema
Crear dos roles de usuario y asignar distintos permisos: uno para `employee` y otro para `administrator`.

```sql
CREATE USER 'empleado1'@'localhost' IDENTIFIED BY 'pass123';
CREATE USER 'empleado2'@'localhost' IDENTIFIED BY 'pass456';

GRANT employee TO 'empleado1'@'localhost';
GRANT administrator TO 'empleado2'@'localhost';
```

### Qué resuelve
- Permite distinguir dos perfiles distintos.
- Un usuario queda con permisos operativos básicos.
- El otro queda con permisos administrativos.

---

## Modelos generales de consultas útiles para parciales

Estas son consultas básicas que te sirven como plantilla para resolver otros ejercicios.

### 1. Consulta base con filtro, grupo y orden

```sql
SELECT columna1,
       COUNT(*) AS total
FROM tabla
WHERE condicion
GROUP BY columna1
ORDER BY total DESC;
```

### 2. Consulta con subquery para calcular top N

```sql
SELECT *
FROM tabla t
WHERE t.id IN (
    SELECT id
    FROM otra_tabla
    ORDER BY campo DESC
    LIMIT 10
);
```

### 3. Update con subquery

```sql
UPDATE tabla1 t1
JOIN (
    SELECT id, suma
    FROM tabla2
    GROUP BY id
) x ON x.id = t1.id
SET t1.campo = 'valor';
```

### 4. Insert con subquery

```sql
INSERT INTO tabla_destino (campo1, campo2)
SELECT campo1, campo2
FROM tabla_origen
WHERE condicion;
```

### 5. Trigger básico después de insert

```sql
DELIMITER $$
CREATE TRIGGER nombre_trigger
AFTER INSERT ON tabla
FOR EACH ROW
BEGIN
    UPDATE tabla2
    SET campo = campo - 1
    WHERE id = NEW.id;
END$$
DELIMITER ;
```

### 6. Procedimiento simple con validación y cálculo

```sql
DELIMITER $$
CREATE PROCEDURE nombre_procedimiento()
BEGIN
    SELECT campo1,
           ROUND(AVG(campo2), 2) AS promedio
    FROM tabla
    GROUP BY campo1;
END$$
DELIMITER ;
```

### 7. Fechas: extraer mes y año

```sql
SELECT MONTH(fecha) AS mes,
       YEAR(fecha) AS anio
FROM tabla;
```

### 8. Conteo de registros con JOIN

```sql
SELECT t1.nombre,
       COUNT(t2.id) AS cantidad
FROM tabla1 t1
LEFT JOIN tabla2 t2 ON t2.id_tabla1 = t1.id
GROUP BY t1.nombre;
```

---

## Resumen rápido del práctico

El práctico combina estas ideas principales:

- DDL: creación y modificación de tablas.
- DML: inserciones, updates y agrupaciones.
- Consultas agregadas: contar, sumar, promedio, máximo y mínimo.
- Triggers: automatización de lógica tras un insert.
- Procedures: automatización de tareas complejas.
- Seguridad: roles y privilegios.

Esto es exactamente lo que suele evaluarse en un parcial o examen de Bases de Datos.

---

## Recomendación de estudio

Si te van a evaluar por SQL, conviene que repases esto en orden:

1. Crear tablas y modificar columnas.
2. Insertar con `SELECT` y subconsultas.
3. Agrupar con `GROUP BY` y ordenar con `ORDER BY`.
4. Usar joins para relacionar tablas.
5. Crear triggers con lógica condicional.
6. Crear procedimientos y manejar fechas.
7. Otorgar permisos con `GRANT` y `REVOKE`.

Si querés, más adelante puedo convertir este material en una versión aun más corta tipo “resumen de examen” o en una guía de estudio con solo las consultas clave sin tanto texto.
