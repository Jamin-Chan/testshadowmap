'use strict'

import { hex2rgb, deg2rad, loadExternalFile } from '../utils/utils.js'
import Box from './box3d.js'
import Input from '../input/input.js'
import * as mat4 from '../lib/glmatrix/mat4.js'
import * as vec3 from '../lib/glmatrix/vec3.js'
import * as quat from '../lib/glmatrix/quat.js'

import { OBJLoader } from '../../assignment3.objloader.js'
import { Scene, SceneNode } from './scene.js'
import Shader from '../utils/shader.js'
import {Triangle} from './assignment0.js'
import Firework from '../Firework.js'
import Particle from '../Particles.js'
/**
 * @Class
 * WebGlApp that will call basic GL functions, manage a list of shapes, and take care of rendering them
 * 
 * This class will use the Shapes that you have implemented to store and render them
 */
class WebGlApp 
{
    /**
     * Initializes the app with a box, and the model, view, and projection matrices
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Map<String,Shader>} shader The shaders to be used to draw the object
     * @param {AppState} app_state The state of the UI
     */
    constructor( gl, shaders, app_state )
    {

        // Set GL flags
        this.setGlFlags( gl )
        this.shadowMap = this.createShadowMap(gl, 1024, 1024);

        // Store the shader(s)
        this.shaders = shaders // Collection of all shaders
        this.box_shader = this.shaders[0]
        this.light_shader = this.shaders[this.shaders.length - 1]
        this.active_shader = 1

        const shadowShader = this.shaders[1];
        console.log(shadowShader)
        this.shaders.shadowShader = shadowShader;
        
        // Create a box instance and create a variable to track its rotation
        this.box = new Box( gl, this.box_shader )
        this.animation_step = 0

        // Declare a variable to hold a Scene
        // Scene files can be loaded through the UI (see below)
        this.scene = null

        // Bind a callback to the file dialog in the UI that loads a scene file
        app_state.onOpen3DScene((filename) => {
            let scene_config = JSON.parse(loadExternalFile(`./scenes/${filename}`))
            this.scene = new Scene(scene_config, gl, this.shaders[this.active_shader], this.light_shader)
            return this.scene
        })

        this.triangle_shader = new Shader( gl, '../../shaders/rocket.vert.glsl', '../../shaders/rocket.frag.glsl' );
        this.triangle = new Triangle(gl, this.triangle_shader, [410,206], hex2rgb('#FFBF00'), 88  )
        this.fireworkIsPlaceable = false;
        this.gl = gl;
        this.firework_shader = new Shader( gl, '../../shaders/firework.vert.glsl', '../../shaders/firework.frag.glsl' );
        this.fireworksBuffer = gl.createBuffer();

        // Create the view matrix
        this.eye     =   [2.0, 0.5, -2.0]
        this.center  =   [0, 0, 0]
       
        this.forward =   null
        this.right   =   null
        this.up      =   null
        // Forward, Right, and Up are initialized based on Eye and Center
        this.updateViewSpaceVectors()
        this.view = mat4.lookAt(mat4.create(), this.eye, this.center, this.up)

        // Create the projection matrix
        this.fovy = 60
        this.aspect = 16/9
        this.near = 0.001
        this.far = 1000.0
        this.projection = mat4.perspective(mat4.create(), deg2rad(this.fovy), this.aspect, this.near, this.far)

        // Use the shader's setUniform4x4f function to pass the matrices
        for (let shader of this.shaders) {
            shader.use()
            shader.setUniform3f('u_eye', this.eye);
            shader.setUniform4x4f('u_v', this.view)
            shader.setUniform4x4f('u_p', this.projection)
            shader.unuse()
        }
        this.startTime = performance.now();
        this.fireworks = [];
        this.numParticlesPerFirework = 200;

        document.getElementById('addFirework').addEventListener('click', () => {
            this.fireworkIsPlaceable = true;
        });
        document.getElementById('launchFireworks').addEventListener('click', () => {
            for(let i = 0;i<this.fireworks.length;i++)
            {
                if(this.fireworks[i].active == false)
                {
                    this.fireworks[i].startTime = performance.now()/1000;
                    this.fireworks[i].active = true;
                }
            }
        });
        this.canvas = canvas;
        this.initial_width = canvas.width;
        this.initial_height = canvas.height; 

    }

    launchFirework(firework) {
        firework.hasLaunched = true;
         let particles = [];
         for (let i = 0; i < this.numParticlesPerFirework; i++) {
             let particleAngle = Math.random() * Math.PI*2;
             let particleSpeed = Math.random() * 0.05 + 0.01;
             particles.push(new Particle(firework.centerX,firework.centerY,Math.cos(particleAngle) * particleSpeed,Math.sin(particleAngle) * particleSpeed,Math.random() * 0.5 + 1,0,-0.05)); 
         }
         firework.particlesArray = particles;
         firework.startTime = performance.now() / 1000;
     }

