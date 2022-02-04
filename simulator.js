"use strict";

// WebGL variables
let gl;
let program;

// Arrays to be passed to GPU for the scene
let vertices = [];
let normals = [];

// Initial ranges of the patch
var x_range = vec2(-20, 20);
var z_range = vec2(-15, 15);

// Variables to change viewing mode and shading mode
// Three modes for View mode - Points, Wireframes and faces.
// Four modes for shading - Without shading, flat, smooth, phong.
var viewMode = 2;
var shadingMode = 3;

// Shader lists to maintain different
var vertShadersList = [
	"vertex-shader-normal",
	"vertex-shader-flat",
	"vertex-shader-smooth",
	"vertex-shader-phong",
];
var fragShadersList = [
	"fragment-shader-normal",
	"fragment-shader-flat",
	"fragment-shader-smooth",
	"fragment-shader-phong",
];

// Parameters for defining the viewing volume
var left = -1;
var right = 1;
var topVal = 1;
var bottom = -1;
var near = 2.0;
var far = 100.0;

// Variables to store matrices and their locations in the shaders.
var modelViewMatrix, projectionMatrix, normalMat;
var modelViewMatrixLoc, projectionMatrixLoc, eye_zUniformLoc, normalMatrixLoc;

// Rotation variables initial values
let rollAngle = 0;
let yawAngle = 0;
let pitchAngle = 0;
let angleDelta = 2;

// Rotation matrix variables for each of the three rotations
let rollMatrix, yawMatrix, pitchMatrix;

// Camera parameters for the lookAt function
var eye = vec3(0.0, 5.0, 10.0);
var at = vec3(0.0, 5.0, -10.0);
var up = vec3(0.0, 1.0, 0.0);

// Initial speed of the plane
let speed = 0.1;

// Variables to handle direction of the plane. Initially towards negative z (into the screen)
let dir = vec3(0.0, 0.0, -1);
let newdir;

// Variables for sending vertices and normals array to GPU.
let vPosition;
let vNormal;

// Variables to store sizes of the current patch
var x_size = Math.abs(x_range[1] - x_range[0]) / 2;
var z_size = Math.abs(z_range[1] - z_range[0]) / 2;

// Function to generate a patch of terrain within the x_range and z_range given
function get_patch(x_range, z_range) {
	var xmin = x_range[0];
	var xmax = x_range[1];
	var zmin = z_range[0];
	var zmax = z_range[1];
	var scl = 0.1;

	noise.seed(15);
	let points = [];

	if (viewMode == 0) {
		// Generate points
		for (let z = zmin; z < zmax; z += scl) {
			for (let x = xmin; x < xmax; x += scl) {
				points.push(vec3(x, 0, z));

				points.push(vec3(x, 0, z + scl));

				points.push(vec3(x + scl, 0, z));
			}
		}
	} else if (viewMode == 1) {
		// Generate wireframes
		for (let z = zmin; z < zmax; z += scl) {
			for (let x = xmin; x < xmax; x += scl) {
				points.push(vec3(x, 0, z));
				points.push(vec3(x, 0, z + scl));

				points.push(vec3(x, 0, z + scl));
				points.push(vec3(x + scl, 0, z));

				points.push(vec3(x + scl, 0, z));
				points.push(vec3(x, 0, z));
			}
		}
	} else if (viewMode == 2) {
		// Generate faces
		for (let z = zmin; z < zmax; z += scl) {
			for (let x = xmin; x < xmax; x += scl) {
				points.push(vec3(x, 0, z));
				points.push(vec3(x, 0, z + scl));
				points.push(vec3(x + scl, 0, z));

				points.push(vec3(x, 0, z + scl));
				points.push(vec3(x + scl, 0, z + scl));
				points.push(vec3(x + scl, 0, z));
			}
		}
	}

	// Generating y co-ordinate using perlin function
	for (var k = 0; k < points.length; k++) {
		points[k][1] = 2 * noise.perlin2(points[k][0], points[k][2]);
	}

	return points;
}

// Function to calculate and update normals of the vertices currently rendered
function updateNormals(vertices) {
	for (let i = 0; i < vertices.length; i++) {
		normals[i] = normalize(noise.normal(vertices[i][0], vertices[i][2]));
	}
}

// Function to set up shaders when the shading mode is changes
function setUpShader() {
	program = initShaders(gl, vertShadersList[shadingMode], fragShadersList[shadingMode]);
	gl.useProgram(program);

	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

	// Associate out shader variables with our data buffer
	vPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	if (shadingMode != 0) {
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
		vNormal = gl.getAttribLocation(program, "vNormal");
		gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vNormal);
	}

	modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
	projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
	normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

	eye_zUniformLoc = gl.getUniformLocation(program, "eye_z");
}

