const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    user: {
        type: String, // Assuming the user is identified by a username
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
    })

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;