import { GUI } from 'dat.gui';
import { ExperimentsList, TaskList, DefaultLatency } from './constants.js';

AFRAME.registerSystem('gui', {
    init: function() {
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
            stretchBorders: true,
            // fpsLocal: 90,
            fpsRemote: 90,
            latency: DefaultLatency,
            decreaseResolution: 1,
            experiment: ExperimentsList[0],
            task: TaskList[0],
            realTimeNetwork: false,
        };

        const _this = this;

        const gui = new GUI();

        // gui.add(options, 'fpsLocal', 1, 90)
        //     .name('FPS (Local)')
        //     .onChange( function() {
        //         sceneEl.setAttribute('local-scene', 'fps', this.getValue());
        //     } );

        gui.add(options, 'fpsRemote', 1, 90)
            .name('FPS (Remote)')
            .onChange( function() {
                sceneEl.setAttribute('remote-scene', 'fps', this.getValue());
            } );

        gui.add(options, 'latency', -1, 1000)
            .name('Remote Latency (ms)')
            .onChange( function() {
                sceneEl.setAttribute('remote-scene', 'latency', this.getValue());
            } );

        gui.add(options, 'decreaseResolution', 1, 16)
            .name('Resolution Scale (Remote)')
            .onChange( function() {
                _this.compositor.decreaseResolution(this.getValue());
            } );

        gui.add(options, 'stretchBorders')
            .name('Stretch Borders (ATW)')
            .onChange( function() {
                _this.compositor.data.stretchBorders = this.getValue();
            } );

        gui.add(options, 'experiment', ExperimentsList)
            .name('Experiment')
            .onChange( function() {
                _this.experimentManager.changeExperiment(this.getValue());
            } );

        gui.add(options, 'task', TaskList)
            .name('task')
            .onChange( function() {
                sceneEl.setAttribute('task-manager', 'currTask', this.getValue());
            } );

        gui.add(options, 'realTimeNetwork')
            .name('real-time network')
            .onChange( function() {
                sceneEl.setAttribute('local-scene-fps-manager', 'enable', this.getValue());
            } );

        gui.open()
    }
});
