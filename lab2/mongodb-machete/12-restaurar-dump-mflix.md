# 12 · Restaurar una BD o colecciones desde un dump (`.bson.gz`)

Caso real: tenés una carpeta como esta (típica de los labs de la facultad):

```
dump/
└── mflix/
    ├── comments.bson.gz
    ├── comments.metadata.json.gz
    ├── movies.bson.gz
    ├── movies.metadata.json.gz
    ├── sessions.bson.gz
    ├── sessions.metadata.json.gz
    ├── theaters.bson.gz
    ├── theaters.metadata.json.gz
    ├── users.bson.gz
    └── users.metadata.json.gz
```

y un contenedor de Mongo ya corriendo (en tu caso `mongodb-lab`, Mongo 7.0, sin usuario/contraseña).

---

## 1. Qué es cada archivo

Cada colección se guarda en **dos archivos**:

| Archivo | Contiene |
|---|---|
| `movies.bson.gz` | Los **documentos** (en BSON binario, comprimidos con gzip) |
| `movies.metadata.json.gz` | Los **índices** y las opciones de la colección (por ejemplo un `$jsonSchema` validador) |

- El `.gz` final indica que se hizo con `mongodump --gzip`. Por eso al restaurar **hay que poner `--gzip`**; sin eso, `mongorestore` no entiende los archivos.
- La carpeta `mflix/` es el nombre de la **base de datos**. La carpeta que la contiene (`dump/`) es la raíz del dump.
- Se necesitan **ambos archivos** de cada colección para restaurarla completa (datos + índices).

---

## 2. Paso 1: que los archivos estén *dentro* del contenedor

`mongorestore` corre dentro del contenedor, así que la ruta que le pasás es **la ruta del contenedor**, no la de tu PC. Dos formas:

### A) `docker cp` (contenedor ya corriendo)

```bash
# desde la carpeta que contiene "dump/"
docker cp ./dump mongodb-lab:/tmp/dump
```

Queda en `/tmp/dump/mflix/*.bson.gz` dentro del contenedor. Es lo que hiciste vos.

Verificá:

```bash
docker exec mongodb-lab ls /tmp/dump/mflix
```

### B) Volumen compartido (queda disponible siempre)

En `docker-compose.yml`:

```yaml
services:
  mongo:
    image: mongo:7
    container_name: mongodb-lab
    ports: ["27017:27017"]
    volumes:
      - mongo_data:/data/db
      - ./dump:/tmp/dump:ro        # tu carpeta local aparece en /tmp/dump
volumes:
  mongo_data:
```

Con esto no hace falta `docker cp`: lo que pongas en `./dump` de tu PC lo ve el contenedor.

---

## 3. Paso 2: restaurar

### Tu comando, explicado

```bash
docker exec -it mongodb-lab mongorestore --gzip --drop --db mflix /tmp/dump/mflix
```

| Parte | Qué hace |
|---|---|
| `docker exec -it mongodb-lab` | ejecuta un comando dentro del contenedor (`-it` no es necesario para esto, pero no molesta) |
| `mongorestore` | la herramienta que lee un dump y lo carga |
| `--gzip` | los archivos están comprimidos (`.gz`) |
| `--drop` | **antes de restaurar cada colección, la borra** si ya existe. Evita duplicados y errores de `_id`. Solo borra las colecciones que están en el dump, no toda la base |
| `--db mflix` | base de datos destino |
| `/tmp/dump/mflix` | carpeta con los archivos |

Por eso te salió el aviso:

```
The --db and --collection flags are deprecated for this use-case; please use --nsInclude instead
```

Funciona, pero está **deprecado**. La forma moderna es `--nsInclude` (ver abajo).

### Cómo leer la salida

