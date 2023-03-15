import { GUI } from 'dat.gui';

AFRAME.registerSystem('gui', {
    init: function () {
        const el = this.el;

        const sceneEl = this.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.remoteLocal = sceneEl.systems['remote-local'];
        this.compositor = sceneEl.systems['compositor'];
        this.decisionMaking = sceneEl.systems['decision-making'];

        this.experiments = ["low poly local", "high poly local", "high poly remote (no atw)", "high poly remote (with atw)", "mixed (no atw)", "mixed (with atw)"];

        const options = {
            timeWarp: true,
            stretchBorders: true,
            fps: 60,
            latency: 150,
            decreaseResolution: 1,
            experiment: this.experiments[this.experiments.length - 1],
        };

        const _this = this;

        const gui = new GUI()
        gui.add(options, 'fps', 1, 90)
            .name("FPS")
            .onChange( function() {
                sceneEl.setAttribute('remote-scene', 'fps', this.getValue());
            } );

        gui.add(options, 'latency', -1, 1000)
            .name("Latency (ms)")
            .onChange( function() {
                sceneEl.setAttribute('remote-scene', 'latency', this.getValue());
            } );

        gui.add(options, 'decreaseResolution', 1, 16)
            .name("Resolution Scale")
            .onChange( function() {
                _this.compositor.decreaseResolution(this.getValue());
            } );

        // gui.add(options, 'timeWarp')
        //     .name("ATW")
        //     .onChange( function() {
        //         _this.compositor.data.doAsyncTimeWarp = this.getValue();
        //     } );

        gui.add(options, 'stretchBorders')
            .name("Stretch Borders")
            .onChange( function() {
                _this.compositor.data.stretchBorders = this.getValue();
            } );

        gui.add(options, 'experiment', this.experiments)
            .name("Experiment")
            .onChange( function() {
                _this.decisionMaking.changeExperiment(this.getValue());
            } );

        gui.open()
    }
});
