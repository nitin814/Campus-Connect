import * as store from './store.js'
import * as ui from './ui2.js'
import * as constants from './constants.js'

const socket = io('/');

let lols;
let lils;
let connectedUserDetails;
let peerConnection;
let dataChannel;

export const getLocalPreview = () => {
    console.log("yoyoycamein here");
    navigator.mediaDevices.getUserMedia({video : true , audio : true})
    .then((stream) => {
        ui.updateLocalVideo(stream)
        ui.showVideoCallButtons()
        store.setCallState(constants.callState.CALL_AVAILABLE)
      
        store.setLocalStream(stream)
    })
    .catch((err) => { console.log(err)})
};


const configuration = {
    iceServers : [
        {
            urls : 'stun:stun.l.google.com:13902'
        }]}
// if we want to establish a direct peer connection , then we need to create a RTCPeerConnection object on both sides
const createPeerConnection = () => {
    peerConnection = new RTCPeerConnection(configuration);
    
    dataChannel = peerConnection.createDataChannel('chat');

    peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        
        dataChannel.onopen = () => {
            console.log("peer connection is ready to receive data channel messages")
        }

        dataChannel.onmessage = (event) => {
           
            const message = JSON.parse(event.data);
            ui.appendMessage(message , false);
        }
    }

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendDataUsingWebRTCSignaling({
                connectedUserSocketId : connectedUserDetails.callerSocketId,
                type : constants.webRTCSignaling.ICE_CANDIDATE,
                candidate : event.candidate,
            })
           
        }
    }
    
   
    peerConnection.onconnectionstatechange = (event) => {
        if (peerConnection.connectionState === 'connected') {
            console.log("succesfully connected with other peer")
        }
    }

   
    const remoteStream = new MediaStream();
    store.setRemoteStream(remoteStream)
    ui.updateRemoteVideo(remoteStream) // initially doesnt contain any tracks , so nothing will happen

    peerConnection.ontrack = (event) => {  
        remoteStream.addTrack(event.track)

    }

  
    if (((lols &&  lols === constants.callType.VIDEO_PERSONAL_CODE) || (connectedUserDetails.callType && connectedUserDetails.callType === constants.callType.VIDEO_PERSONAL_CODE)) || ((lols &&  lols === constants.callType.VIDEO_STRANGER) || (connectedUserDetails.callType && connectedUserDetails.callType === constants.callType.VIDEO_STRANGER))) {
    // if (connectedUserDetails.preOfferAnswer === constants.callType.VIDEO_PERSONAL_CODE || lols === constants.callType.VIDEO_PERSONAL_CODE) {
        const localStream = store.getState().localStream;
        for (const track of localStream.getTracks()) {
            peerConnection.addTrack(track , localStream)
        }
    }
};

socket.on('connect' , () => {
    console.log("successfully connected to socket.io server")
    console.log(socket.id)
    store.setSocketId(socket.id)
    ui.updatePersonalCode(socket.id)
})



getLocalPreview();


const sendPreOfferAnswer = (preOfferAnswer , CallerSocketId = null) => {
    const callerSocketId = CallerSocketId ? CallerSocketId : connectedUserDetails.callerSocketId;

    const data = {
        callerSocketId : callerSocketId,
        preOfferAnswer
    }
    console.log("latest ,...sending pre offer answer " , data);
    ui.removeAllDialogs()
    socket.emit('stranger-pre-offer-answer' , data)
}

 
socket.on('pre-offer' , (data) => {
    const {callType , callerSocketId} = data;
    
    if (!isCallPossible(callType)) {
        return sendPreOfferAnswer(constants.preOfferAnswer.CALL_UNAVAILABLE , callerSocketId);
    }

    connectedUserDetails = {
        callType,
        callerSocketId
    } 
    store.setCallState(constants.callState.CALL_UNAVAILABLE)

    if (callType === constants.callType.CHAT_PERSONAL_CODE || callType === constants.callType.VIDEO_PERSONAL_CODE) {
        ui.showIncomingCallDialog(callType , acceptCallHandler , rejectCallHandler)
    }
    if (callType === constants.callType.CHAT_STRANGER || callType === constants.callType.VIDEO_STRANGER) {
        createPeerConnection()
        sendPreOfferAnswer(constants.preOfferAnswer.CALL_ACCEPTED)
        ui.showCallElements(callType)
    }
}) 

const isCallPossible = (callType) => {
    const callState = store.getState().callState;

    if (callState === constants.callState.CALL_AVAILABLE) {
        return true;
    }

    if ((callType === constants.callType.VIDEO_STRANGER || callType === constants.callType.VIDEO_PERSONAL_CODE) && callState === constants.callState.CALL_AVAILABLE_ONLY_CHAT) {
        return false;
    }
    return false;
}

const acceptCallHandler = () => {
   
    createPeerConnection();
    sendPreOfferAnswer(constants.preOfferAnswer.CALL_ACCEPTED);
    ui.showCallElements(connectedUserDetails.callType);
}

