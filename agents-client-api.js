/* eslint-disable no-mixed-operators */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable eqeqeq */
/* eslint-disable strict */
/* eslint-disable no-empty-pattern */
"use strict";
const fetchJsonFile = await fetch("./api.json");
const DID_API = await fetchJsonFile.json();

if (DID_API.key == "🤫")
  alert("Please put your api key inside ./api.json and restart..");

const RTCPeerConnection = (
  window.RTCPeerConnection ||
  window.webkitRTCPeerConnection ||
  window.mozRTCPeerConnection
).bind(window);

let peerConnection;
let streamId;
let sessionId;
let sessionClientAnswer;
let statsIntervalId;
let videoIsPlaying;
let lastBytesReceived;
let agentId;
let chatId;

const videoElement = document.getElementById("video-element");
videoElement.setAttribute("playsinline", "");
const peerStatusLabel = document.getElementById("peer-status-label");
const iceStatusLabel = document.getElementById("ice-status-label");
const iceGatheringStatusLabel = document.getElementById(
  "ice-gathering-status-label"
);
const signalingStatusLabel = document.getElementById("signaling-status-label");
const streamingStatusLabel = document.getElementById("streaming-status-label");
const agentIdLabel = document.getElementById("agentId-label");
const chatIdLabel = document.getElementById("chatId-label");
const textArea = document.getElementById("textArea");

window.onload = (event) => {
  playIdleVideo();

  if (agentId == "" || agentId == undefined) {
    console.log(
      "Empty 'agentID' and 'chatID' variables\n\n1. Click on the 'Create new Agent with Knowledge' button\n2. Open the Console and wait for the process to complete\n3. Press on the 'Connect' button\n4. Type and send a message to the chat\nNOTE: You can store the created 'agentID' and 'chatId' variables at the bottom of the JS file for future chats"
    );
  } else {
    console.log(
      "You are good to go!\nClick on the 'Connect Button', Then send a new message\nAgent ID: ",
      agentId,
      "\nChat ID: ",
      chatId
    );
    agentIdLabel.innerHTML = agentId;
    chatIdLabel.innerHTML = chatId;
  }
};
async function createPeerConnection(offer, iceServers) {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection({ iceServers });
    peerConnection.addEventListener(
      "icegatheringstatechange",
      onIceGatheringStateChange,
      true
    );
    peerConnection.addEventListener("icecandidate", onIceCandidate, true);
    peerConnection.addEventListener(
      "iceconnectionstatechange",
      onIceConnectionStateChange,
      true
    );
    peerConnection.addEventListener(
      "connectionstatechange",
      onConnectionStateChange,
      true
    );
    peerConnection.addEventListener(
      "signalingstatechange",
      onSignalingStateChange,
      true
    );
    peerConnection.addEventListener("track", onTrack, true);
  }

  await peerConnection.setRemoteDescription(offer);
  console.log("set remote sdp OK");

  const sessionClientAnswer = await peerConnection.createAnswer();
  console.log("create local sdp OK");

  await peerConnection.setLocalDescription(sessionClientAnswer);
  console.log("set local sdp OK");
  let dc = await peerConnection.createDataChannel("JanusDataChannel");
  dc.onopen = () => {
    console.log("datachannel open");
  };

  let decodedMsg;
  dc.onmessage = (event) => {
    let msg = event.data;
    console.log(event, "event");
    let msgType = "chat/answer:";
    if (msg.includes(msgType)) {
      msg = decodeURIComponent(msg.replace(msgType, ""));
      decodedMsg = msg;
      return decodedMsg;
    }
    if (msg.includes("stream/started")) {
      console.log(msg);
      document.getElementById(
        "msgHistory"
      ).innerHTML += `<span>${decodedMsg}</span><br><br>`;
    } else {
      console.log(msg);
    }
  };

  dc.onclose = () => {
    console.log("datachannel close");
  };

  return sessionClientAnswer;
}
function onIceGatheringStateChange() {
  iceGatheringStatusLabel.innerText = peerConnection.iceGatheringState;
  iceGatheringStatusLabel.className =
    "iceGatheringState-" + peerConnection.iceGatheringState;
}
function onIceCandidate(event) {
  if (event.candidate) {
    const { candidate, sdpMid, sdpMLineIndex } = event.candidate;

    fetch(`${DID_API.url}/${DID_API.service}/streams/${streamId}/ice`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        candidate,
        sdpMid,
        sdpMLineIndex,
        session_id: sessionId,
      }),
    });
  }
}
function onIceConnectionStateChange() {
  iceStatusLabel.innerText = peerConnection.iceConnectionState;
  iceStatusLabel.className =
    "iceConnectionState-" + peerConnection.iceConnectionState;
  if (
    peerConnection.iceConnectionState === "failed" ||
    peerConnection.iceConnectionState === "closed"
  ) {
    stopAllStreams();
    closePC();
  }
}
function onConnectionStateChange() {
  // not supported in firefox
  peerStatusLabel.innerText = peerConnection.connectionState;
  peerStatusLabel.className =
    "peerConnectionState-" + peerConnection.connectionState;
}
function onSignalingStateChange() {
  signalingStatusLabel.innerText = peerConnection.signalingState;
  signalingStatusLabel.className =
    "signalingState-" + peerConnection.signalingState;
}
function onVideoStatusChange(videoIsPlaying, stream) {
  let status;
  if (videoIsPlaying) {
    status = "streaming";

    const remoteStream = stream;
    setVideoElement(remoteStream);
  } else {
    status = "empty";
    playIdleVideo();
  }
  streamingStatusLabel.innerText = status;
  streamingStatusLabel.className = "streamingState-" + status;
}
function onTrack(event) {
  if (!event.track) return;
  statsIntervalId = setInterval(async () => {
    const stats = await peerConnection.getStats(event.track);
    stats.forEach((report) => {
      if (report.type === "inbound-rtp" && report.kind === "video") {
        const videoStatusChanged =
          videoIsPlaying !== report.bytesReceived > lastBytesReceived;

        if (videoStatusChanged) {
          videoIsPlaying = report.bytesReceived > lastBytesReceived;
          onVideoStatusChange(videoIsPlaying, event.streams[0]);
        }
        lastBytesReceived = report.bytesReceived;
      }
    });
  }, 500);
}
function setVideoElement(stream) {
  if (!stream) return;
  videoElement.classList.add("animated");
  videoElement.muted = false;
  videoElement.srcObject = stream;
  videoElement.loop = false;
  setTimeout(() => {
    videoElement.classList.remove("animated");
  }, 1000);
  if (videoElement.paused) {
    videoElement
      .play()
      .then((_) => {})
      .catch((e) => {});
  }
}
function playIdleVideo() {
  videoElement.classList.toggle("animated");
  videoElement.srcObject = undefined;
  videoElement.src = "512french.mp4";
  videoElement.loop = true;
  setTimeout(() => {
    videoElement.classList.remove("animated");
  }, 1000);
}
function stopAllStreams() {
  if (videoElement.srcObject) {
    console.log("stopping video streams");
    videoElement.srcObject.getTracks().forEach((track) => track.stop());
    videoElement.srcObject = null;
  }
}
function closePC(pc = peerConnection) {
  if (!pc) return;
  console.log("stopping peer connection");
  pc.close();
  pc.removeEventListener(
    "icegatheringstatechange",
    onIceGatheringStateChange,
    true
  );
  pc.removeEventListener("icecandidate", onIceCandidate, true);
  pc.removeEventListener(
    "iceconnectionstatechange",
    onIceConnectionStateChange,
    true
  );
  pc.removeEventListener(
    "connectionstatechange",
    onConnectionStateChange,
    true
  );
  pc.removeEventListener("signalingstatechange", onSignalingStateChange, true);
  pc.removeEventListener("track", onTrack, true);
  clearInterval(statsIntervalId);
  iceGatheringStatusLabel.innerText = "";
  signalingStatusLabel.innerText = "";
  iceStatusLabel.innerText = "";
  peerStatusLabel.innerText = "";
  console.log("stopped peer connection");
  if (pc === peerConnection) {
    peerConnection = null;
  }
}
const maxRetryCount = 3;
const maxDelaySec = 4;
async function fetchWithRetries(url, options, retries = 1) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (retries <= maxRetryCount) {
      const delay =
        Math.min(Math.pow(2, retries) / 4 + Math.random(), maxDelaySec) * 1000;

      await new Promise((resolve) => setTimeout(resolve, delay));

      console.log(
        `Request failed, retrying ${retries}/${maxRetryCount}. Error ${err}`
      );
      return fetchWithRetries(url, options, retries + 1);
    } else {
      throw new Error(`Max retries exceeded. error: ${err}`);
    }
  }
}

