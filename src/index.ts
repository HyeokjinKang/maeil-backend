import express from "express";
import session from "express-session";
const config = require(__dirname + "/../config/config.json");
const MySQLStore = require("express-mysql-session")(session);

const dbOptions = {
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
};

const knex = require("knex")({
  client: "mysql2",
  connection: dbOptions,
  pool: { min: 0, max: 7 },
});

const sessionStore = new MySQLStore(dbOptions);

const app = express();

app.locals.pretty = true;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
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
