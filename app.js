require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();
const MongoStore = require('connect-mongo');
const passportSetup = require('./config/passport_setup')
const mongoose = require('mongoose')
const Session = require('express-session')
const passport = require('passport')
const http = require('http');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');

const roomRoutes = require('./routes/room_routes');
const Room = require('./public/room');
const Message = require('./public/message');

const server = http.createServer(app);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname , 'public')));
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(methodOverride('_method'));

const AsyncLock = require('async-lock');
const lock = new AsyncLock();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const io = require('socket.io')(server);

let connectedPeers = [];
let strangerPeers = [];
const strangerPeersVideo = new Set();
const strangerPeersAudio = new Set();

const userSocketMap = {};
const SocketuserMap = {};

io.on('connection' , (socket) => {
    connectedPeers.push(socket.id);
    strangerPeers.push(socket.id);

    socket.on('join', async (data) => {
        const { roomId , username } = data;
        socket.join(roomId);
        const roomm = await Room.findById({ _id : roomId }).populate('messages').exec();
    
        if (roomm && roomm.messages) {
          roomm.messages.forEach((message) => {
            socket.emit('chat_message', { user: message.user, message: message.message });
          });
        }
    
        io.to(roomId).emit('chat_message', { user: 'Server', message: `Welcome to room ${username}!` });
    });

    socket.on('chat_message', (data) => {
        const { room, user, message } = data;
        const newMessage = new Message({ user, message });
        newMessage.save()
        .then(() => {
          // Update the room's messages array with the new message
          return Room.updateOne(
            { _id : room },
            { $push: { messages: newMessage._id } }
          );
        })
        .then(() => {
          socket.to(room).emit('chat_message', { user, message });
        })
        .catch((error) => console.error('Error saving message:', error));
    });

    socket.on('register-new-user' , (data) => {
        const {email} = data.user;
        let newroll = email.split('@')[0];
        // if (userSocketMap[newroll]) {
        //     newroll = newroll + 'z';
        // }
        userSocketMap[newroll] = socket.id;
        SocketuserMap[socket.id] = newroll;

        console.log(userSocketMap);
        console.log(SocketuserMap);
    })

    socket.on('set-connectedUserDetails' , (data) => {
        const {callType , calleePersonalCode} = data;
        const callePersonalCode = userSocketMap[calleePersonalCode];
        
        io.to(socket.id).emit('set-connectedUserDetails' , {callType , callePersonalCode});
    })

    socket.on('pre-offer' , (data) => {
        const { calleePersonalCode , callType } = data;
        const callePersonalCode = userSocketMap[calleePersonalCode];
        const connectedPeer = connectedPeers.find((peerSocketId) => peerSocketId === callePersonalCode);
        
        if (connectedPeer) {
            const data = {
                callerSocketId : socket.id, 
                callType ,
                username : SocketuserMap[socket.id]
            }
            io.to(callePersonalCode).emit('pre-offer' , data); 
        }
        else
        {
            const data = {
                preOfferAnswer : 'CALLEE_NOT_FOUND',
                usernames : calleePersonalCode
            }
            io.to(socket.id).emit('pre-offer-answer' , data);
        }
    })

    socket.on('pre-offer-answer' , (data) => {
        const connectedPeer = connectedPeers.find((peerSocketId) => peerSocketId === data.callerSocketId);
        if (connectedPeer) {
            io.to(data.callerSocketId).emit('pre-offer-answer' , {callerSocketId : socket.id , preOfferAnswer : data.preOfferAnswer , usernames : SocketuserMap[data.callerSocketId]});
        } 
    })

    socket.on('stranger-pre-offer' , (data) => {
        const { calleePersonalCode , callType } = data;
        const connectedPeer = connectedPeers.find((peerSocketId) => peerSocketId === calleePersonalCode);

        if (connectedPeer) {
            const data = {
                callerSocketId : socket.id, 
                callType
            }
            io.to(calleePersonalCode).emit('pre-offer' , data); 
        }
        else
        {
            const data = {
                preOfferAnswer : 'CALLEE_NOT_FOUND'
            }
            io.to(socket.id).emit('pre-offer-answer' , data);
        }
    })

    socket.on('stranger-pre-offer-answer' , (data) => {
        const connectedPeer = connectedPeers.find((peerSocketId) => peerSocketId === data.callerSocketId);
        if (connectedPeer) {
            io.to(data.callerSocketId).emit('pre-offer-answer' , {callerSocketId : socket.id , preOfferAnswer : data.preOfferAnswer});
        } 
    })
    
    socket.on('webRTC-signaling' , (data) => {
        const { connectedUserSocketId } = data;
        const connectedPeer = connectedPeers.find((peerSocketId) => peerSocketId === connectedUserSocketId);
        if (connectedPeer) {
            io.to(connectedUserSocketId).emit('webRTC-signaling' , data);
        }
    })

    socket.on('userHangedUp' , (data) => {
        const {connectedUserSocketId} = data;
        const connectedPeer = connectedPeers.find((peerSocketId) => peerSocketId === connectedUserSocketId);
        if (connectedPeer) {
            io.to(connectedUserSocketId).emit('userHangedUp' , data);
        }
    })

    socket.on('stranger-connection-status' , (data) => {
        const status = data;
        if (status) {
            strangerPeers.push(socket.id);
        }
        else {
            const newStrangerPeers = strangerPeers.filter((peerSocketId) => peerSocketId !== socket.id);
            strangerPeers = newStrangerPeers;
        }
    })

    socket.on('get-stranger-socketId' , (strangerCallType) => {
        let randomStrangerSocketId = '';
        const {strangerCallTypee} = strangerCallType;
      
        if (strangerCallTypee == "video") {
            strangerPeersVideo.add(socket.id);
            strangerPeersAudio.delete(socket.id);

            matchStranger(strangerCallType);
        }
        else if (strangerCallTypee == "audio") {
            strangerPeersVideo.delete(socket.id);
            strangerPeersAudio.add(socket.id);

            matchStranger(strangerCallType);
        }
        else {
            randomStrangerSocketId = null;
            const data = { randomStrangerSocketId };
            io.to(socket.id).emit('stranger-socketId' , data);
        }  
    })

    socket.on('abrupt-close' , (data) => {
        const {callerSocketId} = data || {};
        const connectedPeer = connectedPeers.find((peerSocketId) => peerSocketId === callerSocketId);
        if (connectedPeer) {
            io.to(callerSocketId).emit('abrupt-close-done' , data);
        }
    })

    socket.on('disconnect' , () => {
        const user = SocketuserMap[socket.id];
        if (user) {
            delete SocketuserMap[socket.id];
            delete userSocketMap[user];
        }

        const newconnectedPeers = connectedPeers.filter((peerSocketId) => 
            peerSocketId !== socket.io
        )
        connectedPeers = newconnectedPeers;

        const newconnectedStranger = strangerPeers.filter((peerSocketId) => 
            peerSocketId !== socket.io
        )
        strangerPeers = newconnectedStranger;
    })
})


