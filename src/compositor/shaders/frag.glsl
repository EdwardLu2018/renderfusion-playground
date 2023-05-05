#include <packing>

varying vec2 vUv;

varying vec3 vCameraLTopLeft, vCameraLTopRight, vCameraLBotLeft, vCameraLBotRight;
varying vec3 vCameraRTopLeft, vCameraRTopRight, vCameraRBotLeft, vCameraRBotRight;
varying vec3 vRemoteLTopLeft, vRemoteRTopLeft;
varying vec3 vRemoteLPlaneNormal, vRemoteRPlaneNormal;

uniform sampler2D tLocalColor, tLocalDepth;
uniform sampler2D tRemoteColor, tRemoteDepth;

uniform float cameraNear, cameraFar;

uniform bool hasDualCameras;
uniform bool arMode, vrMode;

uniform bool doAsyncTimeWarp;
uniform bool stretchBorders;
uniform bool preferLocal;

uniform ivec2 localSize, remoteSize;

uniform mat4 cameraLProjectionMatrix, cameraLMatrixWorld;
uniform mat4 remoteLProjectionMatrix, remoteLMatrixWorld;
uniform mat4 cameraRProjectionMatrix, cameraRMatrixWorld;
uniform mat4 remoteRProjectionMatrix, remoteRMatrixWorld;

float readDepth(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth;
}

vec3 matrixWorldToPosition(mat4 matrixWorld) {
    return vec3(matrixWorld[3]);
}

float intersectPlane(vec3 p0, vec3 n, vec3 l0, vec3 l) {
    n = normalize(n);
    l = normalize(l);
    float t = -1.0;
    float denom = dot(n, l);
    if (denom > 1e-6) {
        vec3 p0l0 = p0 - l0;
        t = dot(p0l0, n) / denom;
        return t;
    }
    return t;
}

vec2 worldToCamera(vec3 pt, mat4 projectionMatrix, mat4 matrixWorld) {
    vec4 uv4 = projectionMatrix * inverse(matrixWorld) * vec4(pt, 1.0);
    vec3 uv3 = uv4.xyz / uv4.w;
    vec2 uv2 = uv3.xy / uv3.z;
    return (uv2 + 1.0) / 2.0;
}

