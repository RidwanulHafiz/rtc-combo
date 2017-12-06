/** browser dependent definition are aligned to one and the same standard name **/
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition
    || window.msSpeechRecognition || window.oSpeechRecognition;

var config = {
    wssHost: 'wss://wotpal.club'
    // wssHost: 'wss://example.com/myWebSocket'
};
var localVideoElem = null,
    remoteVideoElem = null,
    localVideoStream = null,
    videoCallButton = null,
    endCallButton = null,
    localVideo = null,
    remoteVideo = null;
var peerConn = null,
    socket = io.connect('http://localhost:3000'),
    peerConnCfg = {
        'iceServers':
            [{'url': 'stun:stun.services.mozilla.com'},
                {'url': 'stun:stun.l.google.com:19302'}]
    };

function pageReady() {
    // check browser WebRTC availability
    if (navigator.getUserMedia) {
        videoCallButton = document.getElementById("videoCallButton");
        endCallButton = document.getElementById("endCallButton");
        localVideo = document.getElementById('localVideo');
        remoteVideo = document.getElementById('remoteVideo');
        console.log("Remote Video = "+remoteVideo);
        console.log(remoteVideo);
        videoCallButton.removeAttribute("disabled");
        videoCallButton.addEventListener("click", initiateCall);
        endCallButton.addEventListener("click", function (evt) {
            socket.emit('message', JSON.stringify({"closeConnection": true}));
        });
    } else {
        alert("Sorry, your browser does not support WebRTC!")
    }
};

function prepareCall() {
    peerConn = new RTCPeerConnection(peerConnCfg);
    // send any ice candidates to the other peer
    peerConn.onicecandidate = onIceCandidateHandler;
    // once remote stream arrives, show it in the remote video element
    peerConn.onaddstream = onAddStreamHandler;
};

// run start(true) to initiate a call
function initiateCall() {
    prepareCall();
    // get the local stream, show it in the local video element and send it
    navigator.getUserMedia({"audio": true, "video": true}, function (stream) {
        localVideoStream = stream;
        console.log(localVideo);
        localVideo.src = URL.createObjectURL(localVideoStream);
        peerConn.addStream(localVideoStream);
        createAndSendOffer();
    }, function (error) {
        console.log(error);
    });
};

function answerCall() {
    prepareCall();
    // get the local stream, show it in the local video element and send it
    navigator.getUserMedia({"audio": true, "video": true}, function (stream) {
        localVideoStream = stream;
        localVideo.src = URL.createObjectURL(localVideoStream);
        peerConn.addStream(localVideoStream);
        createAndSendAnswer();
    }, function (error) {
        console.log(error);
    });
};


socket.on('message', function (data) {
    var signal = null;
    if (!peerConn) answerCall();
    signal = JSON.parse(data);
    console.log(signal);
    if (signal.sdp) {
        console.log("Received SDP from remote peer.");
        // console.log(signal.sdp);
        // console.log(peerConn.setRemoteDescription(new RTCSessionDescription(signal.sdp)));
        peerConn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    }
    else if (signal.candidate) {
        console.log("Received ICECandidate from remote peer.");
        console.log(signal.candidate);
        // peerConn.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
    else if (signal.closeConnection) {
        console.log("Received 'close call' signal from remote peer.");
        endCall();
    }
});

function createAndSendOffer() {
    peerConn.createOffer(
        function (offer) {
            var off = new RTCSessionDescription(offer);
            peerConn.setLocalDescription(new RTCSessionDescription(off),
                function () {
                    console.log('createAndSendOffer', off);
                    socket.emit('message',JSON.stringify({"sdp": off}));
                },
                function (error) {
                    console.log(error);
                }
            );
        },
        function (error) {
            console.log(error);
        }
    );
};

function createAndSendAnswer() {
    peerConn.createAnswer(
        function (answer) {
            var ans = new RTCSessionDescription(answer);
            peerConn.setLocalDescription(ans, function () {
                    socket.emit('message',JSON.stringify({"sdp": ans}));
                },
                function (error) {
                    console.log(error);
                }
            );
        },
        function (error) {
            console.log(error);
        }
    );
};

function onIceCandidateHandler(evt) {
    if (!evt || !evt.candidate) return;
    socket.emit('message',JSON.stringify({"candidate": evt.candidate}));
};

function onAddStreamHandler(evt) {
    videoCallButton.setAttribute("disabled", true);
    endCallButton.removeAttribute("disabled");
    console.log('here I am');
    // set remote video stream as source for remote video HTML5 element
    console.log(remoteVideo);
    remoteVideo.src = URL.createObjectURL(evt.stream);
};

function endCall() {
    peerConn.close();
    peerConn = null;
    videoCallButton.removeAttribute("disabled");
    endCallButton.setAttribute("disabled", true);
    if (localVideoStream) {
        localVideoStream.getTracks().forEach(function (track) {
            track.stop();
        });
        localVideo.src = "";
    }
    if (remoteVideo) remoteVideo.src = "";
};