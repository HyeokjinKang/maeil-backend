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

const uuid = () => {
  const tokens = v4().split("-");
  return tokens[2] + tokens[1] + tokens[0] + tokens[3] + tokens[4];
};

app.get("/", (req, res) => {
  res.send("API server is running");
});

app.get("/user/status", (req, res) => {
  if (req.session.userid) {
    res.status(200).json({ status: "logined" });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  knex("teachers")
    .where({ username })
    .then((rows: any) => {
      if (rows.length > 0) {
        const salt = rows[0].salt;
        const key = pbkdf2Sync(password, salt, 100000, 64, "sha512");
        if (key.toString("hex") === rows[0].password) {
          req.session.userid = rows[0].userid;
          req.session.save(() => {
            res.status(200).json({ status: "success" });
          });
        } else {
          res.status(400).json({ status: "fail" });
        }
      } else {
        res.status(400).json({ status: "fail" });
      }
    })
    .catch((err: any) => {
      res.status(500).json({ status: "error" });
      console.log(err);
    });
});

app.get("/admin/myinfo", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("userid", "username", "name", "type", "classid", "mobile", "email")
      .then((rows: any) => {
        if (rows.length > 0) {
          res.status(200).json({ status: "success", info: rows[0] });
        } else {
          res.status(400).json({ status: "not exist" });
        }
      })
      .catch((err: any) => {
        res.status(500).json({ status: "error" });
        console.log(err);
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(200).json({ status: "success" });
  });
});

app.get("/allboard", (req, res) => {
  knex("allboard")
    .select("id", "title", "content", "date", "delta")
    .orderBy("date", "desc")
    .then((rows: any) => {
      res.status(200).json({ status: "success", num: rows.length, list: rows });
    })
    .catch((err: any) => {
      res.status(500).json({ status: "error" });
      console.log(err);
    });
});

app.post("/allboard", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          const { title, content, delta } = req.body;
          knex("allboard")
            .insert({
              title,
              content,
              delta,
              date: new Date(),
              id: uuid(),
            })
            .then(() => {
              res.status(200).json({ status: "success" });
            })
            .catch((err: any) => {
              res.status(500).json({ status: "error" });
              console.log(err);
            });
        } else {
          res.status(400).json({ status: "not admin" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.listen(config.project.port, () => {
  // console.log(uuid());
  // const salt = randomBytes(128).toString("base64");
  // const key = pbkdf2Sync("kanghyukjin12", salt, 100000, 64, "sha512");
  // console.log(salt);
  // console.log(key.toString("hex"));
  console.log(`Server listening at port ${config.project.port}`);
});
