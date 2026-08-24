
let isplay = false
let parts = [];
let synth
const volume = new Tone.Volume(-10).toDestination();

export function midi_init() {
    const cat = document.createElement("img");
    cat.src = "./hello_world/modules/midis/uncanny-cat-gdmi.gif"

    const playbutton = document.createElement("button");
    playbutton.textContent = "Play";

    const slider = document.createElement("input");

    slider.type = "range";
    slider.min = "-50";
    slider.max = "10";
    slider.step = "0.5";
    slider.value = "-30";

    slider.addEventListener("input", () => {
        volume.volume.value = slider.value;
    });
    playbutton.addEventListener("click", async () => {
        if (isplay){
            isplay = false
            await Tone.Transport.stop();
            Tone.Transport.cancel();
            synth.releaseAll();
            synth = null
            Tone.Transport.position = 0;
            parts.forEach(p => p.dispose());
            parts = [];
            loadMIDI()
            playbutton.textContent = "play";
            cat.src = "./hello_world/modules/midis/uncanny-cat-gdmi.gif"
        } else {
            isplay = true
            playbutton.textContent = "stop";
            await Tone.Transport.start();
            cat.src = "./hello_world/modules/midis/ai-chinese-cat-dancing.gif"
        }
    })
    //document.body.appendChild(cat);
    const a = document.getElementById("a")
    const iframe = document.createElement("iframe");

    iframe.src = "https://113031n.notion.site/ebd//3b667654e12f80f6a20ee7914a0e568a";
    iframe.width = "800";
    iframe.height = "600";
    iframe.style.border = "none";
    iframe.allowFullscreen = true;
    iframe.style.marginLeft = "20px";

    a.appendChild(playbutton);
    a.appendChild(slider);
    a.appendChild(cat);
    a.appendChild(iframe);
    loadMIDI()
};
const piano = new Tone.Sampler({
    urls: { C4: "C4.mp3",A4: "A4.mp3" },
    baseUrl: "https://tonejs.github.io/audio/salamander/",
}).toDestination();
const square = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
        type: "square"
    },
    volume : -10
}).toDestination();
const sawtooth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
        type: "sawtooth"
    },
    volume : -8
}).toDestination();
const triangle = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
        type: "triangle"
    },
    volume : -5
}).toDestination();
const sine = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
        type: "sine"
    },
    volume : -5
}).toDestination();
const INSTRUMENTS = {
    piano,
    square,
    sawtooth,
    triangle,
    sine
};
const MIDIS = [
    {
        file: "b.mid",
        volume: 0,
        maxPolyphony:64
    },
    {
        file: "Beethoven_Virus.mid.mid",
        volume: 0,
        maxPolyphony:64
    },
    {
        file: "TheKnight.mid",
        volume: 0,
        maxPolyphony:128
    },
    {
        file: "c.mid",
        volume: -2,
        maxPolyphony:64
    },
    {
        file: "a.mid",
        volume: 0,
        maxPolyphony:64
    },
    {
        file: "aa.mid",
        volume: 0,
        maxPolyphony:32
    },
    {
        file: "aaaaa.mid",
        volume: 0,
        maxPolyphony:32
    },
    {
        file: "Tetris Reimagined.mid",
        volume: 5,
        maxPolyphony:32
    },
    {
        file: "Tomboyish Girl in Love.mid",
        volume: -5,
        maxPolyphony:32
    },
]
async function loadMIDI() {
    const data = MIDIS[Math.floor(Math.random() * MIDIS.length)]
    const response = await fetch("./hello_world/modules/midis/"+data.file);
    const array = await response.arrayBuffer();
    const midi = new Midi(array);
    Tone.Transport.bpm.value = midi.header.tempos[0].bpm;
    Tone.Transport.PPQ = midi.header.ppq;
    const tracks = [];
    const rm = Math.floor(Math.random() * 11) - 5
    const keys = Object.keys(INSTRUMENTS);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    synth = INSTRUMENTS[randomKey];
    synth.maxPolyphony = data.maxPolyphony
    synth.volume.value = synth.volume.value+data.volume;
    synth.connect(volume);
    synth.set({
        envelope: {
            release: 0.05
        }
    });
    for (const track of midi.tracks) {
        const part = new Tone.Part((time, note) => {
            synth.triggerAttackRelease(
            Tone.Frequency(note.midi + rm, "midi"),
            note.duration,
            time,
            note.velocity
            );
        }, track.notes).start(0);
        parts.push(part);
    }
    console.log(randomKey,rm)
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = midi.duration;
}