const MAX_DELTA = 0.2;
const CLAMP_VELOCITY = 0.00001;
const EPS = 10e-6;

AFRAME.registerComponent('press-and-move', {
    schema: {
        enabled: { default: true },
        acceleration: { default: 30 },
        fly: { default: false },
        longPressDurationThreshold: { default: 500 },
    },

    init() {
        this.clampedEnd = new THREE.Vector3();

        this.startTouchTime = null;
        this.longTouch = false;

        this.easing = 1.1;

        this.velocity = new THREE.Vector3();
        this.direction = 1;

        const self = this;
        window.addEventListener(
            'touchstart',
            (evt) => {
                // evt.preventDefault();
                if (evt.touches.length === 1 || evt.touches.length === 2) {
                    if (evt.touches.length === 1) {
                        self.direction = 1;
                    } else if (evt.touches.length === 2) {
                        self.direction = -1;
                    }

                    self.startTouchTime = performance.now();
                }
            },
            { passive: false }
        );

        window.addEventListener('touchend', () => {
            self.startTouchTime = null;
        });
    },

    updateVelocity(delta) {
        const { data } = this;
        const { velocity } = this;

        // If FPS too low, reset velocity.
        if (delta > MAX_DELTA) {
            velocity.x = 0;
            velocity.z = 0;
            return;
        }

        // https://gamedev.stackexchange.com/questions/151383/frame-rate-independant-movement-with-acceleration
        const scaledEasing = (1 / this.easing) ** (delta * 60);
        // Velocity Easing.
        if (velocity.x !== 0) {
            velocity.x *= scaledEasing;
        }

        if (velocity.z !== 0) {
            velocity.z *= scaledEasing;
        }

        // Clamp velocity easing.
        if (Math.abs(velocity.x) < CLAMP_VELOCITY) {
            velocity.x = 0;
        }

        if (Math.abs(velocity.z) < CLAMP_VELOCITY) {
            velocity.z = 0;
        }

        if (!data.enabled) {
            return;
        }

        // Update velocity using keys pressed.
        const { acceleration } = data;
        velocity.z -= acceleration * delta;
    },

    getMovementVector: (function getMovementVectorFactory() {
        const directionVector = new THREE.Vector3(0, 0, 0);
        const rotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');

        return function getMovementVector(delta) {
            const rotation = this.el.getAttribute('rotation');
            const { velocity } = this;

            directionVector.copy(velocity);
            directionVector.multiplyScalar(delta);

            // Absolute.
            if (!rotation) {
                return directionVector;
            }

            const xRotation = this.data.fly ? rotation.x : 0;

            // Transform direction relative to heading.
            rotationEuler.set(THREE.MathUtils.degToRad(xRotation), THREE.MathUtils.degToRad(rotation.y), 0);
            directionVector.applyEuler(rotationEuler);
            // Apply direction
            directionVector.multiplyScalar(this.direction);
            return directionVector;
        };
    })(),

    tick(time, delta) {
        const { data, el } = this;
        const { velocity } = this;

        const currTime = performance.now();
        if (this.startTouchTime !== null) {
            if (currTime - this.startTouchTime < data.longPressDurationThreshold) return;

            // eslint-disable-next-line no-param-reassign
            delta /= 1000;
            this.updateVelocity(delta);

            if (!velocity.x && !velocity.z) return;

            // Get movement vector and translate position.
            el.object3D.position.add(this.getMovementVector(delta));
        }
    },
});
