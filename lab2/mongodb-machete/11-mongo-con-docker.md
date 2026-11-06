# 11 · MongoDB 8 con Docker, desde cero

Objetivo: tener un MongoDB 8 corriendo en un contenedor, con usuario y contraseña, datos que **sobreviven** si borrás el contenedor, y saber cargar y sacar bases de datos.

## Índice

1. [Qué necesitás](#1-qué-necesitás)
2. [Estructura de carpetas](#2-estructura-de-carpetas)
3. [Levantarlo rápido (un solo comando)](#3-levantarlo-rápido-un-solo-comando)
4. [Levantarlo bien (docker compose)](#4-levantarlo-bien-docker-compose)
5. [Conectarse](#5-conectarse)
6. [Qué archivos necesitás para tener una BD](#6-qué-archivos-necesitás-para-tener-una-bd)
7. [Copiar datos al contenedor](#7-copiar-datos-al-contenedor)
8. [Sacar datos del contenedor (backups)](#8-sacar-datos-del-contenedor-backups)
9. [Comandos de todos los días](#9-comandos-de-todos-los-días)
10. [Problemas comunes](#10-problemas-comunes)

---

## 1. Qué necesitás

- **Docker** instalado (Docker Desktop en Windows/Mac, Docker Engine en Linux). Verificá:

```bash
docker --version
docker compose version
```

- Una terminal. En Windows conviene **PowerShell** o **WSL**; los comandos de este doc están pensados para bash (en PowerShell cambian algunas cosas, lo aclaro donde importa).

> No hace falta instalar MongoDB en tu máquina: la imagen oficial ya trae el servidor, `mongosh` y las herramientas `mongodump`, `mongorestore`, `mongoimport` y `mongoexport`.

---

## 2. Estructura de carpetas

Creá una carpeta para el proyecto:

```
mongo-docker/
├── docker-compose.yml      # define el contenedor
├── .env                    # usuario y contraseña (NO subir a git)
├── .gitignore
├── init/                   # scripts que corren SOLO la primera vez
│   └── 01-seed.js
├── import/                 # archivos para importar (json, etc.)
│   ├── usuarios.json
│   └── productos.json
└── backup/                 # dumps y exports que saques
```

```bash
mkdir -p mongo-docker/{init,import,backup}
cd mongo-docker
```

---

## 3. Levantarlo rápido (un solo comando)

Para probar algo suelto:

```bash
docker run -d \
  --name mongo8 \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin123 \
  -v mongo_data:/data/db \
  mongo:8
```

| Parte | Qué hace |
|---|---|
| `-d` | corre en segundo plano |
| `--name mongo8` | nombre del contenedor (lo usás en los demás comandos) |
| `-p 27017:27017` | `puerto_tu_PC:puerto_contenedor` |
| `-e ...USERNAME / PASSWORD` | crea el usuario **root** la primera vez |
| `-v mongo_data:/data/db` | volumen con nombre: ahí Mongo guarda los datos |
| `mongo:8` | imagen oficial, versión 8 |

La primera vez descarga la imagen. Comprobá:

```bash
docker ps                      # tiene que aparecer mongo8 con STATUS "Up"
docker logs mongo8 | tail -5   # busca "Waiting for connections"
```

> Sin `-v`, **al borrar el contenedor se pierden los datos**. Con el volumen, sobreviven.

Para empezar de nuevo: `docker rm -f mongo8` (y `docker volume rm mongo_data` si querés borrar también los datos).

---

## 4. Levantarlo bien (docker compose)

Es la forma recomendada: todo queda escrito en un archivo y se levanta con un comando.

### `.env`

```env
MONGO_USER=admin
MONGO_PASS=admin123
```

### `.gitignore`

```
.env
backup/
```

### `docker-compose.yml`

```yaml
services:
  mongo:
    image: mongo:8
    container_name: mongo8
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASS}
      MONGO_INITDB_DATABASE: machete
    volumes:
      - mongo_data:/data/db                  # datos persistentes
      - ./init:/docker-entrypoint-initdb.d:ro # scripts de inicio (solo lectura)
      - ./import:/import:ro                  # archivos a importar
      - ./backup:/backup                     # dumps entrando y saliendo

volumes:
  mongo_data:
```

### Levantar

```bash
docker compose up -d          # crea y arranca
docker compose ps             # estado
docker compose logs -f mongo  # logs en vivo (Ctrl+C para salir, no lo apaga)
```

### Qué hace cada pieza

| Pieza | Explicación |
|---|---|
| `MONGO_INITDB_ROOT_USERNAME/PASSWORD` | Activa la **autenticación** y crea el usuario root. Solo se aplica cuando `/data/db` está **vacío** (primer arranque) |
| `MONGO_INITDB_DATABASE` | Base sobre la que se ejecutan los scripts de `init/` |
| `/docker-entrypoint-initdb.d` | Todo `.js` o `.sh` de esa carpeta se ejecuta **una sola vez**, en orden alfabético, en el primer arranque |
| `mongo_data` | Volumen con nombre administrado por Docker |
| `./import`, `./backup` | Carpetas de tu PC compartidas con el contenedor (*bind mounts*) |

> ⚠️ Los scripts de `init/` **no se vuelven a ejecutar** si el volumen ya tiene datos. Si cambiaste algo y querés que corran de nuevo: `docker compose down -v` (borra el volumen) y `docker compose up -d`.

### Cargar el seed automáticamente

Copiá el `seed.js` del repo a `init/`:

```bash
cp ../mongodb-machete/datos/seed.js init/01-seed.js
docker compose up -d
```

Al arrancar por primera vez ya vas a tener la base `machete` con sus colecciones.

---

## 5. Conectarse

### A) Dentro del contenedor con `mongosh` (lo más simple)

```bash
docker exec -it mongo8 mongosh -u admin -p admin123 --authenticationDatabase admin
```

Ya adentro:

```js
db.version()          // '8.x.x'
show dbs
use machete
show collections
db.usuarios.find()
```

Sin escribir la contraseña en el comando (usa las variables del contenedor):

```bash
docker exec -it mongo8 sh -c 'mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin'
```

### B) Desde tu PC (Compass, VS Code, tu código)

Cadena de conexión:

```
mongodb://admin:admin123@localhost:27017/?authSource=admin
```

- **MongoDB Compass**: pegás esa URI en "New connection".
- **Extensión MongoDB para VS Code**: "Add connection" → misma URI.
- **Node.js / Python**: la misma URI en el cliente.

> `authSource=admin` es obligatorio: el usuario root vive en la base `admin`. Si lo olvidás, da `Authentication failed`.

---

## 6. Qué archivos necesitás para tener una BD

Según qué tengas o qué quieras hacer, hay cuatro formatos. **Elegí uno:**

| Formato | Archivo(s) | Se crea con | Se carga con | Cuándo usarlo |
|---|---|---|---|---|
| **Script JS** | `seed.js` | a mano | `mongosh` o `init/` | Datos de práctica chicos y reproducibles. Es lo que usa este repo |
| **JSON** | `usuarios.json` (uno por colección) | `mongoexport` o a mano | `mongoimport` | Te pasan los datos como JSON (típico en la facultad) |
| **Dump BSON** | carpeta `dump/` con `.bson` + `.metadata.json` por colección | `mongodump` | `mongorestore` | Copia fiel: tipos, índices y validadores incluidos |
| **Archive** | un solo `.archive` / `.archive.gz` | `mongodump --archive` | `mongorestore --archive` | Un solo archivo, cómodo para mover y guardar |

Diferencia importante: **JSON pierde información de tipos** si no está en *Extended JSON* (ver sección 7B), y no guarda índices ni validadores. **El dump BSON/archive guarda todo.**

### Ejemplo de JSON listo para importar

`import/usuarios.json` (un array):

```json
[
  { "nombre": "Ana",   "edad": 20, "ciudad": "Cordoba", "tags": ["rojo", "azul"] },
  { "nombre": "Luis",  "edad": 17, "ciudad": "Rosario", "tags": ["rojo"] },
  { "nombre": "Maria", "edad": 25, "ciudad": "Cordoba", "tags": ["azul", "verde", "rojo"] }
]
```

### Ejemplo con tipos especiales (Extended JSON)

```json
[
  {
    "_id": { "$oid": "64b000000000000000000001" },
    "titulo": "Matrix",
    "estreno": { "$date": "1999-03-31T00:00:00Z" },
    "anio": { "$numberInt": "1999" }
  }
]
```

| Tipo | Cómo se escribe en JSON |
|---|---|
| ObjectId | `{ "$oid": "64b0..." }` |
| Fecha | `{ "$date": "1999-03-31T00:00:00Z" }` |
| int | `{ "$numberInt": "5" }` |
| long | `{ "$numberLong": "5" }` |
| decimal | `{ "$numberDecimal": "9.99" }` |

> Sin eso, `"_id": "64b0..."` se guarda como **string** y una fecha como **string**. Es el error clásico de "mi `$lookup` no encuentra nada".

---

## 7. Copiar datos al contenedor

Tenés **dos formas** de hacer llegar los archivos adentro:

- **Bind mount** (ya está en el compose): ponés el archivo en `./import/` o `./backup/` y el contenedor lo ve en `/import` o `/backup`. **No hace falta copiar nada.**
- **`docker cp`**: copia un archivo suelto adentro de un contenedor ya corriendo.

```bash
docker cp ./mi_archivo.json mongo8:/tmp/mi_archivo.json    # PC -> contenedor
docker cp mongo8:/tmp/resultado.json ./resultado.json      # contenedor -> PC
docker cp ./dump mongo8:/tmp/dump                          # también carpetas
```

### A) Ejecutar un script `.js`

```bash
# Con bind mount: ponelo en ./import/mi_script.js
docker exec mongo8 sh -c 'mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin /import/mi_script.js'
```

Desde mongosh ya conectado también sirve: `load("/import/mi_script.js")`.

### B) Importar JSON con `mongoimport`

Una colección por archivo:

```bash
docker exec mongo8 sh -c 'mongoimport \
  -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
  --db machete --collection usuarios \
  --file /import/usuarios.json \
  --jsonArray --drop'
```

| Flag | Significado |
|---|---|
| `--db` / `--collection` | destino |
| `--file` | ruta **dentro del contenedor** |
| `--jsonArray` | el archivo es un array `[ {...}, {...} ]`. **Sin esto** espera un documento por línea (formato NDJSON, el que genera `mongoexport` sin `--jsonArray`) |
| `--drop` | borra la colección antes de importar (evita duplicados al repetir) |

Verificá:

```bash
docker exec mongo8 sh -c 'mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --quiet --eval "db.getSiblingDB(\"machete\").usuarios.countDocuments()"'
# 3
```

Importar varias colecciones de una:

```bash
for c in usuarios productos peliculas comentarios; do
  docker exec mongo8 sh -c "mongoimport -u \"\$MONGO_INITDB_ROOT_USERNAME\" -p \"\$MONGO_INITDB_ROOT_PASSWORD\" --authenticationDatabase admin --db machete --collection $c --file /import/$c.json --jsonArray --drop"
done
```

### C) Restaurar un dump con `mongorestore`

**Si tenés una carpeta `dump/`** (con `machete/usuarios.bson`, etc.):

```bash
cp -r dump ./backup/dump            # dejarla en la carpeta compartida

docker exec mongo8 sh -c 'mongorestore \
  -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
  --drop /backup/dump'
```

**Si tenés un único archivo `.archive` (o `.archive.gz`):**

```bash
# poné el archivo en ./backup/machete.archive.gz
docker exec mongo8 sh -c 'mongorestore \
  -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
  --archive=/backup/machete.archive.gz --gzip --drop'
```

Restaurar **solo una base**, o **renombrarla** al restaurar:

```bash
# solo la base machete del dump
... mongorestore ... --nsInclude='machete.*' /backup/dump

# restaurar machete como machete_copia
... mongorestore ... --nsFrom='machete.*' --nsTo='machete_copia.*' /backup/dump
```

### D) Copiar una BD de otra instancia de Mongo (otro servidor, Atlas, tu Mongo local)

Dump directo desde la URI de origen hacia un archivo, y restore en el contenedor:

```bash
# 1) Dump desde el origen (corre en el contenedor, que tiene mongodump)
docker exec mongo8 mongodump \
  --uri="mongodb+srv://usuario:clave@cluster.mongodb.net/mibase" \
  --archive=/backup/mibase.archive --gzip

# 2) Restore en el mismo contenedor
docker exec mongo8 sh -c 'mongorestore \
  -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
  --archive=/backup/mibase.archive --gzip --drop'
```

Si el origen es un Mongo instalado en tu PC (fuera de Docker), la URI desde el contenedor usa `host.docker.internal` en vez de `localhost`:

```
--uri="mongodb://host.docker.internal:27017/mibase"
```

---

## 8. Sacar datos del contenedor (backups)

### Backup completo en un archivo (recomendado)

```bash
docker exec mongo8 sh -c 'mongodump \
  -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
  --db machete --archive=/backup/machete.archive.gz --gzip'
```

Con el bind mount, `backup/machete.archive.gz` aparece solo en tu PC. Para restaurarlo: ver sección 7C.

> ⚠️ **No uses `> archivo` en PowerShell** para redirigir un dump binario (`docker exec ... > x.archive`): PowerShell lo re-codifica y **corrompe** el archivo. Escribí el archivo **dentro** del contenedor (`--archive=/backup/...`) como arriba, o usá `docker cp`.

### Exportar una colección a JSON

```bash
docker exec mongo8 sh -c 'mongoexport \
  -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
  --db machete --collection usuarios \
  --jsonArray --pretty --out /backup/usuarios.json'
```

`mongoexport` genera **Extended JSON**, así que ObjectId y fechas se conservan al reimportar.

### Copiar el volumen entero (copia "en frío")

```bash
docker compose down
docker run --rm -v mongo-docker_mongo_data:/data -v "$(pwd)/backup":/backup alpine \
  tar czf /backup/volumen.tgz -C /data .
```

(El nombre del volumen lleva el prefijo del proyecto; verlo con `docker volume ls`.) Es más frágil que `mongodump`; usalo solo si sabés por qué.

---

## 9. Comandos de todos los días

| Quiero... | Comando |
|---|---|
| Levantar | `docker compose up -d` |
| Apagar (conserva datos) | `docker compose stop` |
| Prender de nuevo | `docker compose start` |
| Apagar y borrar contenedor (conserva datos) | `docker compose down` |
| **Borrar todo, datos incluidos** | `docker compose down -v` |
| Ver logs | `docker compose logs -f mongo` |
| Entrar a mongosh | `docker exec -it mongo8 mongosh -u admin -p admin123 --authenticationDatabase admin` |
| Entrar a una shell del contenedor | `docker exec -it mongo8 bash` |
| Ver contenedores | `docker ps` (agregá `-a` para incluir apagados) |
| Ver volúmenes | `docker volume ls` |
| Actualizar a la última 8.x | `docker compose pull && docker compose up -d` |
| Ver cuánto ocupa | `docker system df` |

### Flujo típico para practicar el parcial

```bash
# Primera vez
cd mongo-docker
cp ../mongodb-machete/datos/seed.js init/01-seed.js
docker compose up -d
docker exec -it mongo8 mongosh -u admin -p admin123 --authenticationDatabase admin
# > use machete   y a practicar

# Rompiste todo y querés resetear los datos
docker compose down -v
docker compose up -d       # el seed corre de nuevo

# Terminaste por hoy
docker compose stop
```

---

## 10. Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| `port is already allocated` / `address already in use` | Ya hay algo en el 27017 (otro Mongo, otro contenedor). Cambiá a `"27018:27017"` en el compose y conectate al 27018, o apagá el otro |
| `Authentication failed` | Falta `--authenticationDatabase admin` / `?authSource=admin`, o la contraseña no es la del **primer** arranque. Las variables `MONGO_INITDB_*` **solo se aplican con el volumen vacío**: si las cambiaste después, hacé `docker compose down -v` |
| Los scripts de `init/` no corrieron | Solo corren con el volumen vacío. `docker compose down -v` y levantar de nuevo. Mirá los logs por errores del script |
| `command requires authentication` | Te conectaste sin usuario. Agregá `-u ... -p ... --authenticationDatabase admin` |
| `mongoimport` dice `cannot decode array into a Document` | Falta `--jsonArray` (el archivo es un array) |
| Importé y la colección tiene `_id` o fechas como string | El JSON no estaba en Extended JSON; usá `{"$oid": ...}` / `{"$date": ...}` o restaurá desde un dump BSON |
| `no such file or directory` en `--file` | La ruta es **dentro del contenedor** (`/import/...`), no la de tu PC. Revisá el bind mount |
| Docker Desktop en Windows: carpetas compartidas vacías | Poné el proyecto dentro de tu usuario (no en un disco/ruta no compartida) o usá WSL |
| Se perdieron los datos al reiniciar | No había volumen (`-v` / `volumes:`), o corriste `down -v` |
| El contenedor se cierra solo | `docker compose logs mongo`: suele ser un volumen con datos de otra versión incompatible, o permisos |

---

## Resumen en 5 pasos

1. `docker-compose.yml` + `.env` (sección 4).
2. `docker compose up -d`.
3. Poner tus datos en `import/` (JSON) o `backup/` (dump), o el `seed.js` en `init/`.
4. Cargar con `mongoimport` o `mongorestore` (sección 7).
5. Conectarte con `mongosh` o Compass (sección 5) y practicar.