const rejectCallHandler = () => {
    setIncommingCallsAvailable();
    sendPreOfferAnswer(constants.preOfferAnswer.CALL_REJECTED);
}

const personalCopyButton = document.getElementById('personal_code_copy_button')
personalCopyButton.addEventListener('click' , () => {
    const personalCode = store.getState().socketId
    navigator.clipboard && navigator.clipboard.writeText(personalCode)
})

socket.on('pre-offer-answer' , (data) => {
    connectedUserDetails = data;
    const { preOfferAnswer } = data;
    ui.removeAllDialogs();

    if (preOfferAnswer === constants.preOfferAnswer.CALLEE_NOT_FOUND || preOfferAnswer === constants.preOfferAnswer.CALL_UNAVAILABLE || preOfferAnswer === constants.preOfferAnswer.CALL_REJECTED) {
        setIncommingCallsAvailable();
        ui.showInfoDialog(preOfferAnswer);
    }
    else if (preOfferAnswer === constants.preOfferAnswer.CALL_ACCEPTED) {
        ui.showCallElements(lols);
        createPeerConnection();
        sendWebRTCOffer();
    }
});

const callingDialogRejectCallHandler = () => {
    console.log(connectedUserDetails);
    const data = {
        connectedUserSocketId : connectedUserDetails.callerSocketId,
    }
    
    closePeerConnectionAndResetState();
   
    socket.emit('userHangedUp' , data)
}


const sendWebRTCOffer = async () => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log("latest latest " , connectedUserDetails.callerSocketId);
    sendDataUsingWebRTCSignaling({
        connectedUserSocketId : connectedUserDetails.callerSocketId,
        type : constants.webRTCSignaling.OFFER,
        offer : offer
    })
}

const sendDataUsingWebRTCSignaling = (data) => {
    // console.log("sending data using webRTC signaling")
    socket.emit('webRTC-signaling' , data) 
}

socket.on('webRTC-signaling' , (data) => {  
  
    if (data.type === constants.webRTCSignaling.OFFER)
    {
        handleWebRtcOffer(data);
    }
    else if (data.type === constants.webRTCSignaling.ANSWER)
    {
        handleWebRtcAnswer(data);
    }
    else if (data.type === constants.webRTCSignaling.ICE_CANDIDATE)
    {   
        handleWebRtcIceCandidate(data);
    }  
})

// callee side , receiving the webRTC offer from the caller and sending answer to the caller
const handleWebRtcOffer = async (data) => {
    await peerConnection.setRemoteDescription(data.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    sendDataUsingWebRTCSignaling({
        connectedUserSocketId : connectedUserDetails.callerSocketId,
        type : constants.webRTCSignaling.ANSWER,
        answer : answer
    })
}

const handleWebRtcAnswer = async (data) => {
  
    await peerConnection.setRemoteDescription(data.answer);
}

// the local user will add the ice candidates recieved from the remote user to the peer connection
const handleWebRtcIceCandidate = async (data) => {
    try { 
      
        await peerConnection.addIceCandidate(data.candidate); }
    catch (err) { console.error(err) }
}



const micButton = document.getElementById('mic_button')
micButton.addEventListener('click' , () => {
    const localStream = store.getState().localStream;
    const micEnabled = localStream.getAudioTracks()[0].enabled;
    localStream.getAudioTracks()[0].enabled = !micEnabled;
    ui.updateMicButton(micEnabled);
})

const cameraButton = document.getElementById('camera_button')
cameraButton.addEventListener('click' , () => {
    const localStream = store.getState().localStream;
    const cameraEnabled = localStream.getVideoTracks()[0].enabled;
    localStream.getVideoTracks()[0].enabled = !cameraEnabled;
    ui.updateCameraButton(cameraEnabled);
})  

const ScreenSharingButton = document.getElementById('screen_sharing_button') 
ScreenSharingButton.addEventListener('click' , () => {
  
    const screenSharingActive = store.getState().screenSharingActive;
    switchScreenSharingStateAndCamera(screenSharingActive);
}) 



let screenSharingStream;

const switchScreenSharingStateAndCamera = async (screenSharingActive) => {
    if (screenSharingActive) {
        const localStream = store.getState().localStream;
        const senders = peerConnection.getSenders();
    
        const sender = senders.find((sender) => {
          return sender.track.kind === localStream.getVideoTracks()[0].kind;
        });
    
        if (sender) {
          sender.replaceTrack(localStream.getVideoTracks()[0]);
        }
    
        store
          .getState()
          .screenSharingStream.getTracks()
          .forEach((track) => track.stop());
    
        store.setScreenSharingActive(!screenSharingActive);
    
        ui.updateLocalVideo(localStream);
      } else {
        console.log("switching for screen sharing");
        try {
          screenSharingStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
          });
          store.setScreenSharingStream(screenSharingStream);
    
          // replace track which sender is sending
          const senders = peerConnection.getSenders();
    
          const sender = senders.find((sender) => {
            return (
              sender.track.kind === screenSharingStream.getVideoTracks()[0].kind
            );
          });
    
          if (sender) {
            sender.replaceTrack(screenSharingStream.getVideoTracks()[0]);
          }
    
          store.setScreenSharingActive(!screenSharingActive);
    
          ui.updateLocalVideo(screenSharingStream);
        } catch (err) {
          console.error(
            "error occured when trying to get screen sharing stream",
            err
          );
        } 
    }
}



