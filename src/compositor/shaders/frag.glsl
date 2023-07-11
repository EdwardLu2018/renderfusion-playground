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

uniform vec3 remoteLForward;

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

vec2 WorldToScreenPos(vec3 pos, mat4 CameraProjection, mat4 WorldToCamera, vec3 CameraPosition) {
    float nearPlane = cameraNear;
    float farPlane = cameraFar;
    float textureWidth = float(localSize.x);
    float textureHeight = float(localSize.y);
    vec3 SamplePos = pos;

    SamplePos = normalize(SamplePos - CameraPosition) * (nearPlane + (farPlane - nearPlane)) + CameraPosition;
    vec2 uv = vec2(0.0);
    vec4 toCam = WorldToCamera * vec4(SamplePos, 1.0);
    float camPosZ = toCam.z;
    float height = 2.0 * camPosZ / CameraProjection[1][1];
    float width = textureWidth / textureHeight * height;
    uv.x = (toCam.x + width / 2.0) / width;
    uv.y = (toCam.y + height / 2.0) / height;
    return 1.0 - uv;
}

vec3 getWorldPos(sampler2D depthSampler, vec3 CameraVector, vec3 CameraForward, vec3 CameraPos, vec2 uv) {
    float d = dot(CameraForward, CameraVector);
    float SceneDistance = linearEyeDepth(texture2D(depthSampler, uv).r) / d;
    vec3 worldPos = CameraPos + CameraVector * SceneDistance;
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

    vec4 localColor = texture2D( tLocalColor, coordLocalColor );
    float localDepth = readDepth( tLocalDepth, coordLocalDepth );

    vec2 coordRemoteColor = vUv;
    vec2 coordRemoteDepth = vUv;

    vec4 remoteColor;  // = texture2D( tRemoteColor, coordRemoteColor );
    float remoteDepth; // = readDepth( tRemoteDepth, coordRemoteDepth );

    bool oneCamera = !hasDualCameras;
    bool leftEye = (hasDualCameras && vUv.x < 0.5);
    bool rightEye = (hasDualCameras && vUv.x >= 0.5);

    bool occluded = false;
    bool missed = false;

    if (doAsyncTimeWarp) {
        float x;

        vec3 cameraPos = matrixWorldToPosition(cameraLMatrixWorld);
        vec3 remotePos = matrixWorldToPosition(remoteLMatrixWorld);
        vec3 cameraTopLeft = vCameraLTopLeft;
        vec3 cameraTopRight = vCameraLTopRight;
        vec3 cameraBotLeft = vCameraLBotLeft;
        vec3 cameraBotRight = vCameraLBotRight;
        vec3 remoteTopLeft = vRemoteLTopLeft;
        vec3 remotePlaneNormal = vRemoteLPlaneNormal;
        mat4 remoteProjectionMatrix = remoteLProjectionMatrix;
        mat4 remoteMatrixWorld = remoteLMatrixWorld;

        if (oneCamera) {
            x = vUv.x;
        }
        else if (leftEye) {
            x = 2.0 * vUv.x;
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

        vec2 uv3 = WorldToScreenPos(remotePos + cameraVector, remoteProjectionMatrix, inverse(remoteMatrixWorld), remotePos);

        vec3 currentPos = cameraPos;

        int steps = 100;
        float DistanceFromWorldToPos;
        for (int i = 0; i < steps; i++)
        {
            float stepSize = 30.0 / float(steps);
            currentPos += (cameraVector * stepSize);

            vec2 uv4 = WorldToScreenPos(currentPos, remoteProjectionMatrix, inverse(remoteMatrixWorld), remotePos);
            vec3 tracedPos = getWorldPos(tRemoteDepth, normalize(currentPos - remotePos), remoteLForward, remotePos, uv4);

            float DistanceToCurrentPos = distance(remotePos, currentPos);
            float DistanceToWorld = distance(remotePos, tracedPos);

            DistanceFromWorldToPos = DistanceToCurrentPos - DistanceToWorld;
            if (DistanceFromWorldToPos > stepSize)
            {
                occluded = true;
            }
            if (DistanceFromWorldToPos > 0.0)
            {
                break;
            }
            if (i == steps-1)
            {
                missed = true;
            }
        }

        uv3 = WorldToScreenPos(currentPos, remoteProjectionMatrix, inverse(remoteMatrixWorld), remotePos);

        coordRemoteColor = uv3;

        if (oneCamera) {
            // if (targetWidthGreater) {
            //     coordRemoteColor.x = (coordRemoteColor.x * localSizeF.x - padding) / float(localSize.x - totalPad);
            // }
            // else {
            //     coordRemoteColor.x = (coordRemoteColor.x * localSizeF.x + padding) / float(newWidth);
            // }
            coordRemoteDepth = coordRemoteColor;
        }
        else if (leftEye) {
            coordRemoteColor.x = coordRemoteColor.x;
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

    if (occluded) {
        vec2 OffsetUVLeft     = coordRemoteColor + vec2(1.0, 0.0)  * 0.01;
        vec2 OffsetUVRight    = coordRemoteColor + vec2(0.0, 1.0)  * 0.01;
        vec2 OffsetUVTop      = coordRemoteColor + vec2(-1.0, 0.0) * 0.01;
        vec2 OffsetUVDown     = coordRemoteColor + vec2(0.0, -1.0) * 0.01;

        vec4 remoteColorLeft      = texture2D(tRemoteColor, OffsetUVLeft );
        vec4 remoteColorRight     = texture2D(tRemoteColor, OffsetUVRight);
        vec4 remoteColorTop       = texture2D(tRemoteColor, OffsetUVTop  );
        vec4 remoteColorDown      = texture2D(tRemoteColor, OffsetUVDown );

        float Depth             = linearEyeDepth(texture2D(tRemoteDepth, coordRemoteColor).r);
        float DepthLeft         = linearEyeDepth(texture2D(tRemoteDepth, OffsetUVLeft ).r);
        float DepthRight        = linearEyeDepth(texture2D(tRemoteDepth, OffsetUVRight).r);
        float DepthTop          = linearEyeDepth(texture2D(tRemoteDepth, OffsetUVTop  ).r);
        float DepthDown         = linearEyeDepth(texture2D(tRemoteDepth, OffsetUVDown ).r);

        // Find the furthest away one of these five samples
        float FurthestDepth = max(max(max(max(Depth, DepthLeft), DepthRight), DepthTop), DepthDown);
        if (FurthestDepth == DepthLeft)
            remoteColor = remoteColorLeft;
        if (FurthestDepth == DepthRight)
            remoteColor = remoteColorRight;
        if (FurthestDepth == DepthTop)
            remoteColor = remoteColorTop;
        if (FurthestDepth == DepthDown)
            remoteColor = remoteColorDown;
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
