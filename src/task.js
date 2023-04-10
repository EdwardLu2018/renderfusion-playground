import { TaskState } from './constants';

AFRAME.registerComponent('task', {
    schema: {
    },

    init: async function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = el;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.experimentManager = sceneEl.systems['experiment-manager'];
        this.remoteLocal = sceneEl.systems['remote-local'];

        this.remoteScene = sceneEl.systems['remote-local'].remoteScene;
        this.remoteCamera = sceneEl.systems['remote-local'].remoteCamera;

        this.localScene = sceneEl.object3D;
        this.localCamera = sceneEl.camera;

        this.state = TaskState.Start;
        this.toggleReset = true;
    },

    update(oldData) {
        const data = this.data;
    },

    tick: function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = el;

        var pos1 = new THREE.Vector3();
        var pos2 = new THREE.Vector3();
        var pos3 = new THREE.Vector3();

        switch (this.state)  {
            case TaskState.Start: {
                if (this.experimentManager.objects['sword'] === undefined ||
                    this.experimentManager.objects['sword2'] === undefined) return;

                this.experimentManager.updateInstructions("(1) Move the sword in the helmet to match the sword behind you. Then, look back here for the next steps.");

                pos1.copy(this.experimentManager.objects['sword'].position);
                pos2.copy(this.experimentManager.objects['sword2'].position);

                let direction = new THREE.Vector3(0,0,1), direction2 = new THREE.Vector3(0,0,1);
                direction.applyQuaternion(this.experimentManager.objects['sword'].quaternion).add(pos1);
                direction2.applyQuaternion(this.experimentManager.objects['sword2'].quaternion).add(pos2);

                if (pos1.distanceTo(pos2) <= 0.05 && direction.angleTo(direction2) <= 0.5) {
                    this.state = TaskState.Boxes;
                }

                // this.experimentManager.updateInstructions(parseFloat(pos1.distanceTo(pos2)) + " " + parseFloat(direction.angleTo(direction2)));

                break;
            }

            case TaskState.Boxes: {
                if (this.experimentManager.objects['blueBox'] === undefined ||
                    this.experimentManager.objects['redBox'] === undefined ||
                    this.experimentManager.objects['helmet'] === undefined) return;

                this.experimentManager.updateInstructions("(2) Now, move the boxes closer to the helmet!");

                pos1.copy(this.experimentManager.objects['blueBox'].position);
                pos2.copy(this.experimentManager.objects['redBox'].position);
                pos3.copy(this.experimentManager.objects['helmet'].position);

                if (pos3.distanceTo(pos1) <= 0.25 && pos3.distanceTo(pos2) <= 0.25) {
                    this.state = TaskState.Menu;
                    sceneEl.setAttribute('remote-scene', 'helmetRotateDirection', 1);
                }

                // this.experimentManager.updateInstructions(parseFloat(pos3.distanceTo(pos1)) + " " + parseFloat(pos3.distanceTo(pos2)));

                break;
            }

            case TaskState.Menu: {
                this.experimentManager.updateInstructions("(3) Finally, click Done on the menu!");
                this.state = TaskState.Done;

                break;
            }

            case TaskState.Done: {
                sceneEl.setAttribute('local-scene', 'reset', this.toggleReset);
                sceneEl.setAttribute('remote-scene', 'reset', this.toggleReset);
                this.toggleReset = !this.toggleReset;

                this.state = TaskState.Start;

                break;
            }

            default:
                break;
        }
    }
});
