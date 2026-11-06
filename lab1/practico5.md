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

## 2) Insertar los 5 actores con más películas

```sql
INSERT INTO directors (Nombre, Apellido, NumPeliculas)
SELECT a.first_name,
       a.last_name,
       COUNT(fa.film_id) AS peli
FROM actor AS a
INNER JOIN film_actor AS fa ON a.actor_id = fa.actor_id
GROUP BY a.actor_id, a.first_name, a.last_name
ORDER BY peli DESC
LIMIT 5;
```

---

## 3) Clientes con más gastos

```sql
SELECT c.customer_id,
       c.first_name,
       c.last_name,
       SUM(p.amount) AS gasto
FROM customer AS c
INNER JOIN payment AS p ON c.customer_id = p.customer_id
GROUP BY c.customer_id, c.first_name, c.first_name
ORDER BY gasto DESC
LIMIT 10;
```

---

## 4) Cantidad de películas por rating

```sql
SELECT f.rating,
       COUNT(f.rating) AS cou
FROM film AS f
GROUP BY f.rating
ORDER BY cou DESC;
```

---

## 5) Primer y último pago

```sql
(SELECT *
FROM payment AS p
ORDER BY p.payment_date DESC
LIMIT 1)
UNION
(SELECT *
FROM payment AS p
ORDER BY p.payment_date ASC
LIMIT 1);
```

---

## 6) Pagos agrupados por fecha

```sql
SELECT p.payment_date,
       SUM(p.amount)
FROM payment AS p
GROUP BY p.payment_date;
```

---

## 7) Extraer el mes

```sql
-- Ejercicio pendiente: revisar cómo extraer el mes.
```

---

## 8) 10 distritos con más alquileres

```sql
SELECT ad.district,
       COUNT(*) AS total
FROM address AS ad
JOIN customer AS c ON ad.address_id = c.address_id
JOIN rental AS r ON c.customer_id = r.customer_id
GROUP BY ad.district
ORDER BY total DESC
LIMIT 10;
```

---

## 9) Agregar y cargar la columna `stock`

```sql
ALTER TABLE inventory
ADD COLUMN stock INT;

UPDATE inventory AS i
SET stock = 5;
```

---

## 10) Trigger `update_stock`

```sql
DELIMITER $$

CREATE TRIGGER update_stock
AFTER INSERT ON rental
FOR EACH ROW
BEGIN
    DECLARE stock_m INT;

    SELECT stock
    INTO stock_m
    FROM inventory
    WHERE inventory_id = NEW.inventory_id;

    IF stock_m > 0 THEN
        UPDATE inventory
        SET stock = stock - 1
        WHERE inventory_id = NEW.inventory_id;
    END IF;
END$$

DELIMITER ;

SHOW TRIGGERS;

SELECT * FROM rental;
SELECT * FROM inventory AS i;

INSERT INTO rental (inventory_id, customer_id, staff_id)
VALUES (1, 1, 1);
```

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
