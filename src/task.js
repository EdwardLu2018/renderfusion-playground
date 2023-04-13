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

        this.successesIncremented = false;

        this.onResetButtonPressed = this.onResetButtonPressed.bind(this);
        el.addEventListener(EVENTS.BUTTON_RESET_PRESSED, this.onResetButtonPressed);
    },

    incrementSuccesses() {
        if (this.successesIncremented === true) return;

        this.successes++;
        this.successesIncremented = true;

        const _this = this;
        setTimeout(() => {
            _this.successesIncremented = false;
        }, 100);
    },

    update: function(oldData) {
        const el = this.el;
        const data = this.data;

        if (data.currTask !== oldData.currTask) {
            this.task = Task.Done;
            this.successes = 0;
        }
    },

    onResetButtonPressed: function() {
        this.task = Task.Done;
        this.successes = 0;
    },

    tick: function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = el;

        if (this.experimentManager.objects['sword'] === undefined ||
            this.experimentManager.objects['sword2'] === undefined) return;

        if (this.experimentManager.objects['blueBox'] === undefined ||
            this.experimentManager.objects['redBox'] === undefined ||
            this.experimentManager.objects['helmet'] === undefined) return;

        var pos1 = new THREE.Vector3();
        var pos2 = new THREE.Vector3();
        var pos3 = new THREE.Vector3();

        switch (this.task) {
            case Task.HighDexterity: {
                this.experimentManager.updateInstructions(
                    `Move the sword in the helmet to match the transparent sword next to me!\n\nScore: ${this.successes}`
                );

                pos1.copy(this.experimentManager.objects['sword'].position);
                pos2.copy(this.experimentManager.objects['sword2'].position);

                var direction = new THREE.Vector3(0,0,1), direction2 = new THREE.Vector3(0,0,1);
                direction.applyQuaternion(this.experimentManager.objects['sword'].quaternion).add(pos1);
                direction2.applyQuaternion(this.experimentManager.objects['sword2'].quaternion).add(pos2);

                if (pos1.distanceTo(pos2) <= 0.5 && direction.angleTo(direction2) <= 0.25) {
                    this.incrementSuccesses();
                    this.task = Task.Done;
                }

                // this.experimentManager.updateInstructions(parseFloat(pos1.distanceTo(pos2)) + " " + parseFloat(direction.angleTo(direction2)));

                break;
            }

            case Task.LowDexterity: {
                this.experimentManager.updateInstructions(
                    `Move the two boxes inside the helmet!\n\nScore: ${this.successes}`
                );

                pos1.copy(this.experimentManager.objects['blueBox'].position);
                pos2.copy(this.experimentManager.objects['redBox'].position);
                pos3.copy(this.experimentManager.objects['helmet'].position);

                if (pos3.distanceTo(pos1) <= 0.2 && pos3.distanceTo(pos2) <= 0.2) {
                    this.incrementSuccesses();
                    this.task = Task.Done;
                }

                // this.experimentManager.updateInstructions(parseFloat(pos3.distanceTo(pos1)) + " " + parseFloat(pos3.distanceTo(pos2)));

                break;
            }

            case Task.Menu: {
                this.experimentManager.updateInstructions(
                    "Click Done on the menu!"
                );

                break;
            }

            case Task.Done: {
                sceneEl.setAttribute('local-scene', 'reset', this.toggleReset);
                sceneEl.setAttribute('remote-scene', 'reset', this.toggleReset);
                this.toggleReset = !this.toggleReset;

                this.task = data.currTask;

                if (this.task == Task.HighDexterity) {
                    this.experimentManager.objects['sword2'].rotation.z = 2 * Math.PI * Math.random();
                }

                break;
            }

            default:
                break;
        }
    }
});
