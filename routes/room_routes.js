const express = require('express');
const router = express.Router({mergeParams : true});
const Room = require('../public/room'); 

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

router.post("/" , authCheck , async (req,res) => {
    try {
        const { name, description, passwordstatus, password } = req.body['room'];
        const room = new Room({ roomName : name, description : description, passwordProtected : (passwordstatus ? true : false), password : password });
        await room.save();
        res.redirect('/room');
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
})

router.get("/:id/join" , authCheck , async (req,res) => {
    const room = await Room.findById(req.params.id);
    if (!room) {
        res.redirect('/room');
      }
    
    res.render("index2" , { roomId : req.params.id , username : req.user.username});
})

router.post("/:id/join" , authCheck , async (req , res) => {
    const room = await Room.findById(req.params.id);
    if (!room) {
        res.redirect('/room');
      }
    
    if (room.passwordProtected) {
        if (req.body.password == room.password) {
            res.redirect(`/room/${room._id}/join`);
        } else {
            res.redirect('/room');
        }
    }
})

router.get("/" , authCheck , async (req,res) => {
    try {
        const rooms = await Room.find();
        res.render('index', { rooms , username : req.user.username});
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
})

module.exports = router;