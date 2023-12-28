const express = require('express');
const passport = require('passport')
const router = express.Router({mergeParams : true});

// authentication login 
router.get("/login" , (req,res) => {
    res.redirect('/');
})

router.get("/google", passport.authenticate('google', {
  scope: ['profile' , 'email'],
  prompt: 'select_account'
}));

// handle with passport
router.get("/logout", (req, res) => {
    req.logout((err) => {
      if (err) {return next(err);}
      res.redirect('/');
    });
  });

router.get("/google/redirect" , passport.authenticate('google') , (req , res) => {
    res.redirect('/profile/') 
})

module.exports = router;