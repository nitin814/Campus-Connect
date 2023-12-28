const socket = io('http://localhost:3000');
const messageContainer = document.getElementById('message-container');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');

const username = data.username;
const roomId = data.roomId;

socket.emit('join', {roomId , username});

socket.on('chat_message', data => {
  appendMessage(`${data.user}: ${data.message}`);
});

socket.on('user-disconnected' , () => {
  appendMessage(`A user disconnected`);
});

messageForm.addEventListener('submit', e => {
  e.preventDefault();
  const message = messageInput.value;
  appendMessage(`${username}: ${message}`);
  socket.emit('chat_message', { user: username, message, room: roomId });
  messageInput.value = '';
});

function appendMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.innerText = message;
  messageContainer.append(messageElement);
}