```
building a list of collections to restore from `/tmp/dump/mflix` dir     <- arma la lista de archivos
reading metadata for `mflix.grades` from `.../grades.metadata.json.gz`    <- lee índices/opciones
dropping collection `mflix.grades` before restoring                       <- efecto de --drop
restoring `mflix.grades` from `.../grades.bson.gz`                        <- carga los documentos
finished restoring `mflix.grades` (100000 documents, 0 failures)          <- OK: 100000 docs, 0 errores
no indexes to restore for collection `mflix.grades`                       <- el metadata no tenía índices (aparte del _id)
100000 document(s) restored successfully. 0 document(s) failed to restore.
```

Lo importante: **`0 failures`**.

---

## 4. La forma moderna: `--nsInclude`

`ns` = *namespace* = `base.coleccion`. Se apunta a la **raíz del dump** (la carpeta que contiene `mflix/`), y se filtra con `--nsInclude`.

### Restaurar toda la base `mflix`

```bash
docker exec mongodb-lab mongorestore --gzip --drop --nsInclude='mflix.*' /tmp/dump
```

(`*` significa "todas las colecciones". Las comillas simples evitan que la shell expanda el `*`.)

### Restaurar solo algunas colecciones

```bash
docker exec mongodb-lab mongorestore --gzip --drop \
  --nsInclude='mflix.movies' \
  --nsInclude='mflix.users' \
  /tmp/dump
```

Repetís `--nsInclude` por cada colección.

### Restaurar todo menos algo

```bash
docker exec mongodb-lab mongorestore --gzip --drop \
  --nsInclude='mflix.*' \
  --nsExclude='mflix.sessions' \
  /tmp/dump
```

### Restaurar con otro nombre (sin pisar la original)

```bash
docker exec mongodb-lab mongorestore --gzip \
  --nsFrom='mflix.*' --nsTo='mflix_copia.*' \
  /tmp/dump
```

Queda `mflix_copia` con las mismas colecciones, y `mflix` queda intacta.

### Restaurar todo el dump (varias bases)

```bash
docker exec mongodb-lab mongorestore --gzip --drop /tmp/dump
```

### Probar sin tocar nada

```bash
docker exec mongodb-lab mongorestore --gzip --nsInclude='mflix.*' --dryRun --verbose /tmp/dump
```

`--dryRun` muestra qué haría sin escribir nada.

---

## 5. Cuándo usar `--drop` y cuándo no

| Situación | Resultado |
|---|---|
| Con `--drop` | Borra la colección y la recarga: queda **idéntica al dump** |
| Sin `--drop`, colección vacía o inexistente | Se carga normal |
| Sin `--drop`, colección ya con datos | Los documentos con `_id` repetido **fallan** (`duplicate key`) y los demás se agregan: queda una mezcla |

Ejemplo numérico: la colección `movies` ya tiene 500 documentos y el dump trae 1000 (los mismos 500 más 500 nuevos).
- **Con `--drop`:** quedan 1000.
- **Sin `--drop`:** 500 fallan por `_id` duplicado, 500 se insertan, quedan 1000 pero con 500 errores en el log.

---

## 6. Si el Mongo tiene usuario y contraseña

Tu contenedor se conecta sin credenciales (por eso `mongosh` entra directo). Si algún día tiene autenticación, agregás:

```bash
docker exec mongodb-lab mongorestore \
  -u admin -p admin123 --authenticationDatabase admin \
  --gzip --drop --nsInclude='mflix.*' /tmp/dump
```

---

## 7. Verificar que quedó bien

```bash
docker exec -it mongodb-lab mongosh
```

```js
show dbs
use mflix
show collections                       // comments, movies, sessions, theaters, users
db.movies.countDocuments()             // compará con "restored successfully" del log
db.movies.findOne()
db.movies.getIndexes()                 // los índices vinieron del .metadata.json.gz
db.getCollectionInfos({ name: "movies" })[0].options   // validador, si la colección tenía
```

El número de `countDocuments()` tiene que coincidir con el que mostró `mongorestore`.

---

