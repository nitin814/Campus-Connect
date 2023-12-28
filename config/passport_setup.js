require('dotenv').config();
const clientId = process.env.clientId;
const clientSecret = process.env.clientSecret;
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20')
const User = require('../models/user_model')

passport.serializeUser((user , done) => {
    done(null , user.id); 
})

passport.deserializeUser((id , done) => {
    User.findById(id).then((user) => {
        done(null , user); 
    })
})

passport.use(new GoogleStrategy({
    callbackURL : '/auth/google/redirect' ,
    clientID :  clientId,
    clientSecret : clientSecret, 
} , (accessToken , refreshToken , profile , done) => { 
    User.findOne({googleId : profile.id}).then((currentUser) => {
        if (currentUser)
        {
            done(null , currentUser);   
        }
        else
        {
            const user = new User({
                username: profile.displayName ,
                googleId : profile.id ,
                profilephoto : profile._json.picture ,
                email : profile._json.email 
            })
            user.save().then((newUser)=> { 
                done(null , newUser);
            });
        }
    })
})
)