// Function to detect all key presses and perform actions accordingly
function KeyDown(e) {
	switch (e.key) {
		case "1":
			left--;
			break;
		case "2":
			right--;
			break;
		case "3":
			topVal--;
			break;
		case "4":
			bottom--;
			break;
		case "5":
			near--;
			break;
		case "6":
			far--;
			break;
		case "!":
			left++;
			break;
		case "@":
			right++;
			break;
		case "#":
			topVal++;
			break;
		case "$":
			bottom++;
			break;
		case "%":
			near++;
			break;
		case "^":
			far++;
			break;
		case "V":
		case "v":
			// Change view mode
			viewMode += 1;
			viewMode = viewMode % 3;
			vertices = get_patch(x_range, z_range);
			updateVertices();
			break;
		case "C":
		case "c":
			// Change shading mode
			shadingMode += 1;
			shadingMode = shadingMode % 4;
			setUpShader();

			break;
		case "Q":
		case "q":
			if (rollAngle - angleDelta >= -90) {
				rollAngle -= angleDelta;
			}
			break;
		case "E":
		case "e":
			if (rollAngle + angleDelta <= 90) {
				rollAngle += angleDelta;
			}
			break;
		case "A":
		case "a":
			// Moving left and changing direction of plane
			if (yawAngle - angleDelta >= -90) {
				yawAngle -= angleDelta;
				eye = vec4(eye[0], eye[1], eye[2], 1.0);
				at = vec4(at[0], at[1], at[2], 1.0);
				dir = subtract(at, eye);
				at = vec3(at[0], at[1], at[2]);
				eye = vec3(eye[0], eye[1], eye[2]);
				let newdir = mult(rotateY(yawAngle), dir);
				dir = vec3(newdir[0], newdir[1], newdir[2]);
				dir = normalize(dir);
				dir[0] = -dir[0];
			}
			break;
		case "D":
		case "d":
			// Moving right and changing direction of plane
			if (yawAngle + angleDelta <= 90) {
				yawAngle += angleDelta;
				eye = vec4(eye[0], eye[1], eye[2], 1.0);
				at = vec4(at[0], at[1], at[2], 1.0);
				dir = subtract(at, eye);
				at = vec3(at[0], at[1], at[2]);
				eye = vec3(eye[0], eye[1], eye[2]);
				let newdir = mult(rotateY(yawAngle), dir);
				dir = vec3(newdir[0], newdir[1], newdir[2]);
				dir = normalize(dir);
				dir[0] = -dir[0];
			}
			break;
		case "W":
		case "w":
			// Changing the pitch angle
			if (pitchAngle - angleDelta >= -45) {
				pitchAngle -= angleDelta;
				eye = vec4(eye[0], eye[1], eye[2], 1.0);
				at = vec4(at[0], at[1], at[2], 1.0);
				dir = subtract(at, eye);
				at = vec3(at[0], at[1], at[2]);
				eye = vec3(eye[0], eye[1], eye[2]);
				let newdir = mult(rotateX(pitchAngle), dir);
				dir = vec3(newdir[0], newdir[1], newdir[2]);
				dir = normalize(dir);
				dir[1] = -dir[1];
			}
			break;
		case "S":
		case "s":
			// Changing the pitch angle
			if (pitchAngle + angleDelta <= 45) {
				pitchAngle += angleDelta;
				eye = vec4(eye[0], eye[1], eye[2], 1.0);
				at = vec4(at[0], at[1], at[2], 1.0);
				dir = subtract(at, eye);
				at = vec3(at[0], at[1], at[2]);
				eye = vec3(eye[0], eye[1], eye[2]);
				let newdir = mult(rotateX(pitchAngle), dir);
				dir = vec3(newdir[0], newdir[1], newdir[2]);
				dir = normalize(dir);
				dir[1] = -dir[1];
			}
			break;
		case "t":
		case "T":
			// Increasing speed of the plane
			speed += 0.005;
			break;
		case "y":
		case "Y":
			// Decreasing speed of the plane
			speed -= 0.005;
			if (speed < 0) {
				speed = 0;
			}
			break;
		case "Escape":
			let canvas = document.getElementById("canvas_div");
			canvas.remove();
	}

	updateValues();
	projectionMatrix = frustum(left, right, bottom, topVal, near, far);
}