## 8. Hacer un dump así (para tener el procedimiento completo)

```bash
# Toda la base, en carpeta (genera dump/mflix/*.bson.gz + metadata)
docker exec mongodb-lab mongodump --gzip --db mflix --out /tmp/dump

# Solo una colección
docker exec mongodb-lab mongodump --gzip --db mflix --collection movies --out /tmp/dump

# Sacarlo a tu PC
docker cp mongodb-lab:/tmp/dump ./dump
```

---

## 9. El archivo `mongo.conf`

No es parte del dump: es la **configuración del servidor** (`mongod`). Si tu laboratorio lo trae, define cómo arranca Mongo. Un ejemplo típico (el tuyo puede ser distinto):

```yaml
# mongo.conf
storage:
  dbPath: /data/db

net:
  port: 27017
  bindIp: 0.0.0.0          # acepta conexiones desde fuera del contenedor

security:
  authorization: disabled  # "enabled" exige usuario y contraseña
```

Para que el contenedor lo use:

```yaml
services:
  mongo:
    image: mongo:7
    container_name: mongodb-lab
    ports: ["27017:27017"]
    command: ["mongod", "--config", "/etc/mongo/mongo.conf"]
    volumes:
      - ./mongo.conf:/etc/mongo/mongo.conf:ro
      - mongo_data:/data/db
      - ./dump:/tmp/dump:ro
volumes:
  mongo_data:
```

Equivalente con `docker run`:

```bash
docker run -d --name mongodb-lab -p 27017:27017 \
  -v "$(pwd)/mongo.conf:/etc/mongo/mongo.conf:ro" \
  -v mongo_data:/data/db \
  -v "$(pwd)/dump:/tmp/dump:ro" \
  mongo:7 --config /etc/mongo/mongo.conf
```

> **Importante:** el `mongo.conf` y el dump son independientes. El conf decide *cómo corre* el servidor; el dump son *los datos* que cargás con `mongorestore`. Restaurar no cambia el conf.

---

## 10. Receta completa, de cero

```bash
# 0) Estructura
laboratorio/
├── docker-compose.yml
├── mongo.conf            (opcional)
└── dump/
    └── mflix/ ...

# 1) Levantar
docker compose up -d
docker ps                                        # mongodb-lab "Up"

# 2) Restaurar
docker exec mongodb-lab mongorestore --gzip --drop --nsInclude='mflix.*' /tmp/dump

# 3) Verificar
docker exec -it mongodb-lab mongosh --eval 'db.getSiblingDB("mflix").movies.countDocuments()'
```

(Con `docker cp` en lugar del volumen: reemplazá el paso 1 por levantar sin el volumen `./dump` y agregar `docker cp ./dump mongodb-lab:/tmp/dump` antes del paso 2.)

---

## 11. Errores comunes

| Mensaje / síntoma | Causa y solución |
|---|---|
| `no such file or directory` | La ruta es **de adentro del contenedor**. Revisá con `docker exec mongodb-lab ls /tmp/dump` |
| `Failed: ... bson.gz ... invalid` o muchos errores de lectura | Falta `--gzip` |
| Restauró 0 documentos | `--nsInclude` mal escrito (ej. `mflix.movie` en vez de `mflix.movies`) o apuntaste a la carpeta equivocada: con `--nsInclude` la ruta es la **raíz** (`/tmp/dump`), no `/tmp/dump/mflix` |
| `duplicate key error` | Restauraste sin `--drop` sobre una colección que ya tenía esos `_id` |
| `Authentication failed` / `requires authentication` | El Mongo tiene auth activada: agregá `-u -p --authenticationDatabase admin` |
| Las colecciones están pero sin índices | Faltaba el `.metadata.json.gz` de esa colección en la carpeta |
| Se ve la base vacía en Compass | Refrescá la lista de bases; o restauraste en otra base (revisá `--nsTo` / `--db`) |
