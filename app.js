require('dotenv').config()
const mongoose = require('mongoose')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const bp = require('body-parser')
const express = require('express')
const app = express()
const ejs = require('ejs')
app.use(express.static(__dirname+'/public'))
app.set('view engine','ejs')
app.use(bp.urlencoded({extended:true}))
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate")

app.use(session({
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:true
}))
app.use(passport.initialize())
app.use(passport.session())
const db = mongoose.connect("mongodb+srv://admin-vamshi:vamshi22@cluster0-ycyqx.mongodb.net/todoDB?retryWrites=true&w=majority",{useNewUrlParser:true,useUnifiedTopology:true},()=>console.log("connected"))
const userSchema = new mongoose.Schema({
  name:String,
  username:String,
  password:String,
  googleId:String
})


const userlistSchema = new mongoose.Schema({
  userid:mongoose.Types.ObjectId,
  home: [],
  work: [],
  other: []
})

userSchema.plugin(findOrCreate)
userSchema.plugin(passportLocalMongoose,{
  SelectFields: "name"
})

const lists = mongoose.model("list",userlistSchema)
const users = mongoose.model("user",userSchema)

passport.use(users.createStrategy())
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home"
  },
  function(accessToken, refreshToken, profile, cb) {
    users.findOrCreate({ googleId: profile.id,name:profile.displayName }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  users.findById(id, function(err, user) {
    done(err, user);
  });
});



// get request handlers

app.get("/",function(req,res){
res.render("home")
})

app.get("/home",function(req,res){
  if(req.isAuthenticated()){
    users.findById(req.user._id,function(err,data){
      lists.findOne({userid:req.user._id},function(err,data){
        res.render("list",{day:"Home",listItem:data.home})
      })
    })
  }
  else{
  res.redirect("/login")
  }
})

app.get("/work",function(req,res){
  if(req.isAuthenticated()){
    users.findById(req.user._id,function(err,data){
      lists.findOne({userid:req.user._id},function(err,data){
        res.render("work",{day:"Work",listItem:data.work})
      })
    })
  }
  else{
  res.redirect("/login")
  }
})

app.get("/other",function(req,res){
  if(req.isAuthenticated()){
    users.findById(req.user._id,function(err,data){
      lists.findOne({userid:req.user._id},function(err,data){
        res.render("other",{day:"Other",listItem:data.other})
      })
    })
  }
  else{
  res.redirect("/login")
  }
})


app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/home',
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    var l = new lists({
      userid:req.user._id,
      home:["this is your list","enter an item and click +","<--- mark an item to delete"],
      work:[],
      other:[]
    })
  l.save()
    res.redirect('/home');
  });

app.get("/login",function(req,res){
  if(req.isAuthenticated()){
    res.redirect("/home")
  }
  else{
  res.render("login")
  }
})


// post request handlers

app.post("/logout",function(req,res){
  req.logout()
  res.redirect("/")
})

app.post("/", function(req,res){
  var user_details = {
    username:req.body.username,
    name:req.body.name
  }
users.register(new users(user_details),req.body.password,function(err,user){
  if(err){
    console.log(err);
  }
  else{
      passport.authenticate("local")(req,res,function(){
        var l = new lists({
          userid:req.user._id,
          home:["this is your list","enter an item and click +","<--- mark an item to delete"],
          work:[],
          other:[]
        })
      l.save()
      res.redirect("/home")
    })
  }
})
})

app.post("/login",function(req,res){
  const u = new users({
    username:req.body.username,
    password:req.body.password
  })
  req.login(u,function(err){
    if(err){
      console.log(err);
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/home")
      })
    }
  })
})

app.post("/home",function(req,res){
  users.findById(req.user._id,function(err,data){
    lists.findOneAndUpdate({userid:data._id},{$push : {home:req.body.todo}},{useFindAndModify:false},
      function(err,result){

      if(!err){
        res.redirect("/home")
      }
    })
  })
})

app.post("/work",function(req,res){

  users.findById(req.user._id,function(err,data){
    lists.findOneAndUpdate({userid:data._id},{$push : {work:req.body.todo}},{useFindAndModify:false},
      function(err,result){

      if(!err){
        res.redirect("/work")
      }
    })
  })
})

app.post("/other",function(req,res){
  users.findById(req.user._id,function(err,data){
    lists.findOneAndUpdate({userid:data._id},{$push : {other:req.body.todo}},{useFindAndModify:false},
      function(err,result){

      if(!err){
        res.redirect("/other")
      }
    })
  })
})
app.post("/delete",function(req,res){

  users.findById(req.user._id,function(err,data){
    if(req.body.listname==="Home"){
    lists.findOneAndUpdate({userid:data._id},{$pull : {home:req.body.checkbox}},{useFindAndModify:false},
      function(err,result){
      if(!err){
        res.redirect("/home")
      }
    })
  }
  if(req.body.listname==="Work"){
  lists.findOneAndUpdate({userid:data._id},{$pull : {work:req.body.checkbox}},{useFindAndModify:false},
    function(err,result){
    if(!err){
      res.redirect("/work")
    }
  })
}
if(req.body.listname==="Other"){
lists.findOneAndUpdate({userid:data._id},{$pull : {other:req.body.checkbox}},{useFindAndModify:false},
  function(err,result){
  if(!err){
    res.redirect("/other")
  }
})
}
  })
})

app.listen(process.env.PORT || 3000)
