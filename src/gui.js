import { GUI } from 'dat.gui';
import { Experiments, ExperimentsList } from './constants.js';

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
        this.experimentManager = sceneEl.systems['experiment-manager'];

        const options = {
            timeWarp: true,
            stretchBorders: true,
            fpsLocal: 90,
            fpsRemote: 90,
            latency: 150,
            decreaseResolution: 1,
            experiment: ExperimentsList[0],
        };

        const _this = this;

        const gui = new GUI()
        gui.add(options, 'fpsLocal', 1, 90)
            .name("FPS (Local)")
            .onChange( function() {
                sceneEl.setAttribute('local-scene', 'fps', this.getValue());
            } );

        gui.add(options, 'fpsRemote', 1, 90)
            .name("FPS (Remote)")
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

        gui.add(options, 'stretchBorders')
            .name("Stretch Borders")
            .onChange( function() {
                _this.compositor.data.stretchBorders = this.getValue();
            } );

        gui.add(options, 'experiment', ExperimentsList)
            .name("Experiment")
            .onChange( function() {
                _this.experimentManager.changeExperiment(this.getValue());
            } );

        gui.open()
    }
});