void main() {
    vec2 remoteSizeF = vec2(remoteSize);
    vec2 localSizeF = vec2(localSize);

    // calculate new dimensions, maintaining aspect ratio
    float aspect = remoteSizeF.x / remoteSizeF.y;
    int newHeight = localSize.y;
    int newWidth = int(aspect * float(newHeight));

    // calculate left and right padding offset
    int totalPad = abs(localSize.x - newWidth);
    float padding = float(totalPad / 2);
    float paddingLeft = padding / localSizeF.x;
    float paddingRight = 1.0 - paddingLeft;

    bool targetWidthGreater = localSize.x > newWidth;

    vec2 coordLocalColor = vUv;
    vec2 coordLocalDepth = vUv;

    vec4 localColor = texture2D( tLocalColor, coordLocalColor );
    float localDepth = readDepth( tLocalDepth, coordLocalDepth );

    vec2 coordRemoteColor = vUv;
    vec2 coordRemoteDepth = vUv;

    vec4 remoteColor;  // = texture2D( tRemoteColor, coordRemoteColor );
    float remoteDepth; // = readDepth( tRemoteDepth, coordRemoteDepth );

    bool oneCamera = !hasDualCameras;
    bool leftEye = (hasDualCameras && vUv.x < 0.5);
    bool rightEye = (hasDualCameras && vUv.x >= 0.5);

    if (doAsyncTimeWarp) {
        float x;
        vec3 cameraPos;
        vec3 cameraTopLeft, cameraTopRight, cameraBotLeft, cameraBotRight;
        vec3 remoteTopLeft, remotePlaneNormal;
        mat4 remoteProjectionMatrix, remoteMatrixWorld;

        if (oneCamera || leftEye) {
            if (oneCamera) x = vUv.x;
            else if (leftEye) x = 2.0 * vUv.x;
            cameraPos = matrixWorldToPosition(cameraLMatrixWorld);
            cameraTopLeft = vCameraLTopLeft;
            cameraTopRight = vCameraLTopRight;
            cameraBotLeft = vCameraLBotLeft;
            cameraBotRight = vCameraLBotRight;
            remoteTopLeft = vRemoteLTopLeft;
            remotePlaneNormal = vRemoteLPlaneNormal;
            remoteProjectionMatrix = remoteLProjectionMatrix;
            remoteMatrixWorld = remoteLMatrixWorld;
        }
        else if (rightEye) {
            x = 2.0 * (vUv.x - 0.5);
            cameraPos = matrixWorldToPosition(cameraRMatrixWorld);
            cameraTopLeft = vCameraRTopLeft;
            cameraTopRight = vCameraRTopRight;
            cameraBotLeft = vCameraRBotLeft;
            cameraBotRight = vCameraRBotRight;
            remoteTopLeft = vRemoteRTopLeft;
            remotePlaneNormal = vRemoteRPlaneNormal;
            remoteProjectionMatrix = remoteRProjectionMatrix;
            remoteMatrixWorld = remoteRMatrixWorld;
        }

        vec3 cameraVector = mix( mix(cameraTopLeft, cameraTopRight, x),
                                 mix(cameraBotLeft, cameraBotRight, x),
                                 1.0 - vUv.y );

        float t = intersectPlane(remoteTopLeft, remotePlaneNormal, cameraPos, cameraVector);
        vec3 hitPt = cameraPos + cameraVector * t;
        vec2 uv3 = worldToCamera(hitPt, remoteProjectionMatrix, remoteMatrixWorld);
        coordRemoteColor = uv3;

        if (oneCamera) {
            coordRemoteDepth = coordRemoteColor;
            // if (targetWidthGreater) {
            //     coordRemoteColor.x = (coordRemoteColor.x * localSizeF.x - padding) / float(localSize.x - totalPad);
            // }
            // else {
            //     coordRemoteColor.x = (coordRemoteColor.x * localSizeF.x + padding) / float(newWidth);
            // }
        }
        else if (leftEye) {
            coordRemoteColor.x = coordRemoteColor.x / 2.0;
            coordRemoteDepth = coordRemoteColor;
        }
        else if (rightEye) {
            coordRemoteColor.x = coordRemoteColor.x / 2.0 + 0.5;
            coordRemoteDepth = coordRemoteColor;
        }

        float xMin = ((!hasDualCameras || vUv.x < 0.5) ? 0.0 : 0.5);
        float xMax = ((!hasDualCameras || vUv.x >= 0.5) ? 1.0 : 0.5);
        if (!stretchBorders) {
            remoteColor = texture2D( tRemoteColor, coordRemoteColor );
            remoteDepth = readDepth( tRemoteDepth, coordRemoteDepth );
            if (coordRemoteColor.x < xMin || coordRemoteColor.x > xMax ||
                coordRemoteColor.y < 0.0  || coordRemoteColor.y > 1.0) {
                remoteColor = vec4(0.0);
            }
        }
        else {
            coordRemoteColor.x = min(max(coordRemoteColor.x, xMin), xMax);
            coordRemoteColor.y = min(max(coordRemoteColor.y, 0.0), 1.0);
            coordRemoteDepth = coordRemoteColor;
            remoteColor = texture2D( tRemoteColor, coordRemoteColor );
            remoteDepth = readDepth( tRemoteDepth, coordRemoteDepth );
        }
    }
    else {
        remoteColor = texture2D( tRemoteColor, coordRemoteColor );
        remoteDepth = readDepth( tRemoteDepth, coordRemoteDepth );
    }

    vec4 color = localColor;
    // if (!targetWidthGreater ||
    //     (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        if ((preferLocal && remoteDepth < localDepth) || (!preferLocal && remoteDepth <= localDepth))
            color = vec4(remoteColor.rgb, 1.0);
        else
            color = localColor;
    // }
    // else {
    //     color = localColor;
    // }

    // color = vec4(remoteColor.rgb, 1.0);
    // color = vec4(localColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(remoteDepth);
    // gl_FragColor.a = 1.0;
}
