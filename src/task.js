import { Task, EVENTS } from './constants';

AFRAME.registerComponent('task', {
    schema: {
        currTask: {type: 'string', default: Task.HighDexterity},
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

        this.task = Task.HighDexterity;
        this.toggleReset = true;

        this.successes = 0;

        this.onButtonDonePressed = this.onButtonDonePressed.bind(this);
        el.addEventListener(EVENTS.BUTTON_DONE_PRESSED, this.onButtonDonePressed);
    },

    update: function(oldData) {
        const el = this.el;
        const data = this.data;

        if (data.currTask !== oldData.currTask) {
            this.task = data.currTask;
            this.successes = 0;
        }
    },

    onButtonDonePressed: function() {
        if (this.task === Task.Menu) {
            this.task = Task.Done;
        }
    },

    tick: function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = el;

        var pos1 = new THREE.Vector3();
        var pos2 = new THREE.Vector3();
        var pos3 = new THREE.Vector3();

        switch (this.task) {
            case Task.HighDexterity: {
                if (this.experimentManager.objects['sword'] === undefined ||
                    this.experimentManager.objects['sword2'] === undefined) return;

                this.experimentManager.updateInstructions(
                    `Move the sword in the helmet to match the sword behind you.\nScore: ${this.successes}`
                );

                pos1.copy(this.experimentManager.objects['sword'].position);
                pos2.copy(this.experimentManager.objects['sword2'].position);

                var direction = new THREE.Vector3(0,0,1), direction2 = new THREE.Vector3(0,0,1);
                direction.applyQuaternion(this.experimentManager.objects['sword'].quaternion).add(pos1);
                direction2.applyQuaternion(this.experimentManager.objects['sword2'].quaternion).add(pos2);

                if (pos1.distanceTo(pos2) <= 0.05 && direction.angleTo(direction2) <= 0.5) {
                    this.task = Task.Done;
                }

                // this.experimentManager.updateInstructions(parseFloat(pos1.distanceTo(pos2)) + " " + parseFloat(direction.angleTo(direction2)));

                break;
            }

            case Task.LowDexterity: {
                if (this.experimentManager.objects['blueBox'] === undefined ||
                    this.experimentManager.objects['redBox'] === undefined ||
                    this.experimentManager.objects['helmet'] === undefined) return;

                this.experimentManager.updateInstructions(
                    `Move the boxes inside the helmet!\nScore: ${this.successes}`
                );

                pos1.copy(this.experimentManager.objects['blueBox'].position);
                pos2.copy(this.experimentManager.objects['redBox'].position);
                pos3.copy(this.experimentManager.objects['helmet'].position);

                if (pos3.distanceTo(pos1) <= 0.25 && pos3.distanceTo(pos2) <= 0.25) {
                    this.task = Task.Done;
                }

                // this.experimentManager.updateInstructions(parseFloat(pos3.distanceTo(pos1)) + " " + parseFloat(pos3.distanceTo(pos2)));

                break;
            }

            case Task.Menu: {
                this.experimentManager.updateInstructions(
                    "Click Done on the menu!"
                );
                // this.task = Task.Done;

                break;
            }

            case Task.Done: {
                sceneEl.setAttribute('local-scene', 'reset', this.toggleReset);
                sceneEl.setAttribute('remote-scene', 'reset', this.toggleReset);
                this.toggleReset = !this.toggleReset;

                this.task = data.currTask;
                this.successes++;

                break;
            }

            default:
                break;
        }
    }
});
