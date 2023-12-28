const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
    roomName : {
        type : String,
        unique : true,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    password : {
        type : String,
    },
    passwordProtected : {
        type : Boolean,
    },
    messages : [
        {
            type : Schema.Types.ObjectId,
            ref : 'Message'
        }
    ]
})

const Room = mongoose.model('Room' , roomSchema)
module.exports = Room;