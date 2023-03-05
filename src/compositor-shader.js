export const CompositorShader = {
    uniforms: {
        tLocalColor: {
            type: 't', value: new THREE.Texture(),
        },
        tRemoteColor: {
            type: 't', value: new THREE.Texture(),
        },
        tLocalDepth: {
            type: 't', value: new THREE.Texture(),
        },
        tRemoteDepth: {
            type: 't', value: new THREE.Texture(),
        },
        windowSize: {
            type: 'i2', value: [0, 0],
        },
        streamSize: {
            type: 'i2', value: [0, 0],
        },
        cameraNear: {
            type: 'f', value: 0.1,
        },
        cameraFar: {
            type: 'f', value: 10000.0,
        },
        hasDualCameras: {
            type: 'bool', value: false,
        },
        arMode: {
            type: 'bool', value: false,
        },
        vrMode: {
            type: 'bool', value: false,
        },
        doAsyncTimeWarp: {
            type: 'bool', value: true,
        },
        cameraLProjectionMatrix: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
        cameraLMatrixWorld: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
        cameraRProjectionMatrix: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
        cameraRMatrixWorld: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
        remoteLProjectionMatrix: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
        remoteLMatrixWorld: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
        remoteRProjectionMatrix: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
        remoteRMatrixWorld: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
    },

    vertexShader: require('./shaders/vert.glsl'),

    fragmentShader: require('./shaders/frag.glsl'),
};