// Connect Function
async function connectButton() {
  if (agentId == "" || agentId === undefined) {
    return alert(
      "1. Click on the 'Create new Agent with Knowledge' button\n2. Open the Console and wait for the process to complete\n3. Press on the 'Connect' button\n4. Type and send a message to the chat\nNOTE: You can store the created 'agentID' and 'chatId' variables at the bottom of the JS file for future chats"
    );
  }

  if (peerConnection && peerConnection.connectionState === "connected") {
    return;
  }
  stopAllStreams();
  closePC();

  // WEBRTC API CALL 1 - Create a new stream
  const sessionResponse = await fetchWithRetries(
    `${DID_API.url}/${DID_API.service}/streams`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url:
          "https://create-images-results.d-id.com/DefaultPresenters/Emma_f/v1_image.jpeg",
      }),
    }
  );

  const {
    id: newStreamId,
    offer,
    ice_servers: iceServers,
    session_id: newSessionId,
  } = await sessionResponse.json();
  streamId = newStreamId;
  sessionId = newSessionId;
  try {
    sessionClientAnswer = await createPeerConnection(offer, iceServers);
  } catch (e) {
    console.log("error during streaming setup", e);
    stopAllStreams();
    closePC();
    return;
  }

  // WEBRTC API CALL 2 - Start a stream
  const sdpResponse = await fetch(
    `${DID_API.url}/${DID_API.service}/streams/${streamId}/sdp`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer: sessionClientAnswer,
        session_id: sessionId,
      }),
    }
  );
}

