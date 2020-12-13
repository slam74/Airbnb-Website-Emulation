const HTTP_PORT = process.env.PORT || 8080;
const bodyParser = require('body-parser');
const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const exphbs = require('express-handlebars');
const Sequelize = require('sequelize');
const clientSessions = require("client-sessions");
const bcrypt = require('bcryptjs');
//
const fs = require("fs");
const http = require("http");
const https = require("https");
//
// if there is no session for the user, redirect them to login
// if there is session info stored, then do the next thing
function ensureLogin(req, res, next) {
    if(!req.session.user) {
        res.redirect("/login");
    } else {
        next();
    }
}

///
const storage = multer.diskStorage({
    destination: "./static/images",
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});
// tell multer to use the diskStorage function for naming files instead of default
const upload = multer({ storage: storage });

// set up sequelize to point to our postgres database
var sequelize = new Sequelize('dcbdvc0kmgfcjg', 'bynnhifbvtoujs', '2dce5bc30092cd51aa07eb8c014338184e4b80a70f7c3c6b8d7931c19797cc22', {
    host: 'ec2-18-211-86-133.compute-1.amazonaws.com',
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
        ssl: { rejectUnauthorized: false }
    }
});

// define a User model
var User = sequelize.define('User', {
    email: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    first_name: Sequelize.STRING,
    last_name: Sequelize.STRING,
    dob: Sequelize.DATEONLY,
    password: Sequelize.TEXT,
    admin: Sequelize.BOOLEAN
});

// define a Room model
var Room = sequelize.define('Room', {
    room_title: Sequelize.STRING,
    price: Sequelize.DOUBLE,
    description: Sequelize.STRING,
    location: Sequelize.STRING,
    file_name: Sequelize.STRING
});


app.engine('.hbs', exphbs({ extname: '.hbs' }));
app.set('view engine', '.hbs');

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("static"));

app.use(clientSessions({
    cookieName: "session",
    secret: "this_is_a_secret",
    duration: 2*60*1000, // duration of the session (2 mins)
    activeDuration: 1000*60 // session will be extended by 1 min on each request
}));

app.use(bodyParser.urlencoded({extended: false}));

// display the login html page
app.get("/login", function(req, res) {
    res.render("login", { layout: false });
});

// the login route that adds the user to the session
app.post("/login", (req, res) => {
    sequelize.sync().then(function(){
        // return all emails where email == req.body.email
        User.findAll({
            attributes: ['email','first_name','last_name','password','admin'],
            where: {
                email: req.body.username
            }
        }).then(function(data){
            // pull the data (exclusively)
            data = data.map(value=>value.dataValues);

            // for the user object, we need to specify the database information
            var user = {
                first_name: data[0].first_name,
                last_name: data[0].last_name,
                password: data[0].password,
                email: data[0].email,
                admin: data[0].admin
            };
            
            var username = req.body.username;
            var password = req.body.password;
            
            bcrypt.compare(password, user.password).then((result)=> {
                if(username===user.email && result===true){
                    //add the user on the session and redirect them to the dashboard
                    req.session.user={
                        first_name: user.first_name,
                        last_name: user.last_name,
                        admin: user.admin
                    };
                    res.render('dashboard', {
                        user: req.session.user,
                        layout: false
                    });
                } else {
                    // render "invalid username or password"
                    res.render("login",{errorMsg: "Invalid username or password!", layout: false});
                }
            });
        }).catch(function(error){
            console.log(error);
            console.log("error, rooms not found.");
            res.render("login",{errorMsg: "Invalid username or password!", layout: false});
        });
    });
});

// log a user out by destroying their session and redirecting them to /login
app.get("/logout", function(req, res) {
    req.session.reset();
    res.redirect("/");
});

// check for authorization (do you have an active session?)
app.get("/dashboard", ensureLogin, (req, res) => {
    res.render("dashboard", { user: req.session.user, layout: false });
}); 

// setup a 'route' to listen on the default url path
app.get("/", (req, res) => {
    res.render("index", { user: req.session.user, layout: false });
});

