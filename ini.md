# MySQL en Docker - Guía de inicio

Esta guía muestra cómo levantar MySQL en Docker, conectarse como `root` y ejecutar archivos `.sql`.

Se usará:

```text
Contenedor: mysql-bd
Base de datos: sakila
Usuario: root
Contraseña: pass
Puerto local: 3306
```

> Si el puerto `3306` ya está ocupado, se puede usar otro puerto local, por ejemplo `3307:3306`.

---

## 1. Verificar que Docker esté instalado

```bash
docker --version
```

También se puede verificar que Docker esté funcionando:

```bash
docker info
```

---

## 2. Descargar la imagen de MySQL

```bash
docker pull mysql:8.0
```

La imagen contiene el servidor de MySQL que usará el contenedor.

---

## 3. Crear y levantar el contenedor

```bash
docker run --name mysql-bd \
    -e MYSQL_ROOT_PASSWORD=pass \
    -e MYSQL_DATABASE=sakila \
    -p 3306:3306 \
    -v mysql_data:/var/lib/mysql \
    -d mysql:8.0
```

### Qué significa cada parte

```text
--name mysql-bd                  nombre del contenedor
-e MYSQL_ROOT_PASSWORD=pass       contraseña del usuario root
-e MYSQL_DATABASE=sakila         crea la base sakila al iniciar
-p 3306:3306                     puerto_local:puerto_contenedor
-v mysql_data:/var/lib/mysql     guarda los datos aunque se elimine el contenedor
-d                               ejecuta en segundo plano
mysql:8.0                        imagen de MySQL
```

### Importante

`docker run` crea un contenedor nuevo. Si el contenedor ya existe, no se debe ejecutar nuevamente para iniciarlo. En ese caso se usa `docker start`.

---

## 4. Ver los contenedores

### Ver contenedores activos

```bash
docker ps
```

### Ver todos los contenedores, incluso detenidos

```bash
docker ps -a
```

Una salida posible es:

```text
CONTAINER ID   IMAGE      NAMES      STATUS          PORTS
abc123         mysql:8.0  mysql-bd   Up 2 minutes    0.0.0.0:3306->3306/tcp
```

---

## 5. Iniciar y detener el contenedor

### Iniciar un contenedor detenido

```bash
docker start mysql-bd
```

### Detenerlo

```bash
docker stop mysql-bd
```

### Reiniciarlo

```bash
docker restart mysql-bd
```

### Ver los mensajes del servidor

```bash
docker logs mysql-bd
```

Para seguir los logs en tiempo real:

```bash
docker logs -f mysql-bd
```

Para salir de los logs se presiona `Ctrl + C`.

---

## 6. Conectarse a MySQL con `docker exec`

```bash
docker exec -it mysql-bd mysql -u root -p
```

Cuando aparezca:

```text
Enter password:
```

Ingresar:

```text
pass
```

### Qué significa

```text
docker exec    ejecuta un comando dentro del contenedor
-it            permite interactuar con la terminal
mysql-bd       nombre del contenedor
mysql          programa cliente de MySQL
-u root        usuario root
-p             solicita la contraseña
```

También se puede indicar la contraseña directamente, aunque no es recomendable porque queda visible en el historial:

```bash
docker exec -it mysql-bd mysql -u root -ppass
```

No debe haber espacio entre `-p` y la contraseña en esta forma.

---

## 7. Comandos básicos dentro de MySQL

Una vez dentro del cliente de MySQL:

```sql
SHOW DATABASES;
```

```sql
USE sakila;
```

```sql
SHOW TABLES;
```

```sql
DESCRIBE Products;
```

```sql
SELECT *
FROM Products
LIMIT 5;
```

Salir de MySQL:

```sql
EXIT;
```

También se puede usar:

```sql
QUIT;
```

---

## 8. Entrar a una terminal del contenedor

```bash
docker exec -it mysql-bd bash
```

Si la imagen no tiene `bash`, usar:

```bash
docker exec -it mysql-bd sh
```

Desde esa terminal se puede ejecutar MySQL así:

```bash
mysql -u root -p
```

Para salir de la terminal del contenedor:

```bash
exit
```

---

## 9. Ejecutar un archivo `.sql` que está afuera del contenedor

Supongamos que el archivo está en la carpeta actual y se llama `archivo.sql`.

### Importarlo directamente con `docker exec -i`

```bash
docker exec -i mysql-bd \
    mysql -u root -ppass sakila < archivo.sql
```

### Qué hace

```text
archivo.sql                 archivo ubicado en la computadora
< archivo.sql               redirige el contenido al comando
exec -i                     permite recibir la entrada del archivo
mysql-bd                    contenedor donde se ejecuta MySQL
-u root                     usuario
-ppass                      contraseña
sakila                      base de datos de destino
```

Esta es la forma más directa de ejecutar un archivo local dentro de MySQL sin copiarlo manualmente al contenedor.

### Usando contraseña solicitada por teclado

```bash
docker exec -i mysql-bd \
    mysql -u root -p sakila < archivo.sql
```

Luego se ingresa la contraseña cuando MySQL la solicite.

---

## 10. Ejecutar un archivo `.sql` que está dentro del contenedor

Primero se copia el archivo desde la computadora al contenedor.

```bash
docker cp archivo.sql mysql-bd:/tmp/archivo.sql
```

Después se ejecuta desde el contenedor:

```bash
docker exec -i mysql-bd \
    mysql -u root -ppass sakila < /tmp/archivo.sql
```