async function matchStranger (strangerCallType)
{
    const {strangerCallTypee} = strangerCallType;

    await lock.acquire('matchStranger' , async () => {
        if ((strangerCallTypee == "video") &&  strangerPeersVideo.size >= 2) {
            const userArray = Array.from(strangerPeersVideo);

            const index1 = Math.floor(Math.random() * userArray.length);
            let index2 = Math.floor(Math.random() * userArray.length);

            while (index2 === index1) {
                index2 = Math.floor(Math.random() * userArray.length);
            }
            
            const user1Id = userArray[index1];
            const user2Id = userArray[index2];

            strangerPeersVideo.delete(user1Id);
            strangerPeersVideo.delete(user2Id);

            io.to(user1Id).emit('stranger-socketId' , {randomStrangerSocketId : user2Id});
            // io.to(user2Id).emit('stranger-socketId' , {randomStrangerSocketId : user1Id});
        }

        if ((strangerCallTypee == "audio") &&  strangerPeersAudio.size >= 2) {
            const userArray = Array.from(strangerPeersAudio);

            const index1 = Math.floor(Math.random() * userArray.length);
            let index2 = Math.floor(Math.random() * userArray.length);

            while (index2 === index1) {
                index2 = Math.floor(Math.random() * userArray.length);
            }
            
            const user1Id = userArray[index1];
            const user2Id = userArray[index2];
            
            strangerPeersAudio.delete(user1Id);
            strangerPeersAudio.delete(user2Id);
            
            io.to(user1Id).emit('stranger-socketId' , {randomStrangerSocketId : user2Id});
            // io.to(user2Id).emit('stranger-socketId' , {randomStrangerSocketId : user1Id});
        }
    })
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



const authRoutes = require('./routes/auth_routes')
const profileRoutes = require('./routes/profile_routes')

const dburl = process.env.dburl
const sessionsecret = process.env.sessionsecret
const anothersecret = process.env.anothersecret
const store = MongoStore.create({
    mongoUrl: dburl,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret : sessionsecret
    }
});
store.on("error" , function(e) {
    console.log("session storing error" , e);
})
const sessionConfig = {
    store ,
    name : 'naman' ,
    secret : anothersecret,
    resave : false ,
    saveUninitialized : true ,
    cookie : {
        httpOnly : true , 
        expires : Date.now() + 1000*60*60*24*2 , 
        maxAge : 1000*60*60*24*2
    }
}
app.use(Session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(dburl , {
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});


app.use('/auth' , authRoutes);
app.use('/profile' , profileRoutes);
app.use('/room' , roomRoutes)

app.get('/' , (req,res) => {
    res.render("home" , {user : req.user})
})


server.listen(3000, () => {
    console.log('Serving on port 3000')
})
