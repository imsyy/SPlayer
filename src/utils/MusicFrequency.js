class MusicFrequency {

    constructor(canvas, audio, width = null, height = null, color = null, lineWidth = null, vHight = null) {
        this.canvas = canvas;
        this.canvas.width = width || document.body.clientWidth;
        this.canvas.height = height || 200;
        this.audio = audio;
        this.color = color;
        this.vHight = vHight || 2;

        this.lineWidth = lineWidth || this.canvas.width / 360 / 1.6;

        this.ctx = this.canvas.getContext('2d');
        //this.ctx.rotate(Math.PI);
        this.createContext();
        this.createGradient();

        this.output = new Uint8Array(360);

        this.audio._play = this.audio.play;

        this.audio.play = () => {
            this.context.resume();
            this.audio._play();
        }

        this.audio._pause = this.audio.pause;

        this.audio.pause = () => {
            this.context.suspend();
            this.audio._pause();
        }

    }

    createGradient() {
        this.grd = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
        this.color = this.color || [
            [0, "white"],
            [1, "white"],
        ];
        this.color.forEach((v) => {
            this.grd.addColorStop(v[0], v[1]);
        });
    }

    createContext() {
        let AudioContext = window.AudioContext || window.webkitAudioContext;

        this.context = new AudioContext();

        this.source = this.context.createMediaElementSource(this.audio);
        this.analyser = this.context.createAnalyser();

        this.source.connect(this.analyser);
        this.analyser.connect(this.context.destination);
    }

    drawSpectrum() {
        // console.log(this.canvas);
        this.analyser.getByteFrequencyData(this.output);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < 360; i++) {
            let value = this.output[i] / this.vHight;
            let x = i * 5;
            if (x <= this.canvas.width) {
                // console.log(this.output.length);
                this.ctx.strokeStyle = this.grd;
                this.ctx.beginPath();
                this.ctx.lineWidth = this.lineWidth;

                this.ctx.moveTo(x, this.canvas.height);

                this.ctx.lineTo(x, this.canvas.height - value);
                this.ctx.stroke();
            }
        }

        //请求下一帧
        requestAnimationFrame(() => {
            this.drawSpectrum();
        });
    }

}

export default MusicFrequency;