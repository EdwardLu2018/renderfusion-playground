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
uniform bool reprojectMovement;
uniform bool preferLocal;

uniform ivec2 localSize, remoteSize;

uniform vec3 remoteLForward, remoteRForward;

uniform mat4 cameraLProjectionMatrix, cameraLMatrixWorld;
uniform mat4 remoteLProjectionMatrix, remoteLMatrixWorld;
uniform mat4 cameraRProjectionMatrix, cameraRMatrixWorld;
uniform mat4 remoteRProjectionMatrix, remoteRMatrixWorld;

// adapted from: https://gist.github.com/hecomi/9580605
float linear01Depth(float depth) {
    float x = 1.0 - cameraFar / cameraNear;
    float y = cameraFar / cameraNear;
    float z = x / cameraFar;
    float w = y / cameraFar;
	return 1.0 / (x * depth + y);
}

float linearEyeDepth(float depth) {
    float x = 1.0 - cameraFar / cameraNear;
    float y = cameraFar / cameraNear;
    float z = x / cameraFar;
    float w = y / cameraFar;
	return 1.0 / (z * depth + w);
}

float readDepth(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return linear01Depth(depth);
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

vec2 worldToScreenPos(vec3 pos, mat4 cameraProjection, mat4 worldToCamera, vec3 cameraPosition) {
    float textureWidth = !hasDualCameras ? float(localSize.x) : float(localSize.x) / 2.0;
    float textureHeight = float(localSize.y);
    vec3 samplePos = pos;

    samplePos = normalize(samplePos - cameraPosition) * (cameraNear + (cameraFar - cameraNear)) + cameraPosition;
    vec4 toCam = worldToCamera * vec4(samplePos, 1.0);
    vec3 toCam3 = toCam.xyz / toCam.w;
    float camPosZ = toCam3.z;
    float height = 2.0 * camPosZ / cameraProjection[1][1];
    float width = textureWidth / textureHeight * height;

    vec2 uv;
    uv.x = (toCam3.x + width / 2.0) / width;
    uv.y = (toCam3.y + height / 2.0) / height;
    return 1.0 - uv;
}

vec3 getWorldPos(vec3 cameraVector, vec3 cameraForward, vec3 cameraPos, vec2 uv) {
    float d = dot(cameraForward, cameraVector);
    float SceneDistance = linearEyeDepth(texture2D(tRemoteDepth, uv).r) / d;
    vec3 worldPos = cameraPos + cameraVector * SceneDistance;
    return worldPos;
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

    vec4 localColor  = texture2D( tLocalColor, coordLocalColor );
    float localDepth = readDepth( tLocalDepth, coordLocalDepth );

    vec2 coordRemoteColor = vUv;
    vec2 coordRemoteDepth = vUv;

    vec4 remoteColor;  // = texture2D( tRemoteColor, coordRemoteColor );
    float remoteDepth; // = readDepth( tRemoteDepth, coordRemoteDepth );

    bool oneCamera = !hasDualCameras;
    bool leftEye   = (hasDualCameras && vUv.x < 0.5);
    bool rightEye  = (hasDualCameras && vUv.x >= 0.5);

    if (doAsyncTimeWarp) {
        bool occluded = false;

        float x;

        vec3 cameraPos              = matrixWorldToPosition(cameraLMatrixWorld);
        vec3 remotePos              = matrixWorldToPosition(remoteLMatrixWorld);
        vec3 remoteForward          = remoteLForward;
        vec3 cameraTopLeft          = vCameraLTopLeft;
        vec3 cameraTopRight         = vCameraLTopRight;
        vec3 cameraBotLeft          = vCameraLBotLeft;
        vec3 cameraBotRight         = vCameraLBotRight;
        vec3 remoteTopLeft          = vRemoteLTopLeft;
        vec3 remotePlaneNormal      = vRemoteLPlaneNormal;
        mat4 remoteProjectionMatrix = remoteLProjectionMatrix;
        mat4 remoteMatrixWorld      = remoteLMatrixWorld;

        x = vUv.x;

        if (leftEye) {
            x = 2.0 * vUv.x;
        }
        if (rightEye) {
            x = 2.0 * (vUv.x - 0.5);
            cameraPos              = matrixWorldToPosition(cameraRMatrixWorld);
            remotePos              = matrixWorldToPosition(remoteRMatrixWorld);
            remoteForward          = remoteRForward;
            cameraTopLeft          = vCameraRTopLeft;
            cameraTopRight         = vCameraRTopRight;
            cameraBotLeft          = vCameraRBotLeft;
            cameraBotRight         = vCameraRBotRight;
            remoteTopLeft          = vRemoteRTopLeft;
            remotePlaneNormal      = vRemoteRPlaneNormal;
            remoteProjectionMatrix = remoteRProjectionMatrix;
            remoteMatrixWorld      = remoteRMatrixWorld;
        }

        vec3 cameraVector = mix( mix(cameraTopLeft, cameraTopRight, x),
                                 mix(cameraBotLeft, cameraBotRight, x),
                                 1.0 - vUv.y );

        // float t = intersectPlane(remoteTopLeft, remotePlaneNormal, cameraPos, cameraVector);
        // vec3 hitPt = cameraPos + cameraVector * t;
        // vec2 uv3 = worldToCamera(hitPt, remoteProjectionMatrix, remoteMatrixWorld);

        vec2 uv3 = worldToScreenPos(remotePos + cameraVector, remoteProjectionMatrix, inverse(remoteMatrixWorld), remotePos);

        if (reprojectMovement) {
            vec3 currentPos = cameraPos;

            int steps = 100;
            float distanceFromWorldToPos;
            for (int i = 0; i < steps; i++) {
                float stepSize = 30.0 / float(steps);
                currentPos += (cameraVector * stepSize);

                vec2 uv4 = worldToScreenPos(currentPos, remoteProjectionMatrix, inverse(remoteMatrixWorld), remotePos);
                if (leftEye) {
                    uv4.x = uv4.x / 2.0;
                }
                if (rightEye) {
                    uv4.x = uv4.x / 2.0 + 0.5;
                }

                vec3 tracedPos = getWorldPos(normalize(currentPos - remotePos), remoteForward, remotePos, uv4);

                float distanceToCurrentPos = distance(remotePos, currentPos);
                float distanceToWorld = distance(remotePos, tracedPos);

                distanceFromWorldToPos = distanceToCurrentPos - distanceToWorld;
                if (distanceFromWorldToPos > stepSize) {
                    occluded = true;
                }
                if (distanceFromWorldToPos > 0.0) {
                    break;
                }
            }

            uv3 = worldToScreenPos(currentPos, remoteProjectionMatrix, inverse(remoteMatrixWorld), remotePos);
        }

        coordRemoteColor = uv3;
        coordRemoteDepth = coordRemoteColor;

        if (leftEye) {
            coordRemoteColor.x = coordRemoteColor.x / 2.0;
            coordRemoteDepth = coordRemoteColor;
        }
        if (rightEye) {
            coordRemoteColor.x = coordRemoteColor.x / 2.0 + 0.5;
            coordRemoteDepth = coordRemoteColor;
        }

        float xMin = ((oneCamera || leftEye) ? 0.0 : 0.5);
        float xMax = ((oneCamera || rightEye) ? 1.0 : 0.5);
        if (!stretchBorders) {
            remoteColor = texture2D( tRemoteColor, coordRemoteColor );
            remoteDepth = readDepth( tRemoteDepth, coordRemoteDepth );
            if (coordRemoteColor.x < xMin || coordRemoteColor.x > xMax ||
                coordRemoteColor.y < 0.0  || coordRemoteColor.y > 1.0) {
                remoteColor = vec4(0.0);
            }
        }
        else {
            coordRemoteColor.x = min(max(coordRemoteColor.x, xMin), xMax - 0.001);
            coordRemoteColor.y = min(max(coordRemoteColor.y, 0.0), 1.0);
            coordRemoteDepth = coordRemoteColor;
            remoteColor = texture2D( tRemoteColor, coordRemoteColor );
            remoteDepth = readDepth( tRemoteDepth, coordRemoteDepth );
        }

        if (reprojectMovement && occluded) {
            vec2 offsetUVLeft      = coordRemoteColor + vec2(1.0, 0.0)  * 0.01;
            vec2 offsetUVRight     = coordRemoteColor + vec2(0.0, 1.0)  * 0.01;
            vec2 offsetUVTop       = coordRemoteColor + vec2(-1.0, 0.0) * 0.01;
            vec2 offsetUVDown      = coordRemoteColor + vec2(0.0, -1.0) * 0.01;

            vec4 remoteColorLeft   = texture2D(tRemoteColor, offsetUVLeft );
            vec4 remoteColorRight  = texture2D(tRemoteColor, offsetUVRight);
            vec4 remoteColorTop    = texture2D(tRemoteColor, offsetUVTop  );
            vec4 remoteColorDown   = texture2D(tRemoteColor, offsetUVDown );

            float remoteDepth0     = linearEyeDepth(texture2D(tRemoteDepth, coordRemoteColor).r);
            float remoteDepthLeft  = linearEyeDepth(texture2D(tRemoteDepth, offsetUVLeft    ).r);
            float remoteDepthRight = linearEyeDepth(texture2D(tRemoteDepth, offsetUVRight   ).r);
            float remoteDepthTop   = linearEyeDepth(texture2D(tRemoteDepth, offsetUVTop     ).r);
            float remoteDepthDown  = linearEyeDepth(texture2D(tRemoteDepth, offsetUVDown    ).r);

            // Find the furthest away one of these five samples
            float remoteDepth = max(max(max(max(remoteDepth0, remoteDepthLeft), remoteDepthRight), remoteDepthTop), remoteDepthDown);
            if (remoteDepth == remoteDepthLeft) {
                remoteColor = remoteColorLeft;
            }
            if (remoteDepth == remoteDepthRight) {
                remoteColor = remoteColorRight;
            }
            if (remoteDepth == remoteDepthTop) {
                remoteColor = remoteColorTop;
            }
            if (remoteDepth == remoteDepthDown) {
                remoteColor = remoteColorDown;
            }
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
