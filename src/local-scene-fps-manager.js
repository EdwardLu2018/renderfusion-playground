import Output from '../python/Output.json';

AFRAME.registerComponent('local-scene-fps-manager', {
    schema: {
        enable: {type: 'boolean', default: false},
        lowPolyLocalFPS: {type: 'number', default: -1},
    },

    init: function() {
        this.idx = 0;
        this.delay = [];
        for (var i = 0; i < Output.length; i++) {
            this.delay.push(Output[i]);
        }
        this.elapsed = 0;
    },

    tick: function(t, dt) {
        const el = this.el;
        const data = this.data;
        this.elapsed += dt;
        if (data.enable && this.elapsed > 200) {
            this.idx++;
            if (this.idx < 0 || this.idx > this.delay.length) {
                this.idx = 0;
            }
            el.setAttribute('local-scene', 'fps', this.delay[this.idx]);
            this.elapsed = 0;
        }
        else {
            el.setAttribute('local-scene', 'fps', data.lowPolyLocalFPS);
        }
    }
})
