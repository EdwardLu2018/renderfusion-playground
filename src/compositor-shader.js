export const CompositorShader = {
    uniforms: {
        tDiffuse: {
            type: 't', value: new THREE.Texture(),
        },
        tStream: {
            type: 't', value: new THREE.Texture(),
        },
        tDepth: {
            type: 't', value: new THREE.Texture(),
        },
        tDepthStream: {
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
        remoteViewPortTopLeft: {
            type: 'vec3', value: new THREE.Vector3(),
        },
        remoteViewPortTopRight: {
            type: 'vec3', value: new THREE.Vector3(),
        },
        remoteViewPortBotLeft: {
            type: 'vec3', value: new THREE.Vector3(),
        },
        remoteViewPortBotRight: {
            type: 'vec3', value: new THREE.Vector3(),
        },
    },

    vertexShader: require('./shaders/vert.glsl'),

    fragmentShader: require('./shaders/frag.glsl'),
};
