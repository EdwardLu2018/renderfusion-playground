# Hybrid Rendering Simulation

Simulate Hybrid/Split/Mixed rendering on the web. Works in desktop, mobile, and WebXR-enabled devices like AR/VR headsets.
The playground artificially delays a virtual scene (simulating "remote rendering" with network delays) and composites it
with a "locally rendered" virtual scene.

Visit https://edwardlu2018.github.io/hybrid-rendering-simulation to explore the playground.

## GUI (2D)
Note: the 2D GUI is __not__ accessible in WebXR immersive sessions (if you click AR/VR button).

![gui-2d](./images/gui-2d.png)

## GUI (3D)
Note: the 3D GUI is __not__ accessible outside WebXR immersive sessions (you need to click AR/VR button). The GUI can be
interacted with using a point-and-click headset controller.

![gui-2d](./images/gui-3d.png)

## Development
```
git clone git@github.com:EdwardLu2018/hybrid-rendering-simulation.git
npm install
npm run start
```

Then, open another terminal and run
```
npm run watch   # for automatic rebuilds
```
or
```
npm run build   # for single build
```
