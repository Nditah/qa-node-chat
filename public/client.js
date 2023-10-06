$(document).ready(function() {
  // Form submittion with new message in field with id 'm'
  $('form').submit(function() {
    var messageToSend = $('#m').val();
    socket.emit('chat message', messageToSend);
    $('#m').val('');
    return false; // prevent form submit from refreshing page
  });


});

/*global io*/
let socket = io();
socket.on("connect", () => {
  console.log(socket.id);
});

socket.on('user', data => {
  console.log('user', data.username);
  $('#num-users').text(data.currentUsers + ' users online');
  let message =
    data.username +
    (data.connected ? ' has joined the chat.' : ' has left the chat.');
  $('#messages').append($('<li>').html('<b>' + message + '</b>'));
});

socket.on('chat message', (data) => {
  console.log('chat message', data);
  const { username, message } = data;
  $('#messages').append($('<li>').html(`${username}: <i>${message}</i>`));
});

socket.on('disconnect', () => {
  console.log('Client:: User has disconnect');
});