    createShadowMap(gl, width, height) {
        const depthTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
        const shadowFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
        return { depthTexture, shadowFramebuffer };
    }

    renderShadowMap(gl, shadowShader, scene, lightViewProjectionMatrix) {
        // Bind the shadow framebuffer
        console.log(this.shadowMap.shadowFramebuffer)
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowMap.shadowFramebuffer);
        //gl.viewport(0, 0, canvas_width, canvas_height );
        gl.clear(gl.DEPTH_BUFFER_BIT);
    
        // Use the shadow shader program
        shadowShader.use();
        shadowShader.setUniform4x4f('u_lightVP', lightViewProjectionMatrix);
    
        // Render the scene to the shadow map
        scene.render(gl);
    
        // Unbind framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /**
     * Sets up GL flags
     * In this assignment we are drawing 3D data, so we need to enable the flag 
     * for depth testing. This will prevent from geometry that is occluded by other 
     * geometry from 'shining through' (i.e. being wrongly drawn on top of closer geomentry)
     * 
     * Look into gl.enable() and gl.DEPTH_TEST to learn about this topic
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    setGlFlags( gl ) {

        // Enable depth test
        gl.enable(gl.DEPTH_TEST)

    }

    /**
     * Sets the viewport of the canvas to fill the whole available space so we draw to the whole canvas
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Number} width 
     * @param {Number} height 
     */
    setViewport( gl, width, height )
    {
        gl.viewport( 0, 0, width, height )
    }

    /**
     * Clears the canvas color
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    clearCanvas( gl )
    {
        gl.clearColor(...hex2rgb('#ffffff'), 1.0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    }
    
    /**
     * Updates components of this app
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {AppState} app_state The state of the UI
     * @param {Number} delta_time The time in fractional seconds since the last frame
     */
    update( gl, app_state, delta_time ) 
    {
        if (this.fireworkIsPlaceable && Input.isMouseDown( 0 )) {
            let fireworkLaunchTime = parseFloat(document.getElementById('launch-time').value);
            let fireworkColor = document.getElementById('firework-color').value;
            let fireworkSize = parseFloat(document.getElementById('firework-size').value);
            this.fireworks.push(new Firework( fireworkLaunchTime, fireworkColor, fireworkSize, false, 0,null,this.firework_shader,this.gl,false,0,0,Input.mousex,Input.mousey));     
            this.fireworkIsPlaceable = false;
            let x2 = Input.mousex/this.canvas.width*2.0 - 1.0;
            this.fireworks[this.fireworks.length - 1].centerX = x2;
            this.fireworks[this.fireworks.length - 1].centerY = 1.0-(Input.mousey)/this.canvas.height*2.0;
        }   

        // Shader
        if (this.scene != null) {
            let old_active_shader = this.active_shader
            switch(app_state.getState('Shading')) {
                case 'Phong':
                    this.active_shader = 1
                    break
                case 'Textured':
                    this.active_shader = 2
                    break
            }
            if (old_active_shader != this.active_shader) {
                this.scene.resetLights( this.shaders[this.active_shader] )
                for (let node of this.scene.getNodes()) {
                    if (node.type == 'model')
                        node.setShader(gl, this.shaders[this.active_shader])
                    if (node.type == 'light') 
                        node.setTargetShader(this.shaders[this.active_shader])
                }
            }
        }

        // Shader Debug
        switch(app_state.getState('Shading Debug')) {
            case 'Normals':
                this.shaders[this.active_shader].use()
                this.shaders[this.active_shader].setUniform1i('u_show_normals', 1)
                this.shaders[this.active_shader].unuse()
                break
            default:
                this.shaders[this.active_shader].use()
                this.shaders[this.active_shader].setUniform1i('u_show_normals', 0)
                this.shaders[this.active_shader].unuse()
                break
        }

        // Control
        switch(app_state.getState('Control')) {
            case 'Camera':
                this.updateCamera( delta_time )
                break
            case 'Scene Node':
                // Only do this if a scene is loaded
                if (this.scene == null)
                    break
                
                // Get the currently selected scene node from the UI
                let scene_node = this.scene.getNode( app_state.getState('Select Scene Node') )
                this.updateSceneNode( scene_node, delta_time )
                break
        }
    }

