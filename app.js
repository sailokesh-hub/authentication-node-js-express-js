const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//API 1

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);

  const lenOfPassword = password.length < 5;

  if (dbUser === undefined && lenOfPassword === false) {
    //add user details
    const createUserQuery = `
    INSERT INTO
       user (username, name, password, gender, location)
    VALUES
    (
      '${username}',
      '${name}',
      '${hashedPassword}',
      '${gender}',
      '${location}'  
    );`;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else if (dbUser === undefined && lenOfPassword === true) {
    //password length too short
    response.status(400);
    response.send("Password is too short");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//API 2

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `select * from user where username='${username}';`;
  const dbUser = await db.get(getUserQuery);
  if (dbUser === undefined) {
    //user not registered
    response.status(400);
    response.send("Invalid user");
  } else {
    //user present password checking
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched) {
      //password matched
      response.send("Login success!");
    } else {
      //password Invalid
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 3

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const lenOfPassword = newPassword.length;
  const getUserQuery = `select * from user where username='${username}';`;
  const dbUser = await db.get(getUserQuery);
  const isCurrentPasswordMatch = await bcrypt.compare(
    oldPassword,
    dbUser.password
  );
  if (dbUser !== undefined) {
    if (isCurrentPasswordMatch === true) {
      if (lenOfPassword < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `update user set password='${newHashedPassword}' where username='${username}';`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  } else {
    response.status(400);
    response.send(`Invalid user`);
  }
});

module.exports = app;