const startButton = document.getElementById("start-button");
async function handlerSubmit(event) {
  event.preventDefault();
  await agentsButton();
  await connectButton();
  if (
    peerConnection?.signalingState === "stable" ||
    peerConnection?.iceConnectionState === "connected"
  ) {
    document.getElementById(
      "msgHistory"
    ).innerHTML += `<span style='opacity:0.5'><u>User:</u> ${textArea.value}</span><br>`;
    let txtAreaValue = document.getElementById("textArea").value;
    document.getElementById("textArea").value = "";
    const playResponse = await fetchWithRetries(
      `${DID_API.url}/agents/${agentId}/chat/${chatId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${DID_API.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          streamId: streamId,
          sessionId: sessionId,
          messages: [
            {
              role: "user",
              content: txtAreaValue,
              created_at: new Date().toString(),
            },
          ],
        }),
      }
    );
    const playResponseData = await playResponse.json();
    if (
      playResponse.status === 200 &&
      playResponseData.chatMode === "TextOnly"
    ) {
      console.log("User is out of credit, API only return text messages");
      document.getElementById(
        "msgHistory"
      ).innerHTML += `<span style='opacity:0.5'> ${playResponseData.result}</span><br>`;
    }
  }
}
document.getElementById("myForm").addEventListener("submit", handlerSubmit);

const destroyButton = document.getElementById("destroy-button");
destroyButton.onclick = async () => {
  await fetch(`${DID_API.url}/${DID_API.service}/streams/${streamId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Basic ${DID_API.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session_id: sessionId }),
  });

  stopAllStreams();
  closePC();
};
async function agentsAPIworkflow() {
  agentIdLabel.innerHTML = `<span style='color:orange'>Processing...<style='color:orange'>`;
  chatIdLabel.innerHTML = `<span style='color:orange'>Processing...<style='color:orange'>`;
  axios.defaults.baseURL = `${DID_API.url}`;
  axios.defaults.headers.common["Authorization"] = `Basic ${DID_API.key}`;
  axios.defaults.headers.common["content-type"] = "application/json";
  async function retry(url, retries = 1) {
    const maxRetryCount = 5; // Maximum number of retries
    const maxDelaySec = 10; // Maximum delay in seconds
    try {
      let response = await axios.get(`${url}`);
      if (response.data.status == "done") {
        return console.log(response.data.id + ": " + response.data.status);
      } else {
        throw new Error("Status is not 'done'");
      }
    } catch (err) {
      if (retries <= maxRetryCount) {
        const delay =
          Math.min(Math.pow(2, retries) / 4 + Math.random(), maxDelaySec) *
          1000;

        await new Promise((resolve) => setTimeout(resolve, delay));

        console.log(`Retrying ${retries}/${maxRetryCount}. ${err}`);
        return retry(url, retries + 1);
      } else {
        agentIdLabel.innerHTML = `<span style='color:red'>Failed</span>`;
        chatIdLabel.innerHTML = `<span style='color:red'>Failed</span>`;
        throw new Error(`Max retries exceeded. error: ${err}`);
      }
    }
  }

  const createAgent = await axios.post("/agents", {
    presenter: {
      type: "talk",
      voice: {
        type: "microsoft",
        voice_id: "en-US-JennyMultilingualV2Neural",
      },
      thumbnail:
        "https://create-images-results.d-id.com/DefaultPresenters/Emma_f/v1_image.jpeg",
      source_url:
        "https://create-images-results.d-id.com/DefaultPresenters/Emma_f/v1_image.jpeg",
    },
    llm: {
      type: "openai",
      provider: "openai",
      model: "gpt-3.5-turbo-1106",
      instructions:
        "Your name is Emma, an AI designed to assist with information about Prompt Engineering and RAG",
    },
    preview_name: "Emma",
  });
  console.log("Create Agent: ", createAgent.data);
  let agentId = createAgent.data.id;
  console.log("Agent ID: " + agentId);

  const createChat = await axios.post(`/agents/${agentId}/chat`);
  console.log("Create Chat: ", createChat.data);
  let chatId = createChat.data.id;
  console.log("Chat ID: " + chatId);
  console.log(
    "Create new Agent with Knowledge - DONE!\n Press on the 'Connect' button to proceed.\n Store the created 'agentID' and 'chatId' variables at the bottom of the JS file for future chats"
  );
  agentIdLabel.innerHTML = agentId;
  chatIdLabel.innerHTML = chatId;
  return { agentId: agentId, chatId: chatId };
}

// Agent And Chat Id Genearte Function
async function agentsButton() {
  try {
    const agentsIds = ({} = await agentsAPIworkflow());
    console.log(agentsIds);
    agentId = agentsIds.agentId;
    chatId = agentsIds.chatId;
    return;
  } catch (err) {
    agentIdLabel.innerHTML = `<span style='color:red'>Failed</span>`;
    chatIdLabel.innerHTML = `<span style='color:red'>Failed</span>`;
    throw new Error(err);
  }
}

agentId = "";
chatId = "";
