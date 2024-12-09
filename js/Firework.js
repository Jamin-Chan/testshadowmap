'use strict'
import Particle from './Particles.js'
import { hex2rgb, deg2rad, loadExternalFile } from './utils/utils.js'

class Firework{
    constructor(launchTime, color, size, hasLaunched, startTime, particlesArray,shader,gl,active, centerX, centerY,rocketX,rocketY)
    {
        this.launchTime = launchTime
        this.color = hex2rgb(color)
        this.size = size
        this.hasLaunched = hasLaunched
        this.startTime = startTime
        this.particlesArray = particlesArray
        this.firework_shader = shader;
        this.fireworksBuffer = gl.createBuffer();
        this.gl = gl;
        this.active = active;
        this.centerX = centerX;
        this.centerY = centerY;
        this.rocketX = rocketX;
        this.rocketY = rocketY;
    }

    launchFirework() {
        this.hasLaunched = true;
        let particles = [];
        for (let i = 0; i < this.numParticlesPerFirework; i++) {
            let particleAngle = Math.random() * Math.PI * 2;
            let particleSpeed = Math.random() * 0.2 + 0.05;
            particles.push(new Particle(0,0,Math.cos(particleAngle) * particleSpeed,Math.sin(particleAngle) * particleSpeed,Math.random() * 1.5 + 0.5,0,-0.01));
        }
        this.particlesArray = particles;
        this.startTime = performance.now() / 1000;
    }

    renderFirework()
    {
        let particleCoordinates = [];
        this.particlesArray.forEach(particle => {
            if (!particle.isDead()) { 
                particleCoordinates.push(particle.x, particle.y);
            }
        });
        if (particleCoordinates.length > 0) {
            this.firework_shader.use();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fireworksBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(particleCoordinates), this.gl.DYNAMIC_DRAW);

            this.gl.enableVertexAttribArray(this.positionLocation);
            this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

            this.firework_shader.setAttribute1f('a_pointSize',this.size)

            this.firework_shader.setUniform3f('u_color',this.color)

            this.gl.drawArrays(this.gl.POINTS, 0, particleCoordinates.length / 2);
            this.firework_shader.unuse();
        }
    }

}

export default Firework;