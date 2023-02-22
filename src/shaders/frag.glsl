#include <packing>

varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform sampler2D tStream;
uniform sampler2D tDepth;
uniform sampler2D tDepthStream;

uniform float cameraNear;
uniform float cameraFar;

uniform bool hasDualCameras;
uniform bool arMode;
uniform bool vrMode;

uniform ivec2 windowSize;
uniform ivec2 streamSize;

float readDepthDiffuseOld( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;
    return fragCoordZ;

    // float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    // return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );

    // https://sites.google.com/site/cgwith3js/home/depth-buffer-visualization
    float ndcZ = 2.0 * fragCoordZ - 1.0;
    float linearDepth = (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - ndcZ * (cameraFar - cameraNear));
    return (linearDepth - cameraNear) / (cameraFar - cameraNear);

    // float _ZBufferParamsX = 1.0 - cameraFar / cameraNear;
    // float _ZBufferParamsY = cameraFar / cameraNear;
    // return 1.0 / (_ZBufferParamsX * fragCoordZ + _ZBufferParamsY);
}

float readDepth(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth;
}

void main() {
    ivec2 frameSize = ivec2(streamSize.x / 2, streamSize.y);
    vec2 frameSizeF = vec2(frameSize);
    vec2 windowSizeF = vec2(windowSize);

    vec2 coordDestNormalized = vUv;
    vec2 coordStreamNormalized = vUv;

    vec2 coordDiffuseColor = coordDestNormalized;
    vec2 coordDiffuseDepth = coordDestNormalized;

    vec4 diffuseColor = texture2D( tDiffuse, coordDiffuseColor );
    float diffuseDepth = readDepth( tDepth, coordDiffuseDepth );

    vec2 coordStreamColor = coordStreamNormalized;
    vec2 coordStreamDepth = coordStreamNormalized;

    vec4 streamColor = texture2D( tStream, coordStreamColor );
    float streamDepth = readDepth( tDepthStream, coordStreamDepth );

    vec4 color;
    // color = streamColor;
    // color = diffuseDepth * streamColor + streamDepth * diffuseColor;

    if (streamDepth <= diffuseDepth)
        color = vec4(streamColor.rgb, 1.0);
    else
        color = diffuseColor;

    // color = vec4(streamColor.rgb, 1.0);
    // color = vec4(diffuseColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(streamDepth);
    // gl_FragColor.a = 1.0;
}