const newMessageInput = document.getElementById('new_message_input')
newMessageInput.addEventListener('keydown' , (event) => {
    const key = event.key;
    if (key === 'Enter') {
        sendMessageUsingDataChannel(event.target.value);
        ui.appendMessage(event.target.value , true);
        newMessageInput.value = "";
    }
})
const sendMessageButton = document.getElementById('send_message_button')
sendMessageButton.addEventListener('click' , () => {
    const message = newMessageInput.value;
    sendMessageUsingDataChannel(message);
    ui.appendMessage(message , true);
    newMessageInput.value = "";
})


const sendMessageUsingDataChannel = (message) => {
    // we will stringify the message as the data cannot be passed as a json object
    const stringifiedMessage = JSON.stringify(message);
    dataChannel.send(stringifiedMessage);
}



socket.on('userHangedUp' , (data) => {
    closePeerConnectionAndResetState();
})


const handleHangUp = () => {
    const data = {
        connectedUserSocketId : connectedUserDetails.callerSocketId
    }
    socket.emit('userHangedUp' , data)
    closePeerConnectionAndResetState();
}

const handUpButton = document.getElementById('hang_up_button')
handUpButton.addEventListener('click' , () => {
    handleHangUp();
})
const hangUpButton = document.getElementById('finish_chat_call_button')
hangUpButton.addEventListener('click' , () => {
    handleHangUp();
})

const closePeerConnectionAndResetState = () => {
    if (peerConnection)
    {
        peerConnection.close();
        peerConnection = null;
    }
    
    let finalCallType = null;
    if (lols)
    { finalCallType = lols; }
    else if (connectedUserDetails.callType)
    { finalCallType = connectedUserDetails.callType; }
     
    // incase we have turned off camera and mic in the previous connections , we would like to reset them to true again
    if (finalCallType === constants.callType.VIDEO_PERSONAL_CODE || finalCallType === constants.callType.VIDEO_STRANGER) {
        store.getState().localStream.getVideoTracks()[0].enabled = true;
        store.getState().localStream.getAudioTracks()[0].enabled = true;
    }

    ui.updateUIAfterHangUp(finalCallType);
    setIncommingCallsAvailable();
    connectedUserDetails = null;
    lols = null;
}



const setIncommingCallsAvailable = () => {
    const localStream = store.getState().localStream;
    if (localStream) {
      store.setCallState(constants.callState.CALL_AVAILABLE);
    } else {
      store.setCallState(constants.callState.CALL_AVAILABLE_ONLY_CHAT);
    }
}












let strangerCallType;

socket.on('stranger-socketId' , (data) => {
    console.log(data);
    if (data.randomStrangerSocketId)
    {
        const newdata = {callType : strangerCallType , calleePersonalCode : data.randomStrangerSocketId}
        if (newdata.callType === constants.callType.CHAT_STRANGER || newdata.callType === constants.callType.VIDEO_STRANGER) {
            store.setCallState(constants.callState.CALL_UNAVAILABLE)

            socket.emit('stranger-pre-offer' , newdata);
        }
    }
    else
    {
        ui.showNoStrangerAvailableDialog();
    } 
})

const changeStrangerconnectionStatus = (checkboxState) => {
    socket.emit('stranger-connection-status' , checkboxState)
}

const strangerChatButton = document.getElementById('stranger_chat_button')
const strangerVideoButton = document.getElementById('stranger_video_button')

strangerChatButton.addEventListener('click' , () => {
    strangerCallType = constants.callType.CHAT_STRANGER
    lols = constants.callType.CHAT_STRANGER
    const strangerCallTypee = "audio";
    socket.emit('get-stranger-socketId' , {strangerCallTypee})
})

strangerVideoButton.addEventListener('click' , () => {
    strangerCallType = constants.callType.VIDEO_STRANGER
    lols = constants.callType.VIDEO_STRANGER
    const strangerCallTypee = "video";
    socket.emit('get-stranger-socketId' , {strangerCallTypee})
})


window.addEventListener('beforeunload', function(event) {
    // Close the peer connection or perform any necessary cleanup
    if (connectedUserDetails)
        socket.emit("abrupt-close" , connectedUserDetails);
    closePeerConnectionAndResetState();
});

socket.on('abrupt-close-done' , (data) => {
    closePeerConnectionAndResetState();
})

