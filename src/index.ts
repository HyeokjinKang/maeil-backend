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
    .select("id", "title", "content", "date", "delta", "view")
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
              view: 0,
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
                knex("teachers")
                  .where({ name: name })
                  .then((rows: any) => {
                    if (rows.length > 0) {
                      res.status(400).json({ status: "name exist" });
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
            .where({ username: username })
            .where("userid", "!=", userid)
            .then((rows: any) => {
              if (rows.length > 0) {
                res.status(400).json({ status: "username exist" });
              } else {
                knex("teachers")
                  .where({ name: name })
                  .where("userid", "!=", userid)
                  .then((rows: any) => {
                    if (rows.length > 0) {
                      res.status(400).json({ status: "name exist" });
                    } else {
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
                    }
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

app.delete("/teachers", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows[0].type === 0) {
          const { ids } = req.body;
          knex("teacherboard")
            .whereIn("teacher", ids)
            .where("teacher", "!=", req.session.userid)
            .del()
            .then(() => {
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
            })
            .catch((err: any) => {
              res.status(500).json({ status: "error" });
              console.log(err);
              return;
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
          knex("groups")
            .select("groupid", "name")
            .then((groups: any) => {
              const query = req.query;
              knex("students")
                .where("name", "like", `%${query.name}%`)
                .where("username", "like", `%${query.username}%`)
                .where("school", "like", `%${query.school}%`)
                .where("grade", "like", `%${query.grade}%`)
                .where("mobile", "like", `%${query.mobile}%`)
                .where("parent", "like", `%${query.parent}%`)
                .count({ count: "*" })
                .then((count: any) => {
                  knex("students")
                    .where("name", "like", `%${query.name}%`)
                    .where("username", "like", `%${query.username}%`)
                    .where("school", "like", `%${query.school}%`)
                    .where("grade", "like", `%${query.grade}%`)
                    .where("mobile", "like", `%${query.mobile}%`)
                    .where("parent", "like", `%${query.parent}%`)
                    .limit(Number(query.limit))
                    .offset(Number(query.limit) * (Number(query.page) - 1))
                    .then((rows: any) => {
                      for (let row of rows) {
                        row.groups = JSON.parse(row.groups);
                        row.groups = JSON.stringify(
                          row.groups.map((groupid: string) => {
                            for (let group of groups) {
                              if (group.groupid === groupid) {
                                return group.name;
                              }
                            }
                          })
                        );
                      }
                      res.status(200).json({ status: "success", num: count[0].count, list: rows });
                    })
                    .catch((err: any) => {
                      res.status(500).json({ status: "error" });
                      console.log(err);
                    });
                });
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
          const { username, password, name, mobile, parent, groups, school, grade } = req.body;
          knex("students")
            .where({ username: username })
            .then((rows: any) => {
              if (rows.length > 0) {
                res.status(400).json({ status: "username exist" });
              } else {
                knex("students")
                  .where({ name: name })
                  .then((rows: any) => {
                    if (rows.length > 0) {
                      res.status(400).json({ status: "name exist" });
                    } else {
                      const salt = randomBytes(128).toString("base64");
                      const userid = uuid();
                      knex("students")
                        .insert({
                          userid,
                          username,
                          name,
                          mobile,
                          parent,
                          groups,
                          school,
                          grade,
                          performance: "[[0,0],[0,0],[0,0]]",
                          salt: salt,
                          password: pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex"),
                          lastlogin: new Date(),
                        })
                        .then(() => {
                          JSON.parse(groups).forEach((groupid: string) => {
                            knex("groups")
                              .where({ groupid })
                              .then((rows: any) => {
                                if (rows.length > 0) {
                                  const students = JSON.parse(rows[0].students);
                                  students.push(userid);
                                  knex("groups")
                                    .where({ groupid })
                                    .update({
                                      students: JSON.stringify(students),
                                    })
                                    .catch((err: any) => {
                                      console.log(err);
                                    });
                                }
                              })
                              .catch((err: any) => {
                                console.log(err);
                              });
                          });
                          res.status(200).json({ status: "success" });
                        })
                        .catch((err: any) => {
                          res.status(500).json({ status: "error" });
                          console.log(err);
                        });
                    }
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
          const { userid, username, password, name, mobile, parent, groups, school, grade } = req.body;
          knex("students")
            .where({ username: username })
            .where("userid", "!=", userid)
            .then((rows: any) => {
              if (rows.length > 0) {
                res.status(400).json({ status: "username exist" });
              } else {
                knex("students")
                  .where({ name: name })
                  .where("userid", "!=", userid)
                  .then((rows: any) => {
                    if (rows.length > 0) {
                      res.status(400).json({ status: "name exist" });
                    } else {
                      knex("students")
                        .where({ userid })
                        .then((rows: any) => {
                          const prevGroups = JSON.parse(rows[0].groups);
                          const nextGroups = JSON.parse(groups);
                          const delGroups = prevGroups.filter((groupid: string) => !nextGroups.includes(groupid));
                          const addGroups = nextGroups.filter((groupid: string) => !prevGroups.includes(groupid));
                          for (let groupid of delGroups) {
                            knex("groups")
                              .where({ groupid })
                              .then((rows: any) => {
                                if (rows.length > 0) {
                                  const students = JSON.parse(rows[0].students);
                                  students.splice(students.indexOf(userid), 1);
                                  knex("groups")
                                    .where({ groupid })
                                    .update({
                                      students: JSON.stringify(students),
                                    })
                                    .catch((err: any) => {
                                      console.log(err);
                                    });
                                }
                              })
                              .catch((err: any) => {
                                console.log(err);
                              });
                          }
                          for (let groupid of addGroups) {
                            knex("groups")
                              .where({ groupid })
                              .then((rows: any) => {
                                if (rows.length > 0) {
                                  const students = JSON.parse(rows[0].students);
                                  students.push(userid);
                                  knex("groups")
                                    .where({ groupid })
                                    .update({
                                      students: JSON.stringify(students),
                                    })
                                    .catch((err: any) => {
                                      console.log(err);
                                    });
                                }
                              })
                              .catch((err: any) => {
                                console.log(err);
                              });
                          }
                          knex("students")
                            .where({ userid })
                            .update({
                              username,
                              name,
                              mobile,
                              parent,
                              groups,
                              school,
                              grade,
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
                        });
                    }
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
          knex("groups")
            .select("groupid", "students")
            .then((groups: any) => {
              for (let group of groups) {
                const prevArray = JSON.parse(group.students);
                const nextArray = prevArray.filter((userid: string) => !ids.includes(userid));
                if (prevArray.length !== nextArray.length) {
                  knex("groups")
                    .where({ groupid: group.groupid })
                    .update({
                      students: JSON.stringify(nextArray),
                    })
                    .catch((err: any) => {
                      console.log(err);
                    });
                }
              }
            });
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

app.get("/studentbyname/:name", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows.length === 0) {
          res.status(400).json({ status: "not admin" });
          return;
        }
        const { name } = req.params;
        knex("students")
          .where({ name })
          .select("userid", "username", "name", "mobile", "parent", "groups", "performance", "lastlogin")
          .then((rows: any) => {
            if (rows.length > 0) {
              res.status(200).json({ status: "success", student: rows[0] });
            } else {
              res.status(400).json({ status: "not exist" });
            }
          })
          .catch((err: any) => {
            res.status(500).json({ status: "error" });
            console.log(err);
          });
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.get("/studentbyid/:userid", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows.length === 0) {
          res.status(400).json({ status: "not admin" });
          return;
        }
        const { userid } = req.params;
        knex("students")
          .where({ userid })
          .select("userid", "username", "name", "mobile", "parent", "groups", "performance", "lastlogin")
          .then((rows: any) => {
            if (rows.length > 0) {
              res.status(200).json({ status: "success", student: rows[0] });
            } else {
              res.status(400).json({ status: "not exist" });
            }
          })
          .catch((err: any) => {
            res.status(500).json({ status: "error" });
            console.log(err);
          });
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.get("/groups", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows.length > 0) {
          knex("groups")
            .select("groupid", "name", "students", "teacher", "teacherid")
            .then((rows: any) => {
              res.status(200).json({ status: "success", num: rows.length, list: rows });
            })
            .catch((err: any) => {
              res.status(500).json({ status: "error" });
              console.log(err);
            });
        } else {
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.post("/groups", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("userid")
      .then((rows: any) => {
        if (rows.length > 0) {
          const { name, teacher, students } = req.body;
          knex("groups")
            .where({ name })
            .then((rows: any) => {
              if (rows.length > 0) {
                res.status(400).json({ status: "name exist" });
              } else {
                knex("teachers")
                  .where({ name: teacher })
                  .then((rows: any) => {
                    if (rows.length > 0) {
                      const groupid = uuid();
                      knex("groups")
                        .insert({
                          groupid,
                          name,
                          teacher,
                          teacherid: rows[0].userid,
                          students,
                        })
                        .then(() => {
                          JSON.parse(students).forEach((userid: string) => {
                            knex("students")
                              .where({ userid })
                              .then((rows: any) => {
                                if (rows.length > 0) {
                                  const groups = JSON.parse(rows[0].groups);
                                  groups.push(groupid);
                                  knex("students")
                                    .where({ userid })
                                    .update({
                                      groups: JSON.stringify(groups),
                                    })
                                    .catch((err: any) => {
                                      console.log(err);
                                    });
                                }
                              })
                              .catch((err: any) => {
                                console.log(err);
                              });
                          });
                          res.status(200).json({ status: "success" });
                        })
                        .catch((err: any) => {
                          res.status(500).json({ status: "error" });
                          console.log(err);
                        });
                    } else {
                      res.status(400).json({ status: "teacher not exist" });
                    }
                  });
              }
            });
        } else {
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.put("/groups", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("userid")
      .then((rows: any) => {
        if (rows.length > 0) {
          const { groupid, name, teacher, students } = req.body;
          knex("groups")
            .where({ groupid })
            .select("students")
            .then((groupStudents: any) => {
              knex("groups")
                .where({ name })
                .where("groupid", "!=", groupid)
                .then(async (rows: any) => {
                  if (rows.length > 0) {
                    res.status(400).json({ status: "name exist" });
                  } else {
                    for (let userid of JSON.parse(groupStudents[0].students)) {
                      await knex("students")
                        .where({ userid })
                        .then(async (rows: any) => {
                          if (rows.length > 0) {
                            const groups = JSON.parse(rows[0].groups);
                            groups.splice(groups.indexOf(groupid), 1);
                            await knex("students")
                              .where({ userid })
                              .update({
                                groups: JSON.stringify(groups),
                              })
                              .catch((err: any) => {
                                console.log(err);
                              });
                          }
                        })
                        .catch((err: any) => {
                          console.log(err);
                        });
                    }
                    knex("teachers")
                      .where({ name: teacher })
                      .then((rows: any) => {
                        if (rows.length > 0) {
                          knex("groups")
                            .where({ groupid })
                            .update({
                              name,
                              teacher,
                              teacherid: rows[0].userid,
                              students,
                            })
                            .then(() => {
                              JSON.parse(students).forEach((userid: string) => {
                                knex("students")
                                  .where({ userid })
                                  .then((rows: any) => {
                                    if (rows.length > 0) {
                                      const groups = JSON.parse(rows[0].groups);
                                      groups.push(groupid);
                                      knex("students")
                                        .where({ userid })
                                        .update({
                                          groups: JSON.stringify(groups),
                                        })
                                        .catch((err: any) => {
                                          console.log(err);
                                        });
                                    }
                                  })
                                  .catch((err: any) => {
                                    console.log(err);
                                  });
                              });
                              res.status(200).json({ status: "success" });
                            })
                            .catch((err: any) => {
                              res.status(500).json({ status: "error" });
                              console.log(err);
                            });
                        } else {
                          res.status(400).json({ status: "teacher not exist" });
                        }
                      });
                  }
                });
            });
        } else {
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.delete("/groups", (req, res) => {
  if (req.session.userid) {
    const { ids } = req.body;
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("userid")
      .then((rows: any) => {
        if (rows.length > 0) {
          knex("groups")
            .whereIn("groupid", ids)
            .select("students")
            .then((rows: any) => {
              for (let row of rows) {
                for (let userid of JSON.parse(row.students)) {
                  knex("students")
                    .where({ userid })
                    .then((rows: any) => {
                      if (rows.length > 0) {
                        const groups = JSON.parse(rows[0].groups);
                        groups.splice(groups.indexOf(ids), 1);
                        knex("students")
                          .where({ userid })
                          .update({
                            groups: JSON.stringify(groups),
                          })
                          .catch((err: any) => {
                            console.log(err);
                          });
                      }
                    })
                    .catch((err: any) => {
                      console.log(err);
                    });
                }
              }
              knex("assignments")
                .whereIn("group", ids)
                .del()
                .catch((err: any) => {
                  res.status(500).json({ status: "error" });
                  console.log(err);
                  return;
                });
              knex("groups")
                .whereIn("groupid", ids)
                .del()
                .then(() => {
                  res.status(200).json({ status: "success" });
                })
                .catch((err: any) => {
                  res.status(500).json({ status: "error" });
                  console.log(err);
                });
            });
        } else {
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.get("/groupbyname/:name", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .select("type")
      .then((rows: any) => {
        if (rows.length === 0) {
          res.status(400).json({ status: "not admin" });
          return;
        }
        const { name } = req.params;
        knex("groups")
          .where({ name })
          .select("groupid", "name", "students", "teacher", "teacherid")
          .then((rows: any) => {
            if (rows.length > 0) {
              res.status(200).json({ status: "success", group: rows[0] });
            } else {
              res.status(400).json({ status: "not exist" });
            }
          })
          .catch((err: any) => {
            res.status(500).json({ status: "error" });
            console.log(err);
          });
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.get("/mygroups/teacher", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .then((rows: any) => {
        if (rows.length > 0) {
          knex("groups")
            .select("groupid", "name", "students", "teacher", "teacherid")
            .where({ teacherid: rows[0].userid })
            .then((rows: any) => {
              res.status(200).json({ status: "success", num: rows.length, list: rows });
            })
            .catch((err: any) => {
              res.status(500).json({ status: "error" });
              console.log(err);
            });
        } else {
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.get("/teacherboard", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .then((rows: any) => {
        if (rows.length > 0) {
          knex("groups")
            .select("groupid", "name")
            .then((groups: any) => {
              knex("teacherboard")
                .select("id", "title", "content", "date", "delta", "groups", "view")
                .where({ teacher: rows[0].userid })
                .orderBy("date", "desc")
                .then((rows: any) => {
                  for (let row of rows) {
                    row.groups = JSON.parse(row.groups);
                    row.groups = JSON.stringify(
                      row.groups.map((groupid: string) => {
                        for (let group of groups) {
                          if (group.groupid === groupid) {
                            return group.name;
                          }
                        }
                      })
                    );
                  }
                  res.status(200).json({ status: "success", num: rows.length, list: rows });
                })
                .catch((err: any) => {
                  res.status(500).json({ status: "error" });
                  console.log(err);
                });
            });
        } else {
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.post("/teacherboard", (req, res) => {
  if (req.session.userid) {
    const { title, content, delta, groups } = req.body;
    knex("teachers")
      .where({ userid: req.session.userid })
      .then(async (teacher: any) => {
        if (teacher.length > 0) {
          for (let groupid of JSON.parse(groups)) {
            await knex("groups")
              .where({ groupid })
              .then(async (rows: any) => {
                if (rows[0].teacherid != teacher[0].userid) {
                  res.status(400).json({ status: "not your group" });
                  return;
                }
              })
              .catch((err: any) => {
                console.log(err);
              });
          }
          knex("teacherboard")
            .insert({
              title,
              content,
              delta,
              date: new Date(),
              id: uuid(),
              teacher: teacher[0].userid,
              view: 0,
              groups,
            })
            .then(() => {
              res.status(200).json({ status: "success" });
            })
            .catch((err: any) => {
              res.status(500).json({ status: "error" });
              console.log(err);
            });
        } else {
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.put("/teacherboard", (req, res) => {
  if (req.session.userid) {
    const { id, title, content, delta, groups } = req.body;
    knex("teachers")
      .where({ userid: req.session.userid })
      .then(async (teacher: any) => {
        if (teacher.length > 0) {
          for (let groupid of JSON.parse(groups)) {
            await knex("groups")
              .where({ groupid })
              .then(async (rows: any) => {
                if (rows[0].teacherid != teacher[0].userid) {
                  res.status(400).json({ status: "not your group" });
                  return;
                }
              })
              .catch((err: any) => {
                console.log(err);
              });
          }
          knex("teacherboard")
            .where({ id })
            .update({
              title,
              content,
              delta,
              date: new Date(),
              groups,
            })
            .then(() => {
              res.status(200).json({ status: "success" });
            })
            .catch((err: any) => {
              res.status(500).json({ status: "error" });
              console.log(err);
            });
        } else {
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.delete("/teacherboard", (req, res) => {
  if (req.session.userid) {
    const { ids } = req.body;
    knex("teachers")
      .where({ userid: req.session.userid })
      .then(async (teacher: any) => {
        if (teacher.length > 0) {
          for (let id of ids) {
            await knex("teacherboard")
              .where({ id })
              .then(async (rows: any) => {
                if (rows.length > 0) {
                  for (let groupid of JSON.parse(rows[0].groups)) {
                    await knex("groups")
                      .where({ groupid })
                      .then(async (rows: any) => {
                        if (rows[0].teacherid != teacher[0].userid) {
                          res.status(400).json({ status: "not your group" });
                          return;
                        }
                      })
                      .catch((err: any) => {
                        console.log(err);
                      });
                  }
                }
              })
              .catch((err: any) => {
                console.log(err);
              });
          }
          knex("teacherboard")
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
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.get("/assignments", (req, res) => {
  if (req.session.userid) {
    knex("teachers")
      .where({ userid: req.session.userid })
      .then((rows: any) => {
        if (rows.length > 0) {
          knex("groups")
            .select("groupid", "name", "teacherid")
            .then((groups: any) => {
              let mygroups: string[] = [];
              for (let group of groups) {
                if (group.teacherid === rows[0].userid) {
                  mygroups.push(group.groupid);
                }
              }
              const query = req.query;
              knex("assignments")
                .where("title", "like", `%${query.title}%`)
                .where("content", "like", `%${query.content}%`)
                .count({ count: "*" })
                .then((count: any) => {
                  knex("assignments")
                    .where("title", "like", `%${query.title}%`)
                    .where("content", "like", `%${query.content}%`)
                    .whereIn("group", mygroups)
                    .orderBy("date", "desc")
                    .limit(Number(query.limit))
                    .offset(Number(query.limit) * (Number(query.page) - 1))
                    .then((rows: any) => {
                      for (let row of rows) {
                        for (let group of groups) {
                          if (group.groupid === row.group) {
                            row.group = group.name;
                          }
                        }
                      }
                      res.status(200).json({ status: "success", num: count[0].count, list: rows });
                    })
                    .catch((err: any) => {
                      res.status(500).json({ status: "error" });
                      console.log(err);
                    });
                });
            });
        } else {
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.post("/assignments", (req, res) => {
  if (req.session.userid) {
    const { title, content, delta, groups, deadline } = req.body;
    knex("teachers")
      .where({ userid: req.session.userid })
      .then(async (teacher: any) => {
        if (teacher.length > 0) {
          await knex("groups")
            .whereIn("groupid", JSON.parse(groups))
            .then(async (rows: any) => {
              for (let row of rows) {
                if (row.teacherid != teacher[0].userid) {
                  res.status(400).json({ status: "not your group" });
                  return;
                }
              }
            })
            .catch((err: any) => {
              console.log(err);
            });
          for (let group of JSON.parse(groups)) {
            knex("assignments")
              .insert({
                title,
                content,
                delta,
                date: new Date(),
                id: uuid(),
                teacher: teacher[0].name,
                group,
                deadline: new Date(deadline),
              })
              .catch((err: any) => {
                res.status(500).json({ status: "error" });
                console.log(err);
                return;
              });
          }
          res.status(200).json({ status: "success" });
        } else {
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.put("/assignments", (req, res) => {
  if (req.session.userid) {
    const { id, title, content, delta, group, deadline } = req.body;
    knex("teachers")
      .where({ userid: req.session.userid })
      .then(async (teacher: any) => {
        if (teacher.length > 0) {
          await knex("groups")
            .where({ groupid: group })
            .then(async (rows: any) => {
              if (rows[0].teacherid != teacher[0].userid) {
                res.status(400).json({ status: "not your group" });
                return;
              }
            })
            .catch((err: any) => {
              console.log(err);
            });
          knex("assignments")
            .where({ id })
            .update({
              title,
              content,
              delta,
              date: new Date(),
              group,
              deadline: new Date(deadline),
              teacher: teacher[0].name,
            })
            .then(() => {
              res.status(200).json({ status: "success" });
            })
            .catch((err: any) => {
              res.status(500).json({ status: "error" });
              console.log(err);
            });
        } else {
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.delete("/assignments", (req, res) => {
  if (req.session.userid) {
    const { ids } = req.body;
    knex("teachers")
      .where({ userid: req.session.userid })
      .then(async (teacher: any) => {
        if (teacher.length > 0) {
          for (let id of ids) {
            await knex("assignments")
              .where({ id })
              .then(async (rows: any) => {
                await knex("groups")
                  .where({ groupid: rows[0].group })
                  .then(async (rows: any) => {
                    if (rows[0].teacherid != teacher[0].userid) {
                      res.status(400).json({ status: "not your group" });
                      return;
                    }
                  })
                  .catch((err: any) => {
                    console.log(err);
                  });
              })
              .catch((err: any) => {
                console.log(err);
              });
          }
          knex("assignments")
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
          res.status(400).json({ status: "not teacher" });
        }
      });
  } else {
    res.status(400).json({ status: "not logined" });
  }
});

app.listen(config.project.port, () => {
  console.log(`Server listening at port ${config.project.port}`);
});
