
import { hex2rgb, deg2rad } from '../utils/utils.js'

/**
 * @Class
 * Base class for all drawable shapes
 * 
 */
class Shape
{
    /**
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     * @param {Array<Float>} vertices List of vertex positions
     * @param {Array<Int>} indices List of vertex indices
     * @param {Array<Float>} color Color as a three-element vector
     * @param {WebGL2RenderingContext.GL_TRIANGLES | WebGL2RenderingContext.GL_POINTS} draw_mode The draw mode to use. In this assignment we use GL_TRIANGLES and GL_POINTS
     * @param {Number} num_elements The number of elements that make up one primitive in the given draw mode
     */
    constructor( gl, shader, vertices, indices, color, draw_mode, num_elements )
    {
        this.shader = shader

        this.vertices = vertices
        this.vertices_buffer = null
        this.createVBO( gl )

        this.indices = indices
        this.index_buffer = null
        this.createIBO( gl )

        this.color = color

        this.draw_mode = draw_mode

        this.num_components = 2
        this.num_elements = num_elements

        this.vertex_array_object = null
        this.createVAO( gl, shader )
    }

    /**
     * Sets up a vertex attribute object that is used during rendering to automatically tell WebGL how to access our buffers
     * @param { WebGL2RenderingContext } gl The webgl2 rendering context
     */
    createVAO( gl, shader )
    {
        //throw '"Shape.createVAO" not implemented'
        this.vertex_array_object = gl.createVertexArray();
        gl.bindVertexArray(this.vertex_array_object);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices_buffer);
        gl.enableVertexAttribArray(shader.a_position);
        gl.vertexAttribPointer(shader.a_position, 3, gl.FLOAT, false, 0, 0);//unsure if this is necessary
        gl.bindVertexArray(null);
        //alert('doneCVAO')
        // TODO: Create a vertex attribute object (VAO) and store it in 'this.vertex_array_object'
        // TODO: Bind the VBO and link it to the shader attribute 'a_position'
        // TODO: Set the correct vertex attrib pointer settings for your VBO, so that the vertex data is mapped correctly to 'a_position'
        // TODO: Unbind buffers and clean up
    }

    /**
     * Creates vertex buffer object for vertex data
     * @param { WebGL2RenderingContext } gl The webgl2 rendering context
     */
    createVBO( gl )
    {
       // throw '"Shape.createVBO" not implemented'
       this.vertices_buffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices_buffer);
       gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.vertices),gl.STATIC_DRAW);
       gl.bindBuffer(gl.ARRAY_BUFFER, null);
        // TODO: Create a vertex buffer (VBO) and store it in 'this.vertices_buffer'
        // TODO: Fill the buffer with data in 'this.vertices'
        // TODO: Pay attention to the data type of the buffer and refer to the book
    }

    /**
     * Creates index buffer object for vertex data
     * @param { WebGL2RenderingContext } gl The webgl2 rendering context
     */
    createIBO( gl )
    {
        this.index_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(this.indices),gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
     //   throw '"Shape.createIBO" not implemented'

        // TODO: Create an index buffer object (IBO) and store it in 'this.index_buffer'
        // TODO: Fill the buffer with data in 'this.indices' 
        // TODO: Pay attention to the datatype of the buffer and refer to the book
    }

    /**
     * Render call for an individual shape.
     * 
     * In this function, you set both the vertex and index buffers active
     * After that you want to set the color uniform "u_color" in the shader, so that it knows which color to use
     * "u_color" is a vec3 i.e. a list of 3 floats
     * Finally, you draw the geometry
     * Don't forget to unbind the buffers after that
     * 
     * @param { WebGL2RenderingContext } gl The webgl2 rendering context
     */
    render( gl )
    {
        this.shader.use()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices_buffer);
        gl.bindVertexArray(this.vertex_array_object);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
        this.shader.setUniform3f( "u_color", this.color);
        this.shader.setUniform2f( "u_resolution", new Float32Array([ document.getElementById( "canvas" ).width, document.getElementById( "canvas" ).height ]) )
        gl.drawElements(this.draw_mode, this.indices.length, gl.UNSIGNED_SHORT, 0); //minefinal
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
        this.shader.unuse()
    }

}

/**
 * @Class
 * Triangle extension for Shape. Creates vertex list and indices and calls the super constructor.
 */
class Triangle extends Shape
{

    constructor( gl, shader, position, color, sideLength) //needs to be centered around position
    {
        // You will need those angles to define your triangle vertices
        let cosangle = Math.cos(deg2rad(30)) //60
        let sinangle = Math.sin(deg2rad(30))

        // TODO: Create a list of vertices defining the triangle
        let vertices = [
            position[0]+sideLength/2, position[1]+sinangle*sideLength/(2*cosangle),0,
            position[0],position[1]-sideLength/(2*cosangle),0,
            position[0]-sideLength/2, position[1]+sinangle*sideLength/(2*cosangle),0,
            position[0]+sideLength/2, position[1]+sinangle*sideLength/(2*cosangle)+2*sideLength,0,
            position[0]-sideLength/2, position[1]+sinangle*sideLength/(2*cosangle)+2*sideLength,0
        ]

        let indices = [
            0,1,2,3,2,0,2,0,4
        ]

        // TODO: Check out the 'Shape' class and understand what the constructor does
        super( gl, shader, vertices, indices, color, gl.TRIANGLES, indices.length )
    }

}

/**
 * @Class
 * WebGlApp that will call basic GL functions, manage a list of shapes, and take care of rendering them
 * 
 * This class will use the Shapes that you have implemented to store and render them
 */



// JS Module Export -- No need to modify this
export
{
    Triangle
}