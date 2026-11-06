// Datos de ejemplo para todos los apuntes. Correr con: mongosh < datos/seed.js
db = db.getSiblingDB("machete");

["usuarios", "productos", "peliculas", "comentarios"].forEach(c => db[c].drop());

db.usuarios.insertMany([
  { nombre: "Ana",   edad: 20, email: "ana@mail.com",   ciudad: "Cordoba",  tags: ["rojo", "azul"] },
  { nombre: "Luis",  edad: 17, email: "luis@mail.com",  ciudad: "Rosario",  tags: ["rojo"] },
  { nombre: "Maria", edad: 25, email: "maria@mail.com", ciudad: "Cordoba",  tags: ["azul", "verde", "rojo"] },
  { nombre: "Juan",  edad: 30, email: "juan@mail.com",  ciudad: "Mendoza",  tags: [] }
]);

db.productos.insertMany([
  { nombre: "Remera", precio: 1000, stock: 10, vendidos: 4,
    variantes: [ { color: "rojo", talle: "M" }, { color: "azul", talle: "L" } ] },
  { nombre: "Buzo",   precio: 2000, stock: 3,  vendidos: 5,
    variantes: [ { color: "rojo", talle: "L" }, { color: "azul", talle: "M" } ] },
  { nombre: "Gorra",  precio: 500,  stock: 8,  vendidos: 8,
    variantes: [ { color: "rojo", talle: "M" } ] }
]);

const matrix  = ObjectId("64b000000000000000000001");
const titanic = ObjectId("64b000000000000000000002");
const alien   = ObjectId("64b000000000000000000003");

db.peliculas.insertMany([
  { _id: matrix,  titulo: "Matrix",  anio: 1999, rating: 8.7, generos: ["Accion", "Ciencia ficcion"],
    estreno: ISODate("1999-03-31T00:00:00Z") },
  { _id: titanic, titulo: "Titanic", anio: 1997, rating: 7.9, generos: ["Drama", "Romance"],
    estreno: ISODate("1997-12-19T00:00:00Z") },
  { _id: alien,   titulo: "Alien",   anio: 1979, rating: 8.4, generos: ["Terror", "Ciencia ficcion"],
    estreno: ISODate("1979-05-25T00:00:00Z") }
]);

db.comentarios.insertMany([
  { movie_id: matrix,  usuario: "Ana",   puntaje: 5, texto: "Increible",       fecha: ISODate("2023-02-10T00:00:00Z") },
  { movie_id: matrix,  usuario: "Luis",  puntaje: 4, texto: "Muy buena",       fecha: ISODate("2022-11-05T00:00:00Z") },
  { movie_id: matrix,  usuario: "Maria", puntaje: 5, texto: "Obra maestra",    fecha: ISODate("2023-06-20T00:00:00Z") },
  { movie_id: titanic, usuario: "Juan",  puntaje: 3, texto: "Larga",           fecha: ISODate("2023-01-15T00:00:00Z") },
  { movie_id: alien,   usuario: "Ana",   puntaje: 4, texto: "Tension pura",    fecha: ISODate("2021-09-09T00:00:00Z") }
]);

print("Seed OK -> base 'machete'");
