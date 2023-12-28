const express = require('express');
const passport = require('passport')
const router = express.Router({mergeParams : true});

const authCheck = (req , res , next) => {
    if (req.user)
    {
        next();
    }
    else
    {
        res.redirect('/auth/login')
    }
}

router.get('/' , authCheck , (req , res) => {
    res.render("home" , {user : req.user});
})

router.get('/one_one' ,authCheck , (req , res) => {
    res.render("oneone" , {user : req.user});
})

router.get('/stranger' , authCheck , (req , res) => {
    res.render("stranger" , {user : req.user});
})

module.exports = router;