import {CompositorPass} from './compositor-pass';

AFRAME.registerSystem('compositor', {
    schema: {
        doAsyncTimeWarp: {type: 'bool', default: true},
    },

    init: function() {
        const sceneEl = this.sceneEl;

        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        const renderer = sceneEl.renderer;

        this.cameras = [];

        this.originalRenderFunc = null;

        this.remoteRenderTarget = new THREE.WebGLRenderTarget(1,1);
        this.remoteRenderTarget.texture.name = 'RemoteScene.rtLeft';
        this.remoteRenderTarget.texture.minFilter = THREE.NearestFilter;
        this.remoteRenderTarget.texture.magFilter = THREE.NearestFilter;
        this.remoteRenderTarget.stencilBuffer = false;
        this.remoteRenderTarget.depthTexture = new THREE.DepthTexture();
        this.remoteRenderTarget.depthTexture.format = THREE.DepthFormat;
        this.remoteRenderTarget.depthTexture.type = THREE.UnsignedShortType;

        this.renderTarget = new THREE.WebGLRenderTarget(1,1);
        this.renderTarget.texture.name = 'EffectComposer.rt1';
        this.renderTarget.texture.minFilter = THREE.NearestFilter;
        this.renderTarget.texture.magFilter = THREE.NearestFilter;
        this.renderTarget.stencilBuffer = false;
        this.renderTarget.depthTexture = new THREE.DepthTexture();
        this.renderTarget.depthTexture.format = THREE.DepthFormat;
        this.renderTarget.depthTexture.type = THREE.UnsignedShortType;

        this.remoteScene = sceneEl.systems['remote-scene'].remoteScene;
        this.remoteCamera = sceneEl.systems['remote-scene'].remoteCamera;
        this.pass = new CompositorPass(
                        scene, camera,
                        this.remoteScene, this.remoteCamera,
                        this.remoteRenderTarget
                    );

        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));
        renderer.xr.addEventListener('sessionstart', this.onResize.bind(this));
        renderer.xr.addEventListener('sessionend', this.onResize.bind(this));

        this.t = 0;
        this.dt = 0;

        this.bind();
    },

    onResize() {
        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        var rendererSize = new THREE.Vector2();
        renderer.getSize(rendererSize);
        const pixelRatio = renderer.getPixelRatio();
        this.renderTarget.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
        this.remoteRenderTarget.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
        this.pass.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
    },

    tick: function(t, dt) {
        this.t = t;
        this.dt = dt;
    },

    bind: function() {
        const data = this.data;

        const renderer = this.sceneEl.renderer;
        const render = renderer.render;

        const system = this;
        let isDigest = false;

        const camera = this.sceneEl.camera;

        this.originalRenderFunc = render;

        renderer.xr.cameraAutoUpdate = false;
        // renderer.xr = new WebXRManager(renderer, renderer.getContext());

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

		renderer.xr.updateCamera = function ( cameraVR, camera ) {
            const cameraL = cameraVR.cameras[0];
            const cameraR = cameraVR.cameras[1];

			cameraVR.near = cameraR.near = cameraL.near = camera.near;
			cameraVR.far = cameraR.far = cameraL.far = camera.far;

			const parent = camera.parent;
			const cameras = cameraVR.cameras;

            // if (camera !== system.remoteCamera)
			updateCamera( cameraVR, parent );

            // if (camera !== system.remoteCamera)
			for ( let i = 0; i < cameras.length; i ++ ) {
                if (camera === system.remoteCamera) {
                    parent.rotation.y = 10;
                    parent.position.y = 1;
                }
                updateCamera( cameras[ i ], parent );
			}

			cameraVR.matrixWorld.decompose( cameraVR.position, cameraVR.quaternion, cameraVR.scale );

			// update user camera and its children
            // if (camera === system.remoteCamera) {
            //     // camera.matrix.copy( cameraVR.matrix );
            //     // camera.matrix.decompose( system.sceneEl.systems['remote-scene'].cameraRig.position, system.sceneEl.systems['remote-scene'].cameraSpinner.quaternion, camera.scale );
            // } else {
                camera.matrix.copy( cameraVR.matrix );
                camera.matrix.decompose( camera.position, camera.quaternion, camera.scale );
            // }

            // console.log(camera.quaternion, system.remoteCamera.quaternion, system.sceneEl.systems['remote-scene'].cameraSpinner.quaternion)
            // console.log(camera.position, system.remoteCamera.position, system.sceneEl.systems['remote-scene'].cameraRig.position)

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

        this.sceneEl.object3D.onBeforeRender = function(renderer, scene, camera) {
            if (camera instanceof THREE.ArrayCamera) {
                system.cameras = camera.cameras;
            } else {
                system.cameras.push(camera);
            }
        }

        let hasDualCameras, ipd;

        const isWebXRViewer = navigator.userAgent.includes('WebXRViewer');

        // const cameraLPos = new THREE.Vector3();
        // const cameraRPos = new THREE.Vector3();
        renderer.render = function() {
            if (isDigest) {
                // render "normally"
                render.apply(this, arguments);
            } else {
                isDigest = true;

                // save render state
                const currentRenderTarget = this.getRenderTarget();
                if (currentRenderTarget != null) {
                    // resize if an existing rendertarget exists (usually in webxr mode)
                    system.pass.setSize(currentRenderTarget.width, currentRenderTarget.height);
                    system.renderTarget.setSize(currentRenderTarget.width, currentRenderTarget.height);
                    system.remoteRenderTarget.setSize(currentRenderTarget.width, currentRenderTarget.height);
                }

                // store "normal" rendering output to this.renderTarget
                if (this.xr.enabled === true && this.xr.isPresenting === true) {
                    this.xr.updateCamera( this.xr.getCamera(), system.sceneEl.camera );
                }
                this.setRenderTarget(system.renderTarget);
                render.apply(this, arguments);
                this.setRenderTarget(currentRenderTarget);

                if (system.cameras.length > 1) {
                    // we have two cameras here (vr mode or headset ar mode)
                    hasDualCameras = !isWebXRViewer; // webarviewer seens to have 2 cameras, but uses one...

                    // const cameraL = system.cameras[0];
                    // const cameraR = system.cameras[1];
                    // cameraLPos.setFromMatrixPosition( cameraL.matrixWorld );
                    // cameraRPos.setFromMatrixPosition( cameraR.matrixWorld );
                    // ipd = cameraLPos.distanceTo( cameraRPos );
                } else {
                    // we just have a single camera here
                    hasDualCameras = false;
                }

                // render with custom shader (local-remote compositing):
                // this will internally call renderer.render(), which will execute the code within
                // the isDigest conditional above (render normally). this will copy the result of
                // the rendering to the readbuffer in the compositor (aka this.renderTarget), which we
                // will use for the "local" frame.
                // the composer will take the "local" frame and merge it with the "remote" frame from
                // the video by calling the compositor pass and executing the shaders.
                if (this.xr.enabled === true && this.xr.isPresenting === true) {
                    this.xr.updateCamera( this.xr.getCamera(), system.remoteCamera );
                }
                system.pass.setDoAsyncTimeWarp(data.doAsyncTimeWarp);
                if (data.doAsyncTimeWarp) {
                    system.pass.setCameraMats(camera, system.remoteCamera);
                }
                system.pass.setHasDualCameras(hasDualCameras);
                system.pass.render(this, currentRenderTarget, system.renderTarget);

                // restore render state
                this.setRenderTarget(currentRenderTarget);

                // call this part of the conditional again on the next call to render()
                isDigest = false;

                system.cameras = [];
            }
        };
    },

    unbind: function() {
        const renderer = this.sceneEl.renderer;
        renderer.render = this.originalRenderFunc;
        this.sceneEl.object3D.onBeforeRender = () => {};
    },
});
