import express from "express";
import * as session from "express-session";
import { v4 } from "uuid";
import { pbkdf2Sync, randomBytes } from "node:crypto";
const config = require(__dirname + "/../config/config.json");
const KnexSessionStore = require("connect-session-knex")(session);

const knex = require("knex")({
  client: "mysql2",
  connection: {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
  },
  pool: { min: 0, max: 7 },
});

const sessionStore = new KnexSessionStore({ knex });

const app = express();

app.locals.pretty = true;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session.default({
    secret: config.session.secret,
    store: sessionStore,
    resave: config.session.resave,
    saveUninitialized: config.session.saveUninitialized,
  })
);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(config.project.port, () => {
  console.log(`Server listening at port ${config.project.port}`);
});
