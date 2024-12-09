class Particle{
    constructor( x, y, vx, vy, lifespan,ax,ay )
    {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.lifespan = lifespan;
        this.ax = ax;
        this.ay = ay;

    }

    update()
    {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.ay; // Gravity
        this.vx += this.ax;
    }

    updateLifeSpan(updateAmount)
    {
        this.lifespan -= updateAmount;
    }

    isDead() {
        return (this.lifespan < 0);
    }
}

export default Particle;