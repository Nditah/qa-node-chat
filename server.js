"use strict";
require("dotenv").config();
const express = require("express");
const passport = require("passport");
const session = require("express-session");


const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const routes = require('./routes.js');
const auth = require('./auth.js');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const passportSocketIo = require("passport.socketio");
const cookieParser = require("cookie-parser");
const MongoStore = require('connect-mongo')(session);
const store = new MongoStore({ url: process.env.MONGO_URI });


fccTesting(app); //For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");
app.set("views", "./views/pug");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    key: 'express.sid',
    store: store,
    cookie: { secure: false }
  })
);

app.use(passport.initialize());
app.use(passport.session());

myDB(async (client) => {
  const myDataBase = await client.db("dev_db").collection("users");
  routes(app, myDataBase);
  auth(app, myDataBase);

  io.use(
    passportSocketIo.authorize({
      cookieParser: cookieParser,
      key: 'express.sid',
      secret: process.env.SESSION_SECRET,
      store: store,
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail
    })
  );

  let currentUsers = 0;

  io.on('connection', (socket) => {
    const user = socket.request?.user;
    console.log(`user ${user.username} connected`);

    ++currentUsers;

    io.emit('user', {
      username: user.username,
      currentUsers,
      connected: true
    });

    socket.on('chat message', (message) => {
      io.emit('chat message', {
        username: user.username,
        message,
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('Server:: User has disconnect');
      --currentUsers;
      io.emit('user', {
        username: user.username,
        currentUsers,
        connected: false
      });
    });
  });

}).catch((e) => {
  app.get("/", (req, res) => {
    res.render("index", {
      title: e,
      message: "Unable to connect to database",
      showLogin: true,
    });
  });
});

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}