// Function to update values on the screen for the viewing volume parameters
function updateValues() {
	document.getElementById("left-value").innerHTML = `Left = ${left}`;
	document.getElementById("right-value").innerHTML = `Right = ${right}`;
	document.getElementById("top-value").innerHTML = `Top = ${topVal}`;
	document.getElementById("bottom-value").innerHTML = `Bottom = ${bottom}`;
	document.getElementById("near-value").innerHTML = `Near = ${near}`;
	document.getElementById("far-value").innerHTML = `Far = ${far}`;
	document.getElementById("speed-value").innerHTML = `Speed = ${speed}`;
}

window.onload = function init() {
	updateValues();
	document.addEventListener("keydown", KeyDown);

	let canvas = document.getElementById("gl-canvas");
	gl = canvas.getContext("webgl2");
	if (!gl) alert("WebGL 2.0 isn't available");

	//  Configure WebGL
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(135 / 255, 206 / 255, 235 / 255, 1.0);

	//  Load shaders and initialize attribute buffers
	program = initShaders(gl, vertShadersList[shadingMode], fragShadersList[shadingMode]);
	gl.useProgram(program);
	gl.enable(gl.DEPTH_TEST);

	// Compute data.
	updateValues();

	vertices = get_patch(x_range, z_range);
	updateNormals(vertices);

	// Load the data into the GPU and bind to shader variables.
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

	// Associate out shader variables with our data buffer
	vPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	if (shadingMode != 0) {
		// Load the data into the GPU and bind to shader variables.
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

		// Associate out shader variables with our data buffer
		vNormal = gl.getAttribLocation(program, "vNormal");
		gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vNormal);
	}

	// Getting locations of the variables in the shaders
	modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
	projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
	normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

	eye_zUniformLoc = gl.getUniformLocation(program, "eye_z");

	render();
};

// Function to update vertices along with its new normals
function updateVertices() {
	vPosition = gl.getAttribLocation(program, "vPosition");
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
	gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	updateNormals(vertices);

	if (shadingMode != 0) {
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
		vNormal = gl.getAttribLocation(program, "vNormal");
		gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vNormal);
	}
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Apply changes to the eye and at of the camera
	newdir = mult(speed, dir);
	eye = add(eye, newdir);
	at = add(at, newdir);

	// Clamping the y co-ordinat of eye to remain within the altitude change
	if (eye[1] < 3) {
		eye[1] = 3;
	} else if (eye[1] > 6) {
		eye[1] = 6;
	}

	// Conditions to generate patches accordingly when plane is about to end the route on current terrain
	if (eye[2].toFixed(2) < (z_range[0] + z_range[1]) / 2) {
		z_range = vec2(z_range[0] - z_size, z_range[1] - z_size);
		vertices = get_patch(x_range, z_range);
		updateVertices();
	}

	// Similar conditions as above for x directions in both directions
	if (eye[0].toFixed(2) < (x_range[0] + x_range[1]) / 2 - x_size / 2) {
		x_range = vec2(x_range[0] - x_size, x_range[1] - x_size);
		vertices = get_patch(x_range, z_range);
		updateVertices();
	} else if (eye[0].toFixed(2) > (x_range[0] + x_range[1]) / 2 + x_size / 2) {
		x_range = vec2(x_range[0] + x_size, x_range[1] + x_size);
		vertices = get_patch(x_range, z_range);
		updateVertices();
	}

	// Rotation matrices set up
	rollMatrix = rotateZ(rollAngle);
	yawMatrix = rotateY(yawAngle);
	pitchMatrix = rotateX(pitchAngle);

	// Matrices to be used in the GPU (shaders) have been defined
	modelViewMatrix = mult(rollMatrix, mult(yawMatrix, mult(pitchMatrix, lookAt(eye, at, up))));
	projectionMatrix = frustum(left, right, bottom, topVal, near, far);
	normalMat = normalMatrix(modelViewMatrix);

	// Values set at the given locations in the shaders
	gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
	gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMat));
	gl.uniform1f(eye_zUniformLoc, eye[2]);

	// Different draw mode used according to the view mode chosen
	if (viewMode == 0) {
		gl.drawArrays(gl.POINTS, 0, vertices.length);
	} else if (viewMode == 1) {
		gl.drawArrays(gl.LINES, 0, vertices.length);
	} else if (viewMode == 2) {
		gl.drawArrays(gl.TRIANGLES, 0, vertices.length);
	}

	requestAnimationFrame(render);
}