app.get('/room-listing', (req, res)=>{
    /// find the rooms in the database
    sequelize.sync().then(function(){
        // return the following attributes of all room entries
        Room.findAll({
            attributes: ['id','room_title','price','description','location','file_name'],
            
        }).then(function(info){
            // pull the data (exclusively)
            info = info.map(value=>value.dataValues);
            console.log(info);
            res.render('room-listing', {
                data: info,
                user: req.session.user,
                layout: false
            });
        }).catch(function(error){
            console.log(error);
            console.log("error, rooms not found.");
        });
    });
});

app.get('/room-description', (req, res)=> {
    console.log("/room-description myId: " + req.query.myId);

    /// find the room in the database where id matches myId of the user selected item
    sequelize.sync().then(function(){
        // return the following attributes for the entry where id === the user selected item id
        Room.findAll({
            attributes: ['id','room_title','price','description','location','file_name'],
            where: {
                id: req.query.myId
            }
        }).then(function(info){
            // pull the data (exclusively)
            info = info.map(value=>value.dataValues);
            console.log(info);
            res.render('room-description', {
                data: info[0],
                user: req.session.user,
                layout: false
            });
        }).catch(function(error){
            console.log(error);
            console.log("error, rooms not found.");
        });
    });
})

app.get('/registration', (req, res)=>{
    res.sendFile(path.join(__dirname, "/views/registration.html"));
});

app.get('/dashboard', (req, res)=>{
    res.render("dashboard", { user: req.session.user, layout: false });
});

app.get('/create-room', ensureLogin, (req, res)=>{
    res.sendFile(path.join(__dirname, "views/create-room.html"));
});

app.get('/edit-room', ensureLogin, (req, res)=>{
    /// find the room in the database where id matches myId of the user selected item
    sequelize.sync().then(function(){
        // return the following attributes
        Room.findAll({
            attributes: ['id','room_title','price','description','location','file_name'],
            where: {
                id: req.query.myId
            }
        }).then(function(info){
            // pull the data (exclusively)
            info = info.map(value=>value.dataValues);
            console.log(info);
            res.render('edit-room', {
                data: info[0],
                user: req.session.user,
                layout: false
            });
        }).catch(function(error){
            console.log(error);
            console.log("error, rooms not found.");
        });
    });
});

app.post("/create-room", upload.single("photo"), (req, res)=> {
    const roomData = req.body;
    const roomPhoto = req.file;
    console.log(roomData);
    // create a Room in the database
    sequelize.sync().then(function(){
        Room.create({
            room_title: roomData.title,
            price: roomData.price,
            description: roomData.description,
            location: roomData.location,
            file_name: roomPhoto.filename
        }).then(function(){
            console.log("success! room created");
        }).catch(function(error){
            console.log(error);
            console.log("error, did not add the room");
        });
    });

    /// find the rooms in the database
    sequelize.sync().then(function(){
        // return the following attributes of all room entries
        Room.findAll({
            attributes: ['room_title','price','description','location','file_name'],
            
        }).then(function(info){
            // pull the data (exclusively)
            info = info.map(value=>value.dataValues);
            console.log(info);
            res.render('room-listing', {
                data: info,
                user: req.session.user,
                layout: false
            });
        }).catch(function(error){
            console.log(error);
            console.log("error, room not found.");
        });
    });
});

app.post("/search-rooms", (req, res)=> {
    const locationData = req.body;
    
    /// find the rooms in the database
    sequelize.sync().then(function(){
        // return the following attributes of all room entries
        Room.findAll({
            attributes: ['id','room_title','price','description','location','file_name'],
            where: { location: locationData.location }
        }).then(function(info){
            // pull the data (exclusively)
            info = info.map(value=>value.dataValues);
            console.log(info);
            res.render('room-listing', {
                data: info,
                user: req.session.user,
                layout: false
            });
        }).catch(function(error){
            console.log(error);
            console.log("error, rooms not found.");
        });
    });
});

