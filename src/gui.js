import { GUI } from 'dat.gui'

AFRAME.registerSystem('gui', {
    init: function () {
        const el = this.el;

        const sceneEl = this.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.otherScene = el.sceneEl.systems['other-scene'];
        this.compositor = el.sceneEl.systems['compositor'];

        const options = {
            doAsyncTimeWarp: true,
            fps: 60,
            latency: 150,
        };

        const _this = this;
        const gui = new GUI()
        gui.add(options, 'fps', 1, 90).onChange(
            function() {
                _this.otherScene.data.fps = this.getValue();
                _this.otherScene.updateFPS();
            }
        )
        gui.add(options, 'latency', 0, 1000).onChange(
            function() {
                _this.otherScene.data.latency = this.getValue();
            }
        )
        gui.add(options, 'doAsyncTimeWarp').onChange(
            function() {
                _this.compositor.data.doAsyncTimeWarp = this.getValue();
            }
        )
        gui.open()
    }
});
