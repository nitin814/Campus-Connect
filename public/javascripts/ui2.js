import * as constants from './constants.js';
import * as elements from './elements.js';


export const updateLocalVideo = (stream) => {
  try {
    const localVideo = document.getElementById("local_video");
    if (localVideo) {
      localVideo.srcObject = stream;
      localVideo.addEventListener("loadedmetadata", () => {
        localVideo.play();
      });
    } else {
      console.error("Local video element not found");
    }
  } catch (error) {
    console.error("Error updating local video:", error);
  }
};

export const updateRemoteVideo = (stream) => {
  try {
    const remoteVideo = document.getElementById("remote_video");
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
      console.log("ok till here")
      // remoteVideo.addEventListener("loadedmetadata", () => {
      //   remoteVideo.play();
      // });
    } else {
      console.error("Remote video element not found");
    }
  } catch (error) {
    console.error("Error updating remote video:", error);
  }
};

const micOnImg = "/images/mic.png";
const micOffImg = "/images/micOff.png";
export const updateMicButton = (micActive) => {
    const micButton = document.getElementById('mic_button_image');
    micButton.src = micActive ? micOffImg : micOnImg; 
}

const cameraOnImg = "/images/camera.png";
const cameraOffImg = "/images/cameraOff.png";

export const updateCameraButton = (cameraActive) => {
    const cameraButton = document.getElementById('camera_button_image');
    cameraButton.src = cameraActive ? cameraOffImg : cameraOnImg;
}

export const showIncomingCallDialog = (callType, acceptCallHandler, rejectCallHandler) => {
    const callTypeInfoText = callType === constants.callType.CHAT_PERSONAL_CODE ? 'Chat' : 'Video';
    const incomingCallDialog = elements.getIncomingCallDialog(callTypeInfoText, acceptCallHandler, rejectCallHandler);
    const dialog = document.getElementById('dialog');
    // removing all existing child nodes
    dialog.querySelectorAll('*').forEach(n => n.remove())
    dialog.appendChild(incomingCallDialog);
}

export const showCallingDialog = (rejectCallHandler) => {
    const callingDialog = elements.getCallingDialog(rejectCallHandler);
    const dialog = document.getElementById('dialog');
    dialog.querySelectorAll('*').forEach(n => n.remove())
    dialog.appendChild(callingDialog); 
}

export const showInfoDialog = (preOfferAnswer) => {
    let infoDialog = '';
    if (preOfferAnswer === constants.preOfferAnswer.CALLEE_NOT_FOUND) {
        infoDialog = elements.getInfoDialog('Callee not found' , 'Busy hoga bhai ...');
    }
    if (preOfferAnswer === constants.preOfferAnswer.CALL_UNAVAILABLE) {
        infoDialog = elements.getInfoDialog('Callee is unavailable' , 'Please try later');
    }
    if (preOfferAnswer === constants.preOfferAnswer.CALL_REJECTED) {
        infoDialog = elements.getInfoDialog('Call rejected' , 'koi na ... hota hai');
    }
    const dialog = document.getElementById('dialog');
    dialog.querySelectorAll('*').forEach(n => n.remove())
    dialog.appendChild(infoDialog);

    setTimeout(() => {
        removeAllDialogs();
        removeAllDialogs();
    }, [4000])  
}
 
export const removeAllDialogs = () => {
    const dialog = document.getElementById('dialog');
    dialog.querySelectorAll('*').forEach(n => n.remove())
}


export const showCallElements = (callType) => {
    if (callType === constants.callType.CHAT_PERSONAL_CODE || callType === constants.callType.CHAT_STRANGER) {
      showChatCallElements();
    }
  
    if (callType === constants.callType.VIDEO_PERSONAL_CODE || callType === constants.callType.VIDEO_STRANGER) {
      showVideoCallElements();
    }
  };
  
  const showChatCallElements = () => {
    const finishConnectionChatButtonContainer = document.getElementById(
      "finish_chat_button_container"
    );
    showElement(finishConnectionChatButtonContainer);
  
    const newMessageInput = document.getElementById("new_message");
    showElement(newMessageInput);
    //block panel
    disableDashboard();
  };
  
  const showVideoCallElements = () => {
    const callButtons = document.getElementById("call_buttons");
    showElement(callButtons);
  
    const placeholder = document.getElementById("video_placeholder");
    hideElement(placeholder);
  
    const remoteVideo = document.getElementById("remote_video");
    showElement(remoteVideo);
  
    const newMessageInput = document.getElementById("new_message");
    showElement(newMessageInput);
    //block panel
    disableDashboard();
  };


const enableDashboard = () => {
    const dashboardBlocker = document.getElementById("dashboard_blur");
    if (!dashboardBlocker.classList.contains("display_none")) {
      dashboardBlocker.classList.add("display_none");
    }
  };
  
  const disableDashboard = () => {
    const dashboardBlocker = document.getElementById("dashboard_blur");
    if (dashboardBlocker.classList.contains("display_none")) {
      dashboardBlocker.classList.remove("display_none");
    }
  };
  
  const hideElement = (element) => {
    if (!element.classList.contains("display_none")) {
      element.classList.add("display_none");
    }
  };
  
  const showElement = (element) => {
    if (element.classList.contains("display_none")) {
      element.classList.remove("display_none");
    }
  };



// ui messages
export const appendMessage = (message, right = false) => {
    const messagesContainer = document.getElementById("messages_container");
    const messageElement = right ? elements.getRightMessage(message) : elements.getLeftMessage(message);
    messagesContainer.appendChild(messageElement);
  };
  
export const clearMessenger = () => {
    const messagesContainer = document.getElementById("messages_container");
    messagesContainer.querySelectorAll("*").forEach((n) => n.remove());
  };
  



export const updateUIAfterHangUp = (callType) => {
  enableDashboard();
  
  if (callType === constants.callType.VIDEO_PERSONAL_CODE || callType === constants.callType.VIDEO_STRANGER) {
      const callButtons = document.getElementById("call_buttons");
      hideElement(callButtons);
  }
  else
  {
      const chatCallButtons = document.getElementById("finish_chat_button_container");
      hideElement(chatCallButtons);
  }

  const newMessageInput = document.getElementById("new_message");
  hideElement(newMessageInput);
  clearMessenger();
  updateMicButton(false);
  updateCameraButton(false);

  const remoteVideo = document.getElementById("remote_video");
  hideElement(remoteVideo);
  
  const placeholder = document.getElementById("video_placeholder");
  showElement(placeholder);

  removeAllDialogs();
}

export const showVideoCallButtons = () => {
  const strangerButton = document.getElementById("stranger_video_button");
  showElement(strangerButton);
}


export const showNoStrangerAvailableDialog = () => {
  const dialog = elements.getInfoDialog('No stranger available' , 'Try again later');
  const dialogContainer = document.getElementById('dialog');
  
  dialogContainer.appendChild(dialog);

  setTimeout(() => {
    removeAllDialogs();
  }, [4000])
}