También se puede entrar al contenedor y ejecutarlo desde ahí:

```bash
docker exec -it mysql-bd bash
```

Dentro del contenedor:

```bash
mysql -u root -ppass sakila < /tmp/archivo.sql
```

Luego:

```bash
exit
```

---

## 11. Ejecutar un archivo ubicado en otra carpeta

Usar la ruta al archivo:

```bash
docker exec -i mysql-bd \
    mysql -u root -ppass sakila < /home/usuario/documentos/archivo.sql
```

Si la ruta tiene espacios, usar comillas:

```bash
docker exec -i mysql-bd \
    mysql -u root -ppass sakila < "/home/usuario/Mis documentos/archivo.sql"
```

---

## 12. Exportar una base de datos a un archivo `.sql`

Para guardar la base de datos en un archivo de la computadora:

```bash
docker exec mysql-bd \
    mysqldump -u root -ppass sakila > respaldo.sql
```

El archivo `respaldo.sql` se crea afuera del contenedor, en la carpeta desde donde se ejecutó el comando.

### Exportar solo una tabla

```bash
docker exec mysql-bd \
    mysqldump -u root -ppass sakila Products > products.sql
```

---

## 13. Importar un respaldo completo

```bash
docker exec -i mysql-bd \
    mysql -u root -ppass sakila < respaldo.sql
```

Si el respaldo crea la base de datos y contiene `CREATE DATABASE`, se puede ejecutar sin indicar `sakila`:

```bash
docker exec -i mysql-bd \
    mysql -u root -ppass < respaldo.sql
```

---

## 14. Crear una base de datos manualmente

Entrar al cliente:

```bash
docker exec -it mysql-bd mysql -u root -ppass
```

Luego ejecutar:

```sql
CREATE DATABASE practica;
```

```sql
SHOW DATABASES;
```

Usarla:

```sql
USE practica;
```

---

## 15. Ejecutar una consulta puntual sin entrar a MySQL

```bash
docker exec mysql-bd \
    mysql -u root -ppass sakila \
    -e "SHOW TABLES;"
```

Otro ejemplo:

```bash
docker exec mysql-bd \
    mysql -u root -ppass sakila \
    -e "SELECT COUNT(*) FROM Products;"
```

La opción `-e` ejecuta la consulta indicada y luego termina.

---

## 16. Eliminar el contenedor

Primero detenerlo:

```bash
docker stop mysql-bd
```

Después eliminarlo:

```bash
docker rm mysql-bd
```

Como los datos están en el volumen `mysql_data`, se pueden conservar y usar con otro contenedor.

### Eliminar contenedor forzadamente

```bash
docker rm -f mysql-bd
```

> Esto elimina el contenedor, pero no necesariamente el volumen de datos.

---

## 17. Eliminar también los datos

Ver los volúmenes:

```bash
docker volume ls
```

Eliminar el volumen:

```bash
docker volume rm mysql_data
```

Esto borra los datos almacenados de MySQL. Usarlo solo si realmente se quiere empezar desde cero.

---

## 18. Secuencia rápida para usar en el parcial

### Primera vez

```bash
docker pull mysql:8.0
```

```bash
docker run --name mysql-bd \
    -e MYSQL_ROOT_PASSWORD=pass \
    -e MYSQL_DATABASE=sakila \
    -p 3306:3306 \
    -v mysql_data:/var/lib/mysql \
    -d mysql:8.0
```

```bash
docker ps
```

```bash
docker exec -it mysql-bd mysql -u root -p
```

### En usos posteriores

```bash
docker start mysql-bd
```

```bash
docker ps
```

```bash
docker exec -it mysql-bd mysql -u root -p
```

### Ejecutar un archivo SQL local

```bash
docker exec -i mysql-bd \
    mysql -u root -ppass sakila < archivo.sql
```

---

## 19. Problemas comunes

### El nombre ya está usado

Si aparece un error porque `mysql-bd` ya existe:

```bash
docker ps -a
```

Si está detenido:

```bash
docker start mysql-bd
```

### El puerto ya está ocupado

Crear el contenedor usando otro puerto local:

```bash
docker run --name mysql-bd \
    -e MYSQL_ROOT_PASSWORD=pass \
    -e MYSQL_DATABASE=sakila \
    -p 3307:3306 \
    -v mysql_data:/var/lib/mysql \
    -d mysql:8.0
```

El primer puerto es el de la computadora; el segundo es el puerto interno de MySQL.

### MySQL todavía no está listo

Después de `docker run`, puede tardar unos segundos en iniciar. Revisar los logs:

```bash
docker logs mysql-bd
```

Cuando MySQL esté listo, se puede usar `docker exec`.

### Ver el estado del contenedor

```bash
docker ps -a
```

```bash
docker inspect mysql-bd
```

---

## Resumen de comandos

```text
docker pull       descarga una imagen
docker run        crea y ejecuta un contenedor
docker start      inicia un contenedor existente
docker stop       detiene un contenedor
docker restart    reinicia un contenedor
docker ps         muestra contenedores activos
docker ps -a      muestra todos los contenedores
docker logs       muestra los mensajes del contenedor
docker exec       ejecuta comandos dentro del contenedor
docker cp         copia archivos entre la computadora y el contenedor
docker rm         elimina un contenedor
docker volume     administra los datos persistentes
```

## Comando más importante para importar SQL

```bash
docker exec -i mysql-bd \
    mysql -u root -ppass sakila < archivo.sql
```