    /**
     * Update the Forward, Right, and Up vector according to changes in the 
     * camera position (Eye) or the center of focus (Center)
     */
     updateViewSpaceVectors( ) {
        this.forward = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), this.eye, this.center))
        this.right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), [0,1,0], this.forward))
        this.up = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), this.forward, this.right))
    }

    /**
     * Update the camera view based on user input and the arcball viewing model
     * 
     * Supports the following interactions:
     * 1) Left Mouse Button - Rotate the view's center
     * 2) Middle Mouse Button or Space+Left Mouse Button - Pan the view relative view-space
     * 3) Right Mouse Button - Zoom towards or away from the view's center
     * 
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    updateCamera( delta_time ) {
        let view_dirty = false

        // Control - Zoom
        if (Input.isMouseDown(2)) {
            // Scale camera position
            let translation = vec3.scale(vec3.create(), this.forward, -Input.getMouseDy() * delta_time)
            this.eye = vec3.add(vec3.create(), this.eye, translation)

            // Set dirty flag to trigger view matrix updates
            view_dirty = true
        }

        // Control - Rotate
        if (Input.isMouseDown(0) && !Input.isKeyDown(' ')) {
            // Rotate around xz plane around y
            this.eye = vec3.rotateY(vec3.create(), this.eye, this.center, deg2rad(-10 * Input.getMouseDx() * delta_time ))
            
            // Rotate around view-aligned rotation axis
            let rotation = mat4.fromRotation(mat4.create(), deg2rad(-10 * Input.getMouseDy() * delta_time ), this.right)
            this.eye = vec3.transformMat4(vec3.create(), this.eye, rotation)

            // Set dirty flag to trigger view matrix updates
            view_dirty = true
        }

        // Control - Pan
        if (Input.isMouseDown(1) || (Input.isMouseDown(0) && Input.isKeyDown(' '))) {
            // Create translation on two view-aligned axes
            let translation = vec3.add(vec3.create(), 
                vec3.scale(vec3.create(), this.right, -0.75 * Input.getMouseDx() * delta_time),
                vec3.scale(vec3.create(), this.up, 0.75 * Input.getMouseDy() * delta_time)
            )

            // Translate both eye and center in parallel
            this.eye = vec3.add(vec3.create(), this.eye, translation)
            this.center = vec3.add(vec3.create(), this.center, translation)

            view_dirty = true
        }

        // Update view matrix if needed
        if (view_dirty) {
            // Update Forward, Right, and Up vectors
            this.updateViewSpaceVectors()

            this.view = mat4.lookAt(mat4.create(), this.eye, this.center, this.up)

            for (let shader of this.shaders) {
                shader.use()
                shader.setUniform3f('u_eye', this.eye)
                shader.setUniform4x4f('u_v', this.view)
                shader.unuse()
            }
        }
    }

    /**
     * Update a SceneNode's local transformation
     * 
     * Supports the following interactions:
     * 1) Left Mouse Button - Rotate the node relative to the view along the Up and Right axes
     * 2) Middle Mouse Button or Space+Left Mouse Button - Translate the node relative to the view along the Up and Right axes
     * 3) Right Mouse Button - Scales the node around it's local center
     * 
     * @param {SceneNode} node The SceneNode to manipulate
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    updateSceneNode( node, delta_time ) {
        let node_dirty = false

        let translation = mat4.create()
        let rotation = mat4.create()
        let scale = mat4.create()

        // Control - Scale
        if (Input.isMouseDown(2)) {
            let factor = 1.0 + Input.getMouseDy() * delta_time
            scale = mat4.fromScaling(mat4.create(), [factor, factor, factor])

            node_dirty = true
        }

        // Control - Rotate
        if (Input.isMouseDown(0) && !Input.isKeyDown(' ')) {

            let rotation_up = mat4.fromRotation(mat4.create(), deg2rad(10 * Input.getMouseDx() * delta_time), this.up)
            let rotation_right = mat4.fromRotation(mat4.create(), deg2rad(10 * Input.getMouseDy() * delta_time), this.right)

            rotation = mat4.multiply(mat4.create(), rotation_right, rotation_up)

            node_dirty = true
        }

        // Control - Translate
        if (Input.isMouseDown(1) || (Input.isMouseDown(0) && Input.isKeyDown(' '))) {

            translation = mat4.fromTranslation(mat4.create(),
                vec3.add(vec3.create(), 
                    vec3.scale(vec3.create(), this.right, 0.75 * Input.getMouseDx() * delta_time),
                    vec3.scale(vec3.create(), this.up, -0.75 * Input.getMouseDy() * delta_time)
                ))

            node_dirty = true
        }


        // Update node transformation if needed
        if (node_dirty) {

            // Get the world rotation and scale of the node
            // Construct the inverse transformation of that matrix
            // We isolate the rotation and scale by setting the right column of the matrix to 0,0,0,1
            // If this is the root node, we set both matrices to identity
            let world_rotation_scale = mat4.clone(node.getWorldTransformation())
            let world_rotation_scale_inverse = null
            if (world_rotation_scale != null) {
                world_rotation_scale[12] = 0, world_rotation_scale[13] = 0, world_rotation_scale[14] = 0
                world_rotation_scale_inverse = mat4.invert(mat4.create(), world_rotation_scale)
            } else {
                world_rotation_scale = mat4.create()
                world_rotation_scale_inverse = mat4.create()
            }

            // Get the node's local transformation that we modify
            let transformation = node.getTransformation()

            // It's best to read this block from the bottom up
            // This is the order in which the transformations will take effect
            // Fourth, apply the scaling
            transformation = mat4.multiply(mat4.create(), transformation, scale)
            // Third, remove the full world rotation and scale to turn this back into a local matrix
            transformation = mat4.multiply(mat4.create(), transformation, world_rotation_scale_inverse)
            // Second, apply rotation and translation in world space alignment
            transformation = mat4.multiply(mat4.create(), transformation, translation)
            transformation = mat4.multiply(mat4.create(), transformation, rotation)
            // First, temporarily apply the full world rotation and scale to align the object in world space
            transformation = mat4.multiply(mat4.create(), transformation, world_rotation_scale)        

            // Update the node's transformation
            node.setTransformation(transformation)
        }
    }

    
    calculateLightViewProjectionMatrix() {
        //console.log(this.lights)
        const lightPosition = [1, 1, 1];    // Light position HARD CODED WILL CHANGE SOON
        const lightTarget = this.center;     // Light looks at the origin
        const upVector = this.up;        // Up vector for the light's camera
    
        const lightViewMatrix = mat4.lookAt(mat4.create(), lightPosition, lightTarget, upVector);
        const lightProjectionMatrix = mat4.ortho(mat4.create(), -20, 20, -20, 20, 0.1, 50);
        const lightVPMatrix = mat4.multiply(mat4.create(), lightProjectionMatrix, lightViewMatrix);
    
        return lightVPMatrix;
    }

    /**
     * Main render loop which sets up the active viewport (i.e. the area of the canvas we draw to)
     * clears the canvas with a background color and draws the scene
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Number} canvas_width The canvas width. Needed to set the viewport
     * @param {Number} canvas_height The canvas height. Needed to set the viewport
     */
    render( gl, canvas_width, canvas_height )
    {
        // Render shadow map first
        //const lightViewProjectionMatrix = this.calculateLightViewProjectionMatrix(); // Implement this to compute the light matrix
        if (this.scene){
            console.log("render shadowmap")
            const lightViewProjectionMatrix = this.scene.calculateLightViewProjectionMatrix(); 
            this.renderShadowMap(gl, this.shaders.shadowShader, this.scene, lightViewProjectionMatrix);
            //this.shaders.shadowShader.use();

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.shadowMap.depthTexture);

            for (let shader of this.shaders) {
                shader.use();
                shader.setUniform1i('u_shadowMap', 0);
                shader.setUniform4x4f('u_lightVP', lightViewProjectionMatrix);
                shader.unuse();
            }
        }

        //console.log(this.shaders.shadowShader)
        // Set viewport and clear canvas
        this.setViewport( gl, canvas_width, canvas_height )
        this.clearCanvas( gl )

        // Render the box
        // This will use the MVP that was passed to the shader
        this.box.render( gl )

        

        // Render the scene
        if (this.scene) {
            console.log("render scene"); 
            this.scene.render( gl )
        }

        //render fireworks
        this.fireworks.forEach(firework => {
            if (!firework.hasLaunched && (performance.now()/1000 - firework.startTime) >= firework.launchTime&&firework.active) {
                this.launchFirework(firework);
            }
            if(!firework.hasLaunched)
            {
                (new Triangle(gl, this.triangle_shader, [firework.rocketX,firework.rocketY], hex2rgb('#FFBF00'), 44 )).render(gl);
            }
            if (firework.particlesArray && firework.active) {
                const particleData = [];
                firework.particlesArray.forEach(particle => {
                    particle.updateLifeSpan(performance.now()/1000-firework.startTime)
                    if (!particle.isDead()) { 
                        particle.update();
                        particleData.push(particle.x, particle.y);
                    }
                });
                firework.particlesArray = firework.particlesArray.filter(particle => !particle.isDead()); 
                if (particleData.length > 0) {
                    firework.renderFirework();         
                }
            }
        });   

    }

}

export default WebGlApp