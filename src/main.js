import { Conversation } from '@elevenlabs/client';
import './styles.css';

const AGENT_ID = 'agent_4401m4tzsjk2en4a3y375h16fjx5';
const startButton = document.querySelector('#start-button');
const endButton = document.querySelector('#end-button');
const muteButton = document.querySelector('#mute-button');
const controls = document.querySelector('#controls');
const statusText = document.querySelector('#status-text');
const statusDot = document.querySelector('#status-dot');
const orbZone = document.querySelector('#orb-zone');
const timer = document.querySelector('#timer');
const helper = document.querySelector('#helper-text');
const errorCard = document.querySelector('#error-card');
let conversation = null;
let muted = false;
let elapsed = 0;
let timerId = null;
let ending = false;

function setStatus(text, state = 'idle') {
  statusText.textContent = text;
  statusDot.dataset.state = state;
  orbZone.dataset.state = state;
}
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function startTimer() { elapsed = 0; timer.textContent = '00:00'; timer.hidden = false; clearInterval(timerId); timerId = setInterval(() => { elapsed += 1; timer.textContent = formatTime(elapsed); }, 1000); }
function stopTimer() { clearInterval(timerId); timerId = null; }
function reset() {
  conversation = null; muted = false; ending = false; stopTimer(); timer.hidden = true; controls.hidden = true; helper.hidden = false;
  startButton.disabled = false; startButton.textContent = 'Start voice demo →'; muteButton.textContent = 'Mute'; muteButton.setAttribute('aria-pressed', 'false'); setStatus('Ready to explore');
}
function fail(message) { errorCard.textContent = message; errorCard.hidden = false; setStatus('Connection unavailable', 'error'); }
async function endSession() {
  if (!conversation || ending) return;
  ending = true; setStatus('Ending demo', 'connecting');
  try { await conversation.endSession(); } catch { reset(); }
}
async function startSession() {
  if (conversation) return;
  errorCard.hidden = true; startButton.disabled = true; setStatus('Connecting microphone', 'connecting');
  try {
    // Prompt early, so browsers surface their permission state before WebRTC starts.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    conversation = await Conversation.startSession({
      agentId: AGENT_ID, connectionType: 'webrtc',
      onConnect: () => { setStatus('Nova is joining', 'speaking'); helper.hidden = true; controls.hidden = false; startButton.textContent = 'Voice demo in progress'; startTimer(); },
      onDisconnect: () => { setStatus('Demo ended'); stopTimer(); setTimeout(reset, 900); },
      onStatusChange: ({ status }) => { if (status === 'connecting') setStatus('Establishing secure voice link', 'connecting'); },
      onModeChange: ({ mode }) => { if (mode === 'speaking') setStatus('Nova is speaking', 'speaking'); if (mode === 'listening') setStatus('Nova is listening', 'listening'); },
      onError: (error) => { console.error('Voice session error', error); fail('The voice connection was interrupted. Please try again.'); },
    });
  } catch (error) {
    console.error('Unable to start voice session', error); reset();
    fail(error?.name === 'NotAllowedError' ? 'Please allow microphone access in your browser, then try again.' : 'The voice connection could not start. Refresh this page and try again.');
  }
}
startButton.addEventListener('click', startSession);
endButton.addEventListener('click', endSession);
muteButton.addEventListener('click', () => { if (!conversation) return; muted = !muted; conversation.setMicMuted(muted); muteButton.textContent = muted ? 'Unmute' : 'Mute'; muteButton.setAttribute('aria-pressed', String(muted)); });
window.addEventListener('beforeunload', () => { if (conversation) conversation.endSession(); });
reset();