app.get("/remove-room", (req, res)=> {
    const roomData = req.body;
    // remove a Room from the database
    sequelize.sync().then(function(){
        Room.destroy({
            where: { id: req.query.myId }
        }).then(function(){
            console.log('room deleted.');
        }).catch(function(error){
            console.log(error);
            console.log('error, room not deleted');
        });
    });

    /// find the rooms in the database
    sequelize.sync().then(function(){
        // return the following attributes of all room entries
        Room.findAll({
            attributes: ['room_title','price','description','location','file_name'],
            
        }).then(function(info){
            // pull the data (exclusively)
            info = info.map(value=>value.dataValues);
            console.log(info);
            res.render('room-listing', {
                data: info,
                user: req.session.user,
                layout: false
            });
        }).catch(function(error){
            console.log(error);
            console.log("error, rooms not found.");
        });
    });
});

app.post("/update-room", upload.single("photo"), (req, res)=> {
    const roomData = req.body;
    const roomPhoto = req.file;
    console.log(roomData);
    // update an existing Room in the database
    sequelize.sync().then(function(){
        Room.update({
            room_title: roomData.title,
            price: roomData.price,
            description: roomData.description,
            location: roomData.location,
            file_name: roomPhoto.filename
        }, {
            where: { id: req.query.myId }
        }).then(function(){
            console.log("success! room updated");
        }).catch(function(error){
            console.log(error);
            console.log("error, did not update the room");
        });
    });

    /// find the rooms in the database
    sequelize.sync().then(function(){
        // return the following attributes of all room entries
        Room.findAll({
            attributes: ['room_title','price','description','location','file_name'],
            
        }).then(function(info){
            // pull the data (exclusively)
            info = info.map(value=>value.dataValues);
            console.log(info);
            res.render('room-listing', {
                data: info,
                user: req.session.user,
                layout: false
            });
        }).catch(function(error){
            console.log(error);
            console.log("error, rooms not found.");
        });
    });
});

app.post("/book-room", (req, res)=> {
    const roomId = req.query.myId;
    
    /// find the rooms in the database
    sequelize.sync().then(function(){
        // return the following attributes of all room entries
        Room.findAll({
            attributes: ['room_title','file_name'],
            where: { id: roomId }
        }).then(function(info){
            // pull the data (exclusively)
            info = info.map(value=>value.dataValues);
            console.log(info);
            res.render('booked-message', {
                data: info[0],
                user: req.session.user,
                layout: false,
                bookData: req.body
            });
        }).catch(function(error){
            console.log(error);
            console.log("error, rooms not found.");
        });
    });
});

// when a user submits a registration form
app.post("/profile", (req, res)=>{
    const formData = req.body;

    var hashedPassword;
    // hash the password using a salt that was generated using 10 rounds
    bcrypt.hash(formData.new_password, 10).then(hash=>{
        // store the resulting hash value in the database
        hashedPassword = hash;
        console.log(hashedPassword);
    }).catch(err=>{
        console.log(err);
    });

    // synchronize the Database with our models and automatically add the 
    // table if it does not exist
    sequelize.sync().then(function () {
        // create a new "User" and add it to the database
        User.create({
            email: formData.email,
            first_name: formData.firstname,
            last_name: formData.lastname,
            dob: formData.birthday,
            password: hashedPassword,
            admin: false
        }).then(function (user) {
            // you can now access the newly created User via the variable user
            console.log("success!");
        }).catch(function (error) {
            console.log("something went wrong!");
        });
    });
    /// find the user in the database
    sequelize.sync().then(function(){
        // return all emails where email == req.body.email
        User.findAll({
            attributes: ['first_name','last_name','admin'],
            where: {
                email: req.body.email
            }
        }).then(function(data){
            // pull the data (exclusively)
            data = data.map(value=>value.dataValues);
            console.log(data);
            res.render('dashboard', {
                user: data[0],
                layout: false
            });
        });
    });
});

// setup http server to listen on HTTP_PORT
app.listen(HTTP_PORT);
