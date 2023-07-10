import { Task, EVENTS } from './constants';

AFRAME.registerComponent('task-manager', {
    schema: {
        currTask: {type: 'string', default: Task.HighDexterity},
        taskDuration: {type: 'number', default: 60},
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

        this.elapsed = 0;
        this.clock = new THREE.Clock();

        this.state = Task.Idle;

        this.successes = 0;

        this.successesIncremented = false;

        this.onResetButtonPressed = this.onResetButtonPressed.bind(this);
        el.addEventListener(EVENTS.BUTTON_RESET_PRESSED, this.onResetButtonPressed);
    },

    incrementSuccesses: function() {
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
            this.state = Task.Idle;
        }
    },

    onResetButtonPressed: function() {
        this.state = Task.Reset;
        this.elapsed = 0;
        this.successes = 0;
    },

    tick: function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = el;

        if (this.experimentManager.objects['sword']  === undefined ||
            this.experimentManager.objects['sword2'] === undefined) return;

        if (this.experimentManager.objects['blueBox'] === undefined ||
            this.experimentManager.objects['redBox']  === undefined ||
            this.experimentManager.objects['helmet']  === undefined) return;

        this.elapsed += this.clock.getDelta();
        if (this.state !== Task.Idle && this.state !== Task.Reset && this.state !== Task.Done) {
            this.experimentManager.updateTimer(Math.round(this.elapsed));

            if (this.elapsed > data.taskDuration) this.state = Task.Done;
        }

        var pos1 = new THREE.Vector3();
        var pos2 = new THREE.Vector3();
        var pos3 = new THREE.Vector3();

        switch (this.state) {
            case Task.Idle: {
                this.experimentManager.updateInstructions(
                    `Click Reset to play again!\n\nScore: ${this.successes}`
                );

                break;
            }

            case Task.HighDexterity: {
                this.experimentManager.updateInstructions(
                    `Move the sword in the helmet to match the transparent sword!\n\nScore: ${this.successes}`
                );

                pos1.copy(this.experimentManager.objects['sword'].position);
                pos2.copy(this.experimentManager.objects['sword2'].position);

                var direction = new THREE.Vector3(0,0,1), direction2 = new THREE.Vector3(0,0,1);
                direction.applyQuaternion(this.experimentManager.objects['sword'].quaternion).add(pos1);
                direction2.applyQuaternion(this.experimentManager.objects['sword2'].quaternion).add(pos2);

                if (pos1.distanceTo(pos2) <= 0.5) {
                    this.incrementSuccesses();
                    this.state = Task.Reset;
                }

                // this.experimentManager.updateInstructions(parseFloat(pos1.distanceTo(pos2)) + " " + parseFloat(direction.angleTo(direction2)));

                break;
            }

            case Task.LowDexterity: {
                this.experimentManager.updateInstructions(
                    `Move the red and blue boxes inside the helmet!\n\nScore: ${this.successes}`
                );

                pos1.copy(this.experimentManager.objects['blueBox'].position);
                pos2.copy(this.experimentManager.objects['redBox'].position);
                pos3.copy(this.experimentManager.objects['helmet'].position);

                if (pos3.distanceTo(pos1) <= 0.2 && pos3.distanceTo(pos2) <= 0.2) {
                    this.incrementSuccesses();
                    this.state = Task.Reset;
                }

                // this.experimentManager.updateInstructions(parseFloat(pos3.distanceTo(pos1)) + " " + parseFloat(pos3.distanceTo(pos2)));

                break;
            }

            case Task.Reset: {
                sceneEl.components['local-scene'].reset();
                sceneEl.components['remote-scene'].reset();

                this.state = data.currTask;

                // if (this.state == Task.HighDexterity) {
                //     this.experimentManager.objects['sword2'].rotation.z = 2 * Math.PI * Math.random();
                // }

                break;
            }

            case Task.Done: {
                this.state = Task.Idle;
                this.elapsed = 0;

                break;
            }

            default:
                break;
        }
    }
});
