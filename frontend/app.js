const chatButton = document.getElementById("chat-button");
const chatScreen = document.getElementById("chat");

chatButton.addEventListener('click', function(){
 chatScreen.classList.toggle('hidden')
})