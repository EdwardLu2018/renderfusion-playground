import './local-scene';
import './remote-scene';
import './background-scene';
import '../remote-controller';

AFRAME.registerSystem('remote-local', {
    schema: {
        fps: {type: 'number', default: 90},
    },

    init: function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.elapsed = 0;
        this.clock = new THREE.Clock();

        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        this.remoteScene = new THREE.Scene();
        this.remoteCamera = camera.clone();
        this.remoteCamera.cameras = [camera.clone(), camera.clone()];

        this.backgroundScene = new THREE.Scene();

        this.latency = 0;

        this.poses = [];

        sceneEl.setAttribute('local-scene', '');
        sceneEl.setAttribute('remote-scene', '');
        sceneEl.setAttribute('background-scene', '');

        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));
        window.addEventListener('enter-vr', this.clearPoses.bind(this));
        window.addEventListener('exit-vr', this.clearPoses.bind(this));

        this.originalUpdateCamera = renderer.xr.updateCamera;
        this.bind();
    },

    bind: function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

		const cameraLPos = new THREE.Vector3();
		const cameraRPos = new THREE.Vector3();
		function setProjectionFromUnion( camera, cameraL, cameraR ) {
			cameraLPos.setFromMatrixPosition( cameraL.matrixWorld );
			cameraRPos.setFromMatrixPosition( cameraR.matrixWorld );

			const ipd = cameraLPos.distanceTo( cameraRPos );

			const projL = cameraL.projectionMatrix.elements;
			const projR = cameraR.projectionMatrix.elements;

			// VR systems will have identical far and near planes, and
			// most likely identical top and bottom frustum extents.
			// Use the left camera for these values.
			const near = projL[ 14 ] / ( projL[ 10 ] - 1 );
			const far = projL[ 14 ] / ( projL[ 10 ] + 1 );
			const topFov = ( projL[ 9 ] + 1 ) / projL[ 5 ];
			const bottomFov = ( projL[ 9 ] - 1 ) / projL[ 5 ];

			const leftFov = ( projL[ 8 ] - 1 ) / projL[ 0 ];
			const rightFov = ( projR[ 8 ] + 1 ) / projR[ 0 ];
			const left = near * leftFov;
			const right = near * rightFov;

			// Calculate the new camera's position offset from the
			// left camera. xOffset should be roughly half `ipd`.
			const zOffset = ipd / ( - leftFov + rightFov );
			const xOffset = zOffset * - leftFov;

			// TODO: Better way to apply this offset?
			cameraL.matrixWorld.decompose( camera.position, camera.quaternion, camera.scale );
			camera.translateX( xOffset );
			camera.translateZ( zOffset );
			camera.matrixWorld.compose( camera.position, camera.quaternion, camera.scale );
			camera.matrixWorldInverse.copy( camera.matrixWorld ).invert();

			// Find the union of the frustum values of the cameras and scale
			// the values so that the near plane's position does not change in world space,
			// although must now be relative to the new union camera.
			const near2 = near + zOffset;
			const far2 = far + zOffset;
			const left2 = left - xOffset;
			const right2 = right + ( ipd - xOffset );
			const top2 = topFov * far / far2 * near2;
			const bottom2 = bottomFov * far / far2 * near2;

			camera.projectionMatrix.makePerspective( left2, right2, top2, bottom2, near2, far2 );
		}

		function updateCamera( camera, parent ) {
			if ( parent === null ) {
				camera.matrixWorld.copy( camera.matrix );
			} else {
				camera.matrixWorld.multiplyMatrices( parent.matrixWorld, camera.matrix );
			}
			camera.matrixWorldInverse.copy( camera.matrixWorld ).invert();
		}

        const system = this;
		renderer.xr.updateCamera = function( cameraVR, camera ) {
            const cameraL = cameraVR.cameras[0];
            const cameraR = cameraVR.cameras[1];

			cameraVR.near = cameraR.near = cameraL.near = camera.near;
			cameraVR.far = cameraR.far = cameraL.far = camera.far;

			const parent = camera.parent;
			const cameras = cameraVR.cameras;

			updateCamera( cameraVR, parent );

            const camPoses = [];
            let prevPose = system.poses.length >= 1 ? system.poses[0].pose : null;
            if (system.latency !== -1 &&
                system.poses.length >= 1 &&
                performance.now() > system.poses[0].timestamp + system.latency) {
                prevPose = system.poses.shift().pose;
            }

			for ( let i = 0; i < cameras.length; i ++ ) {
                if (camera !== system.remoteCamera) {
                    updateCamera( cameras[ i ], parent );

                    const camPose = new THREE.Matrix4();
                    camPose.copy( cameras[ i ].matrixWorld );
                    camPoses[i] = camPose;
                } else {
                    if (prevPose && prevPose[i]) {
                        cameras[ i ].matrix.copy(prevPose[i]);
                        const remoteCamera = system.remoteCamera.cameras[ i ];
                        remoteCamera.projectionMatrix.copy( cameras[ i ].projectionMatrix );
                        remoteCamera.matrixWorld.copy( prevPose[i] );

                        updateCamera( cameras[ i ], parent );
                    }
                }
			}
            if (camera !== system.remoteCamera) {
                system.poses.push({pose: camPoses, timestamp: performance.now()});
            }

			cameraVR.matrixWorld.decompose( cameraVR.position, cameraVR.quaternion, cameraVR.scale );

            camera.matrix.copy( cameraVR.matrix );
            camera.matrix.decompose( camera.position, camera.quaternion, camera.scale );

            const children = camera.children;
            for ( let i = 0, l = children.length; i < l; i ++ ) {
                children[ i ].updateMatrixWorld( true );
            }

			// update projection matrix for proper view frustum culling
			if ( cameras.length === 2 ) {
				setProjectionFromUnion( cameraVR, cameraL, cameraR );
			} else {
				// assume single camera setup (AR)
				cameraVR.projectionMatrix.copy( cameraL.projectionMatrix );
			}
		};
    },

    unbind: function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        renderer.xr.updateCamera = this.originalUpdateCamera;
    },

    onResize: function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        const camera = sceneEl.camera;

        this.remoteCamera.copy(camera);
    },

    clearPoses: function() {
        this.poses = [];
    },

    setLatency: function(latency) {
        this.clearPoses();
        this.latency = latency;

        const handLeft = document.getElementById('handLeft');
        const handRight = document.getElementById('handRight');
        handLeft.setAttribute('remote-controller', 'latency', latency);
        handRight.setAttribute('remote-controller', 'latency', latency);
    },

    updateFPS: function(fps) {
        const el = this.el;
        const data = this.data;

        this.clearPoses();
        data.fps = fps;
    },

    updateRemoteCamera: function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        if (this.latency === -1) return;
        if (renderer.xr.enabled === true && renderer.xr.isPresenting === true) return;

        this.elapsed += this.clock.getDelta() * 1000;
        if (this.elapsed > 1000 / data.fps) {
            this.elapsed = 0;

            var camPose = new THREE.Matrix4();
            camPose.copy(camera.matrixWorld);
            this.poses.push({pose: camPose, timestamp: performance.now()});

            if (this.poses.length >= 1 &&
                (performance.now() >= this.poses[0].timestamp + this.latency)) {
                const prevPose = this.poses.shift().pose;

                // update remote camera
                this.remoteCamera.matrixWorld.copy( prevPose );
                this.remoteCamera.matrixWorldInverse.copy( this.remoteCamera.matrixWorld ).invert();
                this.remoteCamera.matrixWorld.decompose(
                        this.remoteCamera.position,
                        this.remoteCamera.quaternion,
                        this.remoteCamera.scale
                    );
            }
        }
    },
});
