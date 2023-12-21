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
      .select("userid", "username", "name", "type", "mobile", "email")
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

app.put("/allboard", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          const { id, title, content, delta } = req.body;
          knex("allboard")
            .where({ id })
            .update({
              title,
              content,
              delta,
              date: new Date(),
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

app.delete("/allboard", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          const { ids } = req.body;
          knex("allboard")
            .whereIn("id", ids)
            .del()
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

app.get("/teachers", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          knex("teachers")
            .select("userid", "username", "name", "type", "mobile", "email")
            .then((rows: any) => {
              res.status(200).json({ status: "success", num: rows.length, list: rows });
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

app.post("/teachers", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          const { username, password, name, type, mobile, email } = req.body;
          knex("teachers")
            .where({ username: username })
            .then((rows: any) => {
              if (rows.length > 0) {
                res.status(400).json({ status: "username exist" });
              } else {
                const salt = randomBytes(128).toString("base64");
                knex("teachers")
                  .insert({
                    userid: uuid(),
                    username,
                    name,
                    type,
                    mobile,
                    email,
                    salt: salt,
                    password: pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex"),
                  })
                  .then(() => {
                    res.status(200).json({ status: "success" });
                  })
                  .catch((err: any) => {
                    res.status(500).json({ status: "error" });
                    console.log(err);
                  });
              }
            });
        } else {
          res.status(400).json({ status: "not admin" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.put("/teachers", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          const { userid, username, password, name, type, mobile, email } = req.body;
          knex("teachers")
            .where({ userid })
            .update({
              username,
              name,
              type,
              mobile,
              email,
            })
            .then(() => {
              if (password) {
                const salt = randomBytes(128).toString("base64");
                knex("teachers")
                  .where({ userid })
                  .update({
                    salt: salt,
                    password: pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex"),
                  })
                  .then(() => {
                    res.status(200).json({ status: "success" });
                  })
                  .catch((err: any) => {
                    res.status(500).json({ status: "error" });
                    console.log(err);
                  });
              } else {
                res.status(200).json({ status: "success" });
              }
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

app.delete("/teachers", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          const { ids } = req.body;
          knex("teachers")
            .whereIn("userid", ids)
            .where("userid", "!=", req.session.userid)
            .del()
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

app.get("/students", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          knex("students")
            .select("userid", "username", "name", "mobile", "parent", "groups", "performance")
            .then((rows: any) => {
              res.status(200).json({ status: "success", num: rows.length, list: rows });
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

app.post("/students", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          const { username, password, name, mobile, parent } = req.body;
          knex("students")
            .where({ username: username })
            .then((rows: any) => {
              if (rows.length > 0) {
                res.status(400).json({ status: "username exist" });
              } else {
                const salt = randomBytes(128).toString("base64");
                knex("students")
                  .insert({
                    userid: uuid(),
                    username,
                    name,
                    mobile,
                    parent,
                    groups: "[]",
                    performance: "[[0,0],[0,0],[0,0]]",
                    salt: salt,
                    password: pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex"),
                  })
                  .then(() => {
                    res.status(200).json({ status: "success" });
                  })
                  .catch((err: any) => {
                    res.status(500).json({ status: "error" });
                    console.log(err);
                  });
              }
            });
        } else {
          res.status(400).json({ status: "not admin" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.put("/students", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          const { userid, username, password, name, mobile, parent } = req.body;
          knex("students")
            .where({ username: username })
            .where("userid", "!=", userid)
            .then((rows: any) => {
              if (rows.length > 0) {
                res.status(400).json({ status: "username exist" });
              } else {
                knex("students")
                  .where({ userid })
                  .update({
                    username,
                    name,
                    mobile,
                    parent,
                  })
                  .then(() => {
                    if (password) {
                      const salt = randomBytes(128).toString("base64");
                      knex("students")
                        .where({ userid })
                        .update({
                          salt: salt,
                          password: pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex"),
                        })
                        .then(() => {
                          res.status(200).json({ status: "success" });
                        })
                        .catch((err: any) => {
                          res.status(500).json({ status: "error" });
                          console.log(err);
                        });
                    } else {
                      res.status(200).json({ status: "success" });
                    }
                  })
                  .catch((err: any) => {
                    res.status(500).json({ status: "error" });
                  });
              }
            });
        } else {
          res.status(400).json({ status: "not admin" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.delete("/students", (req, res) => {
  if (req.session.userid) {
    const { ids } = req.body;
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          knex("students")
            .whereIn("userid", ids)
            .del()
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
  console.log(`Server listening at port ${config.project.port}`);
});
