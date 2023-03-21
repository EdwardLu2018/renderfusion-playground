const dummyMatrix = new THREE.Matrix4();

AFRAME.registerComponent('raycaster-custom', {
    schema: {

    },

    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;

        this.raycaster = new THREE.Raycaster();
        this.rawIntersections = [];
        this.intersections = [];

        this.remoteLocal = sceneEl.systems['remote-local'];
        this.compositor = sceneEl.systems['compositor'];
        this.experimentManager = sceneEl.systems['experiment-manager'];

        this.remoteScene = this.remoteLocal.remoteScene;
        this.remoteCamera = this.remoteLocal.remoteCamera;

        this.localScene = sceneEl.object3D;
        this.localCamera = sceneEl.camera;
    },

	updateOriginDirection: function() {
        const el = this.el;
        const data = this.data;

		dummyMatrix.identity().extractRotation( el.object3D.matrixWorld );

		this.raycaster.ray.origin.setFromMatrixPosition( el.object3D.matrixWorld );
		this.raycaster.ray.direction.set( 0, 0, -1 ).applyMatrix4( dummyMatrix );
	},

    checkIntersections: function() {
        const el = this.el;
        const data = this.data;

        var rawIntersections = this.rawIntersections;

        var intersection;
        var intersections = this.intersections;

        this.updateOriginDirection();
        rawIntersections.length = 0;
        console.log(Object.values(this.localScene.children))
        this.raycaster.intersectObjects(Object.values(this.localScene.children), true, rawIntersections);

        intersections.length = 0;
        for (i = 0; i < rawIntersections.length; i++) {
            intersection = rawIntersections[i];
            if (intersection.object === el.getObject3D('line')) {
                continue;
            }
        }

        console.log(intersections)
	},

    tock: function(time) {
        this.checkIntersections();
    }
});
