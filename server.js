const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { GraphQLObjectType, GraphQLSchema, GraphQLString, GraphQLList, GraphQLID } = require('graphql');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Inicializa la base de datos SQLite
const db = new sqlite3.Database('personajes.db');

// Crea la tabla
db.serialize(() => {
  db.run('CREATE TABLE characters (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, movie TEXT)');
});

// Define el tipo de datos Character
const CharacterType = new GraphQLObjectType({
  name: 'Character',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    movie: { type: GraphQLString }
  }
});

// Define la raíz del esquema de GraphQL
const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    character: {
      type: CharacterType,
      args: { id: { type: GraphQLID } },
      resolve(parent, args) {
        return new Promise((resolve, reject) => {
          db.get('SELECT * FROM characters WHERE id = ?', [args.id], (err, row) => {
            if (err) reject(err);
            resolve(row);
          });
        });
      }
    },
    characters: {
      type: new GraphQLList(CharacterType),
      resolve(parent, args) {
        return new Promise((resolve, reject) => {
          db.all('SELECT * FROM characters', (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          });
        });
      }
    }
  }
});

// Define las mutaciones del esquema de GraphQL
const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addCharacter: {
      type: CharacterType,
      args: {
        name: { type: GraphQLString },
        movie: { type: GraphQLString }
      },
      resolve(parent, args) {
        return new Promise((resolve, reject) => {
          db.run('INSERT INTO characters (name, movie) VALUES (?, ?)', [args.name, args.movie], function (err) {
            if (err) reject(err);
            db.get('SELECT * FROM characters WHERE id = ?', [this.lastID], (err, row) => {
              if (err) reject(err);
              resolve(row);
            });
          });
        });
      }
    },
    deleteCharacter: {
      type: CharacterType,
      args: {
        id: { type: GraphQLID }
      },
      resolve(parent, args) {
        return new Promise((resolve, reject) => {
          db.get('SELECT * FROM characters WHERE id = ?', [args.id], (err, row) => {
            if (err) reject(err);
            db.run('DELETE FROM characters WHERE id = ?', [args.id], (err) => {
              if (err) reject(err);
              resolve(row);
            });
          });
        });
      }
    },
    updateCharacter: {
      type: CharacterType,
      args: {
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        movie: { type: GraphQLString }
      },
      resolve(parent, args) {
        return new Promise((resolve, reject) => {
          db.run('UPDATE characters SET name = ?, movie = ? WHERE id = ?', [args.name, args.movie, args.id], (err) => {
            if (err) reject(err);
            db.get('SELECT * FROM characters WHERE id = ?', [args.id], (err, row) => {
              if (err) reject(err);
              resolve(row);
            });
          });
        });
      }
    }
  }
});

// Define el esquema de GraphQL
const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation
});

// Crea una instancia de Express
const app = express();

// Configura el middleware de GraphQL
app.use('/graphql', graphqlHTTP({
  schema: schema,
  graphiql: true
}));

// Inicia el servidor
app.listen(4000, () => {
  console.log('Servidor GraphQL corriendo en http://localhost:4000/graphql');
});
