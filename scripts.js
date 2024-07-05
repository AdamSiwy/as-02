const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const baseFrequencies = {
    'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.20, 'F1': 43.65, 'F#1': 46.25, 'G1': 49.00, 'G#1': 51.91, 'A1': 55.00, 'A#1': 58.27, 'B1': 61.74,
    'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25
};

let frequencies = { ...baseFrequencies };

const noteFrequencies = {
    24: 'C1', 25: 'C#1', 26: 'D1', 27: 'D#1', 28: 'E1',
    29: 'F1', 30: 'F#1', 31: 'G1', 32: 'G#1', 33: 'A1',
    34: 'A#1', 35: 'B1', 36: 'C2', 37: 'C#2', 38: 'D2',
    39: 'D#2', 40: 'E2', 41: 'F2', 42: 'F#2', 43: 'G2',
    44: 'G#2', 45: 'A2', 46: 'A#2', 47: 'B2', 48: 'C3',
    49: 'C#3', 50: 'D3', 51: 'D#3', 52: 'E3', 53: 'F3',
    54: 'F#3', 55: 'G3', 56: 'G#3', 57: 'A3', 58: 'A#3',
    59: 'B3', 60: 'C4', 61: 'C#4', 62: 'D4', 63: 'D#4',
    64: 'E4', 65: 'F4', 66: 'F#4', 67: 'G4', 68: 'G#4',
    69: 'A4', 70: 'A#4', 71: 'B4', 72: 'C5', 73: 'C#5',
    74: 'D5', 75: 'D#5', 76: 'E5'
};

let keyBindings = {};
const baseKeyBindings = {
    'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E',
    'f': 'F', 't': 'F#', 'g': 'G', 'z': 'G#', 'h': 'A',
    'u': 'A#', 'j': 'B', 'k': 'C', 'o': 'C#', 'l': 'D',
    'p': 'D#', 'ö': 'E'
};

let currentOscillators = {};
let currentOscillators2 = {};

const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
let currentWaveformIndex = 0;
let currentWaveformIndex2 = 0;
let osc2Enabled = false;
let detuneValue = 0;
let octaveShift = 4; // Default to C4

const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
const bufferLength = analyser.fftSize;
const dataArray = new Uint8Array(bufferLength);

const canvas = document.getElementById('oscilloscope');
const canvasCtx = canvas.getContext('2d');

document.getElementById('toggle-waveform').addEventListener('click', () => {
    currentWaveformIndex = (currentWaveformIndex + 1) % waveforms.length;
    document.getElementById('waveform-label').innerText = `Current Waveform OSC1: ${waveforms[currentWaveformIndex]}`;
});

document.getElementById('toggle-osc2').addEventListener('click', () => {
    osc2Enabled = !osc2Enabled;
    document.getElementById('toggle-osc2').innerText = osc2Enabled ? 'OSC2 Deaktivieren' : 'OSC2 Aktivieren';
    document.getElementById('toggle-waveform-osc2').style.display = osc2Enabled ? 'inline' : 'none';
    document.getElementById('waveform-label-osc2').style.display = osc2Enabled ? 'inline' : 'none';
    document.getElementById('detune-osc2').style.display = osc2Enabled ? 'inline' : 'none';
    document.getElementById('detune-value').style.display = osc2Enabled ? 'inline' : 'none';
});

document.getElementById('toggle-waveform-osc2').addEventListener('click', () => {
    currentWaveformIndex2 = (currentWaveformIndex2 + 1) % waveforms.length;
    document.getElementById('waveform-label-osc2').innerText = `Current Waveform OSC2: ${waveforms[currentWaveformIndex2]}`;
});

document.getElementById('detune-osc2').addEventListener('input', (event) => {
    detuneValue = parseInt(event.target.value);
    document.getElementById('detune-value').innerText = `Detune OSC2: ${detuneValue} cents`;

    // Update detune value for currently active oscillators
    if (osc2Enabled) {
        for (let osc in currentOscillators2) {
            currentOscillators2[osc].detune.setValueAtTime(detuneValue, audioContext.currentTime);
        }
    }
});

document.getElementById('octave-shift').addEventListener('input', (event) => {
    octaveShift = parseInt(event.target.value);
    updateFrequencies();
    updateKeyBindings();
    document.getElementById('octave-value').innerText = `Oktave: C${octaveShift}`;
});

document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('mousedown', () => {
        const note = key.dataset.note;
        startNoteFromMouse(note);
    });
    key.addEventListener('mouseup', stopNoteFromMouse);
    key.addEventListener('mouseleave', stopNoteFromMouse);
});

document.addEventListener('keydown', (event) => {
    if (keyBindings[event.key]) {
        startNoteFromKeyboard(keyBindings[event.key]);
    }
});

document.addEventListener('keyup', (event) => {
    if (keyBindings[event.key]) {
        stopNoteFromKeyboard(keyBindings[event.key]);
    }
});

function startNoteFromMouse(note) {
    startNote(note);
    highlightKey(note);
}

function stopNoteFromMouse() {
    stopAllNotes();
    unhighlightAllKeys();
}

function startNoteFromKeyboard(note) {
    startNote(note);
    highlightKey(note);
}

