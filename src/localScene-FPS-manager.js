import { Experiments, RenderingMedium, Resolution, ButtonOptions, EVENTS } from './constants';

import ThreeMeshUI from 'three-mesh-ui';

import FontJSON from '/assets/fonts/Roboto-msdf.json';
import FontImage from '/assets/fonts/Roboto-msdf.png';

import Output from '../python/Output.json';

AFRAME.registerComponent('localScene-FPS-manager', {
    schema: {
        enable: {type: 'boolean', default: false}, 
        lowPolyLocalFPS: {type: 'number', default: -1},
    },

    init: function() {
        this.idx = 0;
        this.num = [];
        for (var i = 0; i < Output.length; i++) {
            this.num.push(Output[i]);
          }
        this.timer = 0;
    },

    tick: function(t, dt) {
        const el = this.el;
        const data = this.data;
        this.timer += dt;
        if (data.enable && this.timer > 200) {
            this.idx++;
            if (this.idx < 0 || this.idx > this.num.length) {
                this.idx = 0;
            }
            el.setAttribute('local-scene', 'fps', this.num[this.idx]);
            this.timer = 0;
        }
        else {
            el.setAttribute('local-scene', 'fps', data.lowPolyLocalFPS);
        }
    }
})