function stopNoteFromKeyboard(note) {
    stopNote(note);
    unhighlightKey(note);
}

function startNote(note) {
    if (currentOscillators[note]) return;

    const frequency = frequencies[note];
    if (!frequency) return; // Guard clause to ensure frequency is valid

    const oscillator = audioContext.createOscillator();
    oscillator.type = waveforms[currentWaveformIndex];
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.connect(analyser); // Connect gainNode to analyser

    oscillator.start();
    currentOscillators[note] = oscillator;

    if (osc2Enabled) {
        const oscillator2 = audioContext.createOscillator();
        oscillator2.type = waveforms[currentWaveformIndex2];
        oscillator2.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator2.detune.setValueAtTime(detuneValue, audioContext.currentTime); // Detune

        const gainNode2 = audioContext.createGain();
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        gainNode2.connect(analyser); // Connect gainNode2 to analyser

        oscillator2.start();
        currentOscillators2[note] = oscillator2;
    }
}

function stopNote(note) {
    if (currentOscillators[note]) {
        currentOscillators[note].stop();
        delete currentOscillators[note];
    }
    if (osc2Enabled && currentOscillators2[note]) {
        currentOscillators2[note].stop();
        delete currentOscillators2[note];
    }
}

function stopAllNotes() {
    for (let note in currentOscillators) {
        currentOscillators[note].stop();
        delete currentOscillators[note];
    }
    if (osc2Enabled) {
        for (let note in currentOscillators2) {
            currentOscillators2[note].stop();
            delete currentOscillators2[note];
        }
    }
}

function highlightKey(note) {
    const key = document.querySelector(`.key[data-note="${note}"]`);
    if (key) {
        key.classList.add('highlight');
    }
}

function unhighlightKey(note) {
    const key = document.querySelector(`.key[data-note="${note}"]`);
    if (key) {
        key.classList.remove('highlight');
    }
}

function unhighlightAllKeys() {
    document.querySelectorAll('.key.highlight').forEach(key => {
        key.classList.remove('highlight');
    });
}

function updateFrequencies() {
    frequencies = {};
    for (let note in baseFrequencies) {
        const octave = parseInt(note.slice(-1)) + (octaveShift - 4);
        const baseNote = note.slice(0, -1);
        frequencies[`${baseNote}${octave}`] = baseFrequencies[note] * Math.pow(2, octaveShift - 4);
    }
}

function updateKeyBindings() {
    keyBindings = {};
    for (let key in baseKeyBindings) {
        const baseNote = baseKeyBindings[key];
        const octave = (key === 'k' || key === 'o' || key === 'l' || key === 'p' || key === 'ö') ? octaveShift + 1 : octaveShift;
        keyBindings[key] = `${baseNote}${octave}`;
    }
}

function getMIDINumber(noteName) {
    return parseInt(Object.keys(baseFrequencies).find(key => baseFrequencies[key] === noteName));
}

// MIDI integration
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
} else {
    console.log("Web MIDI API is not supported in this browser.");
}

function onMIDISuccess(midiAccess) {
    const inputs = midiAccess.inputs.values();

    for (let input of inputs) {
        input.onmidimessage = handleMIDIMessage;
        console.log(`MIDI-Gerät angeschlossen: ${input.name}`);
        displayMessage(`MIDI-Gerät angeschlossen: ${input.name}`);
    }

    midiAccess.onstatechange = (event) => {
        const port = event.port;
        if (port.type === "input" && port.state === "connected") {
            console.log(`MIDI-Gerät verbunden: ${port.name}`);
            displayMessage(`MIDI-Gerät verbunden: ${port.name}`);
        } else if (port.type === "input" && port.state === "disconnected") {
            console.log(`MIDI-Gerät getrennt: ${port.name}`);
            displayMessage(`MIDI-Gerät getrennt: ${port.name}`);
        }
    };
}

function onMIDIFailure() {
    console.log("Zugriff auf MIDI-Geräte fehlgeschlagen.");
    displayMessage("Zugriff auf MIDI-Geräte fehlgeschlagen.");
}

function handleMIDIMessage(event) {
    const [command, note, velocity] = event.data;

    if (command === 144 && velocity > 0) { // Note on
        const noteName = noteFrequencies[note];
        startNoteFromKeyboard(noteName);
        highlightKey(noteName);
        console.log(`Note on: ${noteName} (Velocity: ${velocity})`);
        displayMessage(`Note on: ${noteName} (Velocity: ${velocity})`);
    } else if (command === 128 || (command === 144 && velocity === 0)) { // Note off
        const noteName = noteFrequencies[note];
        stopNoteFromKeyboard(noteName);
        unhighlightKey(noteName);
        console.log(`Note off: ${noteName}`);
        displayMessage(`Note off: ${noteName}`);
    } else {
        console.log(`Unbekannter MIDI-Befehl: ${command}`);
        displayMessage(`Unbekannter MIDI-Befehl: ${command}`);
    }
}

function displayMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function draw() {
    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

    canvasCtx.beginPath();

    let sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
        let v = dataArray[i] / 128.0;
        let y = v * canvas.height / 2;

        if(i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
}

draw();
updateKeyBindings(); // Initialize keyBindings based on the default octave
