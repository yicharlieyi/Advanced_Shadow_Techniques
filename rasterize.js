/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
var defaultEye = vec3.fromValues(0.5,0.5,-0.5); // default eye position in world space
var defaultCenter = vec3.fromValues(0.5,0.5,0.5); // default view direction in world space
var defaultUp = vec3.fromValues(0,1,0); // default view up vector

var lightAmbient = vec3.fromValues(1,1,1); // default light ambient emission
var lightDiffuse = vec3.fromValues(1,1,1); // default light diffuse emission
var lightSpecular = vec3.fromValues(1,1,1); // default light specular emission
var lightPosition = vec3.fromValues(0.5,0.55,-0.5); // default light position
var rotateTheta = Math.PI/50; // how much to rotate models by with each key press


/* input model data */
var gl = null; // the all powerful gl object. It's all here folks!
var shaderProgram;
var inputTriangles = []; // the triangle data as loaded from input files
var numTriangleSets = 0; // how many triangle sets in input scene
var triSetSizes = []; // this contains the size of each triangle set
var inputSpheres = []; // the sphere data as loaded from input files
var numSpheres = 0; // how many spheres in the input scene

var inputRooms = []; // the room data as loaded from input files

/* model data prepared for webgl */
var vertexBuffers = []; // vertex coordinate lists by set, in triples
var normalBuffers = []; // normal component lists by set, in triples
var uvBuffers = []; // uv coord lists by set, in duples
var triangleBuffers = []; // indices into vertexBuffers by set, in triples
var textures = []; // texture imagery by set

/* shader parameter locations */
var vPosAttribLoc; // where to put position for vertex shader
var vNormAttribLoc; // where to put normal for vertex shader
var vUVAttribLoc; // where to put UV for vertex shader
var mMatrixULoc; // where to put model matrix for vertex shader
var pvmMatrixULoc; // where to put project model view matrix for vertex shader
var ambientULoc; // where to put ambient reflecivity for fragment shader
var diffuseULoc; // where to put diffuse reflecivity for fragment shader
var specularULoc; // where to put specular reflecivity for fragment shader
var shininessULoc; // where to put specular exponent for fragment shader
var usingTextureULoc; // where to put using texture boolean for fragment shader
var textureULoc; // where to put texture for fragment shader

var shadowMapULoc = [];
var lightViewMatricesULoc = [];
var lightProjMatricesULoc = [];

/* interaction variables */
var Eye = vec3.clone(defaultEye); // eye position in world space
var Center = vec3.clone(defaultCenter); // view direction in world space
var Up = vec3.clone(defaultUp); // view up vector in world space
var viewDelta = 0; // how much to displace view with each key press

// global variables for shadow maps
var SHADOW_MAP_SIZE = 2048; // Size of each shadow map
var MAX_CASCADES = 4; // Maximum number of cascades support
var currentCascades = 1; // Start with basic shadow map (1 cascade)
var CASCADE_DISTANCES = [5, 15, 50]; // Default distances for 3 cascades
var shadowTechnique = "basic"; // Can be "basic" or "csm"

var shadowMapFramebuffers = []; // Array of FBOs for each cascade
var shadowMapTextures = []; // Array of shadow map textures
var lightViewMatrices = []; // Light view matrices for each cascade
var lightProjMatrices = []; // Light projection matrices for each cascade
var shadowShaderProgram; // Shader program for shadow map generation
var shadowVPosAttribLoc; // Shadow shader position attribute location
var shadowPMatrixULoc; // Shadow shader projection matrix uniform
var shadowVMatrixULoc; // Shadow shader view matrix uniform
var shadowMMatrixULoc; // Shadow shader model matrix uniform
var shadowMapSizeULoc; // Shadow shader shadow map size uniform
var cascadeCountULoc; // shadow shader cascade counts uniform

var usePCF = false; // Default to PCF disabled
var pcfKernelSize = 3; // 1, 3, 5, or 7
var pcfBiasScale = 0.03;
var usePCFULoc; // PCf setting uniform
var pcfKernelSizeULoc; // kernel size uniform
var pcfBiasScaleULoc; // bias scale uniform

var useVSM = false; // Default to VSM disabled
var vsmMinVariance = 0.005;
var varianceShadowMapFramebuffers = [];
var varianceShadowMapTextures = [];

var useVSMULoc; // VSM setting uniform
var vsmMinVarianceULoc; // min variance uniform
var varianceShadowMapULoc = []; // VSM shadow map uniform
var vsmShaderProgram; // Shader program for VSM
var vsmVPosAttribLoc; // VSM shader position attribute location
var vsmPMatrixULoc; // VSM shader projection matrix uniform
var vsmVMatrixULoc; // VSM shader view matrix uniform
var vsmMMatrixULoc; // VSM shader model matrix uniform

// Define the scene set up
const scene = 
[
    {
      "material": {
        "ambient": [0.2, 0.2, 0.2],
        "diffuse": [0.7, 0.7, 0.7],
        "specular": [0.1, 0.1, 0.1],
        "n": 10,
        "alpha": 1.0,
        "texture": false
      },
      "vertices": [
        [-10, 0, -10], [10, 0, -10], [10, 0, 10],
        [-10, 0, -10], [10, 0, 10], [-10, 0, 10]
      ],
      "normals": [
        [0, 1, 0], [0, 1, 0], [0, 1, 0],
        [0, 1, 0], [0, 1, 0], [0, 1, 0]
      ],
      "uvs": [
        [0, 0], [1, 0], [1, 1],
        [0, 0], [1, 1], [0, 1]
      ],
      "triangles": [
        [0, 1, 2],
        [3, 4, 5]
      ]
    },
    // near objects
    {
      "material": {
        "ambient": [0.2, 0.1, 0.1],
        "diffuse": [0.8, 0.4, 0.4],
        "specular": [0.3, 0.3, 0.3],
        "n": 20,
        "alpha": 1.0,
        "texture": false
      },
      "vertices": [
        [1, 0, 1], [2, 0, 1], [2, 2, 1], [1, 2, 1],  // Front face
        [1, 0, 2], [2, 0, 2], [2, 2, 2], [1, 2, 2],  // Back face
        [1, 0, 1], [1, 0, 2], [1, 2, 2], [1, 2, 1],  // Left face
        [2, 0, 1], [2, 0, 2], [2, 2, 2], [2, 2, 1],  // Right face
        [1, 2, 1], [2, 2, 1], [2, 2, 2], [1, 2, 2],  // Top face
        [1, 0, 1], [2, 0, 1], [2, 0, 2], [1, 0, 2]   // Bottom face
      ],
      "normals": [
        [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1],  // Front
        [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1],      // Back
        [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0],  // Left
        [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],      // Right
        [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],      // Top
        [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]   // Bottom
      ],
      "uvs": [
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1]
      ],
      "triangles": [
        [0, 1, 2], [0, 2, 3],    // Front
        [4, 6, 5], [4, 7, 6],     // Back
        [8, 9, 10], [8, 10, 11],  // Left
        [12, 13, 14], [12, 14, 15], // Right
        [16, 17, 18], [16, 18, 19], // Top
        [20, 21, 22], [20, 22, 23]  // Bottom
      ]
    },
    // Medium distance objects
    {
      "material": {
        "ambient": [0.1, 0.2, 0.1],
        "diffuse": [0.4, 0.8, 0.4],
        "specular": [0.3, 0.3, 0.3],
        "n": 30,
        "alpha": 1.0,
        "texture": false
      },
      "vertices": [
        [5, 0, 5], [7, 0, 5], [7, 3, 5], [5, 3, 5],  // Front face
        [5, 0, 7], [7, 0, 7], [7, 3, 7], [5, 3, 7],  // Back face
        [5, 0, 5], [5, 0, 7], [5, 3, 7], [5, 3, 5],  // Left face
        [7, 0, 5], [7, 0, 7], [7, 3, 7], [7, 3, 5],  // Right face
        [5, 3, 5], [7, 3, 5], [7, 3, 7], [5, 3, 7],  // Top face
        [5, 0, 5], [7, 0, 5], [7, 0, 7], [5, 0, 7]   // Bottom face
      ],
      "normals": [
        [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1],
        [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1],
        [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0],
        [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
        [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
        [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]
      ],
      "uvs": [
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1]
      ],
      "triangles": [
        [0, 1, 2], [0, 2, 3],
        [4, 6, 5], [4, 7, 6],
        [8, 9, 10], [8, 10, 11],
        [12, 13, 14], [12, 14, 15],
        [16, 17, 18], [16, 18, 19],
        [20, 21, 22], [20, 22, 23]
      ]
    },
    // Far objects
    {
      "material": {
        "ambient": [0.1, 0.1, 0.2],
        "diffuse": [0.4, 0.4, 0.8],
        "specular": [0.3, 0.3, 0.3],
        "n": 40,
        "alpha": 1.0,
        "texture": false
      },
      "vertices": [
        [-3, 0, 8], [-1, 0, 8], [-1, 4, 8], [-3, 4, 8],  // Front face
        [-3, 0, 10], [-1, 0, 10], [-1, 4, 10], [-3, 4, 10],  // Back face
        [-3, 0, 8], [-3, 0, 10], [-3, 4, 10], [-3, 4, 8],  // Left face
        [-1, 0, 8], [-1, 0, 10], [-1, 4, 10], [-1, 4, 8],  // Right face
        [-3, 4, 8], [-1, 4, 8], [-1, 4, 10], [-3, 4, 10],  // Top face
        [-3, 0, 8], [-1, 0, 8], [-1, 0, 10], [-3, 0, 10]   // Bottom face
      ],
      "normals": [
        [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1],
        [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1],
        [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0],
        [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
        [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
        [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]
      ],
      "uvs": [
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1]
      ],
      "triangles": [
        [0, 1, 2], [0, 2, 3],
        [4, 6, 5], [4, 7, 6],
        [8, 9, 10], [8, 10, 11],
        [12, 13, 14], [12, 14, 15],
        [16, 17, 18], [16, 18, 19],
        [20, 21, 22], [20, 22, 23]
      ]
    },
    {
      "material": {
        "ambient": [0.2, 0.2, 0.0],
        "diffuse": [0.8, 0.8, 0.2],
        "specular": [0.3, 0.3, 0.3],
        "n": 50,
        "alpha": 1.0,
        "texture": false
      },
      "vertices": [
        [-6, 0, 3], [-4, 0, 3], [-4, 5, 3], [-6, 5, 3],  // Front face
        [-6, 0, 5], [-4, 0, 5], [-4, 5, 5], [-6, 5, 5],  // Back face
        [-6, 0, 3], [-6, 0, 5], [-6, 5, 5], [-6, 5, 3],  // Left face
        [-4, 0, 3], [-4, 0, 5], [-4, 5, 5], [-4, 5, 3],  // Right face
        [-6, 5, 3], [-4, 5, 3], [-4, 5, 5], [-6, 5, 5],  // Top face
        [-6, 0, 3], [-4, 0, 3], [-4, 0, 5], [-6, 0, 5]   // Bottom face
      ],
      "normals": [
        [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1],
        [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1],
        [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0],
        [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
        [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
        [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]
      ],
      "uvs": [
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1],
        [0, 0], [1, 0], [1, 1], [0, 1]
      ],
      "triangles": [
        [0, 1, 2], [0, 2, 3],
        [4, 6, 5], [4, 7, 6],
        [8, 9, 10], [8, 10, 11],
        [12, 13, 14], [12, 14, 15],
        [16, 17, 18], [16, 18, 19],
        [20, 21, 22], [20, 22, 23]
      ]
    }
];

const objects = 
[
    // Near spheres
    {
        "x": 1.0, "y": 1.0, "z": 1.0, "r": 0.3,
        "ambient": [0.1, 0.1, 0.1],
        "diffuse": [0.9, 0.2, 0.2],
        "specular": [0.3, 0.3, 0.3],
        "n": 10,
        "alpha": 1.0,
        "texture": "earth.png"
    },
    {
        "x": 2.0, "y": 1.5, "z": 3.0, "r": 0.4,
        "ambient": [0.1, 0.1, 0.1],
        "diffuse": [0.2, 0.8, 0.2],
        "specular": [0.3, 0.3, 0.3],
        "n": 20,
        "alpha": 1.0,
        "texture": "tree.png"
    },
    {
        "x": -1.0, "y": 2.0, "z": 5.0, "r": 0.5,
        "ambient": [0.1, 0.1, 0.1],
        "diffuse": [0.2, 0.2, 0.9],
        "specular": [0.3, 0.3, 0.3],
        "n": 30,
        "alpha": 1.0,
        "texture": "glass.gif"
    },
    {
        "x": -1.0, "y": 2.0, "z": 3.0, "r": 0.5,
        "ambient": [0.1, 0.1, 0.1],
        "diffuse": [0.2, 0.2, 0.9],
        "specular": [0.3, 0.3, 0.3],
        "n": 30,
        "alpha": 1.0,
        "texture": "glass.gif"
    },
    {
        "x": 3.0, "y": 0.5, "z": 8.0, "r": 0.6,
        "ambient": [0.1, 0.1, 0.1],
        "diffuse": [0.2, 0.2, 0.2],
        "specular": [0.2, 0.2, 0.2],
        "n": 40,
        "alpha": 1.0,
        "texture": "rocktile.jpg"
    },
    {
        "x": 3.0, "y": 1.5, "z": 6.0, "r": 0.6,
        "ambient": [0.1, 0.1, 0.1],
        "diffuse": [0.2, 0.2, 0.2],
        "specular": [0.2, 0.2, 0.2],
        "n": 40,
        "alpha": 1.0,
        "texture": "rocktile.jpg"
    },
    {
        "x": -2.0, "y": 1.0, "z": 12.0, "r": 0.8,
        "ambient": [0.1, 0.1, 0.1],
        "diffuse": [0.8, 0.2, 0.8],
        "specular": [0.3, 0.3, 0.3],
        "n": 50,
        "alpha": 1.0,
        "texture": "rocktile.jpg"
    },
    {
        "x": 1.0, "y": 1.0, "z": 3.0, "r": 0.3,
        "ambient": [0.1, 0.1, 0.1],
        "diffuse": [0.7, 0.4, 0.2],
        "specular": [0.3, 0.3, 0.3],
        "n": 10,
        "alpha": 1.0,
        "texture": "earth.png"
    },
    {
        "x": 1.0, "y": 1.0, "z": 4.5, "r": 0.3,
        "ambient": [0.1, 0.1, 0.1],
        "diffuse": [0.2, 0.3, 0.2],
        "specular": [0.3, 0.3, 0.3],
        "n": 10,
        "alpha": 1.0,
        "texture": "earth.png"
    },
    {
        "x": 1.0, "y": 1.0, "z": 6.0, "r": 0.3,
        "ambient": [0.1, 0.1, 0.1],
        "diffuse": [0.9, 0.9, 0.2],
        "specular": [0.3, 0.3, 0.3],
        "n": 10,
        "alpha": 1.0,
        "texture": "earth.png"
    },
    
];

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input spheres


// does stuff when keys are pressed
function handleKeyDown(event) {
    
    const modelEnum = {TRIANGLES: "triangles", SPHERE: "sphere"}; // enumerated model type
    const dirEnum = {NEGATIVE: -1, POSITIVE: 1}; // enumerated rotation direction
    
    function translateModel(offset) {
        if (handleKeyDown.modelOn != null)
            vec3.add(handleKeyDown.modelOn.translation,handleKeyDown.modelOn.translation,offset);
    } // end translate model

    function rotateModel(axis,direction) {
        if (handleKeyDown.modelOn != null) {
            var newRotation = mat4.create();

            mat4.fromRotation(newRotation,direction*rotateTheta,axis); // get a rotation matrix around passed axis
            vec3.transformMat4(handleKeyDown.modelOn.xAxis,handleKeyDown.modelOn.xAxis,newRotation); // rotate model x axis tip
            vec3.transformMat4(handleKeyDown.modelOn.yAxis,handleKeyDown.modelOn.yAxis,newRotation); // rotate model y axis tip
        } // end if there is a highlighted model
    } // end rotate model
    
    // set up needed view params
    var lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
    lookAt = vec3.normalize(lookAt,vec3.subtract(temp,Center,Eye)); // get lookat vector
    viewRight = vec3.normalize(viewRight,vec3.cross(temp,lookAt,Up)); // get view right vector
    
    // highlight static variables
    handleKeyDown.whichOn = handleKeyDown.whichOn == undefined ? -1 : handleKeyDown.whichOn; // nothing selected initially
    handleKeyDown.modelOn = handleKeyDown.modelOn == undefined ? null : handleKeyDown.modelOn; // nothing selected initially

    switch (event.code) {
        case "ArrowRight": // translate view right
            Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,-viewDelta));
            if (!event.getModifierState("Shift"))
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,-viewDelta));
            break;
        case "ArrowLeft": // translate view left
            Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,viewDelta));
            if (!event.getModifierState("Shift"))
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,viewDelta));
            break;
        case "ArrowUp": // translate view upward
            Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,viewDelta));
            Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,viewDelta));
            break;
        case "ArrowDown": // translate view downward
            Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,-viewDelta));
            Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,-viewDelta));
            break;
        // view change
        case "KeyA": // translate view left, rotate left with shift
            Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,viewDelta));
            if (!event.getModifierState("Shift"))
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,viewDelta));
            break;
        case "KeyD": // translate view right, rotate right with shift
            Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,-viewDelta));
            if (!event.getModifierState("Shift"))
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,-viewDelta));
            break;
        case "KeyS": // translate view backward, rotate up with shift
            if (event.getModifierState("Shift")) {
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,viewDelta));
                Up = vec3.cross(Up,viewRight,vec3.subtract(lookAt,Center,Eye)); /* global side effect */
            } else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,-viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,-viewDelta));
            } // end if shift not pressed
            break;
        case "KeyW": // translate view forward, rotate down with shift
            if (event.getModifierState("Shift")) {
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,-viewDelta));
                Up = vec3.cross(Up,viewRight,vec3.subtract(lookAt,Center,Eye)); /* global side effect */
            } else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,viewDelta));
            } // end if shift not pressed
            break;
        case "KeyQ": // translate view up, rotate counterclockwise with shift
            if (event.getModifierState("Shift"))
                Up = vec3.normalize(Up,vec3.add(Up,Up,vec3.scale(temp,viewRight,-viewDelta)));
            else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,Up,viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,viewDelta));
            } // end if shift not pressed
            break;
        case "KeyE": // translate view down, rotate clockwise with shift
            if (event.getModifierState("Shift"))
                Up = vec3.normalize(Up,vec3.add(Up,Up,vec3.scale(temp,viewRight,viewDelta)));
            else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,Up,-viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,-viewDelta));
            } // end if shift not pressed
            break;
    } // end switch
} // end handleKeyDown

// set up the webGL environment
function setupWebGL() {
    
    // Set up keys
    document.onkeydown = handleKeyDown; // call this when key pressed

    // create a webgl canvas and set it up
    var webGLCanvas = document.getElementById("myWebGLCanvas"); // create a webgl canvas
    gl = webGLCanvas.getContext("webgl2"); // get a webgl object from it

    if (!setupWebGLExtensions()) {
        // Fallback to basic shadows if VSM isn't supported
        useVSM = false;
    }
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

function setupWebGLExtensions() {
    // Required for floating point textures
    const floatExtension = gl.getExtension('EXT_color_buffer_float');
    if (!floatExtension) {
        console.error('EXT_color_buffer_float not supported - VSM will not work');
        return false;
    }

    // Recommended for texture filtering
    const floatLinearExtension = gl.getExtension('OES_texture_float_linear');
    if (!floatLinearExtension) {
        console.warn('OES_texture_float_linear not supported - VSM filtering may be limited');
    }

    return true;
}

function setupShadowControls() {
    // CSM controls
    const basicShadowBtn = document.getElementById('basicShadowBtn');
    const csmBtn = document.getElementById('csmBtn');
    const cascadeCountSlider = document.getElementById('cascadeCountSlider');
    const cascadeCountValue = document.getElementById('cascadeCountValue');
    const cascadeSplitSlider = document.getElementById('cascadeSplitSlider');
    const cascadeSplitValue = document.getElementById('cascadeSplitValue');
    const csmControls = document.getElementById('csmControls');
    const shadowMapSizeSlider = document.getElementById('shadowMapSizeSlider');
    const shadowMapSizeValue = document.getElementById('shadowMapSizeValue');

    // Set initial UI state
    basicShadowBtn.classList.add('active');
    csmControls.style.display = 'none';
    cascadeCountSlider.value = 3;
    cascadeCountValue.textContent = '3';
    cascadeSplitSlider.value = '0.5';
    cascadeSplitValue.textContent = '0.5';
    shadowMapSizeValue.textContent = SHADOW_MAP_SIZE;
    shadowMapSizeSlider.value = SHADOW_MAP_SIZE;

    // Basic shadow map button
    basicShadowBtn.addEventListener('click', function() {
        if (shadowTechnique !== "basic") {
            shadowTechnique = "basic";
            basicShadowBtn.classList.add('active');
            csmBtn.classList.remove('active');
            csmControls.style.display = 'none';
            setupShadowMaps(); // Reinitialize with basic shadow map
        }
    });

    // CSM button
    csmBtn.addEventListener('click', function() {
        if (shadowTechnique !== "csm") {
            shadowTechnique = "csm";
            csmBtn.classList.add('active');
            basicShadowBtn.classList.remove('active');
            csmControls.style.display = 'block';
            currentCascades = 3; // Default to 3 cascades
            setupShadowMaps(); // Reinitialize with CSM
        }
    });

    // Cascade count slider
    cascadeCountSlider.addEventListener('input', function() {
        currentCascades = parseInt(this.value);
        cascadeCountValue.textContent = currentCascades;
        if (shadowTechnique === "csm") {
            setupShadowMaps(); // Reinitialize with new cascade count
        }
    });

    // Cascade split ratio slider
    cascadeSplitSlider.addEventListener('input', function() {
        const ratio = parseFloat(this.value);
        cascadeSplitValue.textContent = ratio.toFixed(2);
        updateCascadeDistances(ratio);
        if (shadowTechnique === "csm") {
            setupShadowMaps();
            calculateLightMatrices(); // Recalculate with new distances
        }
    });

    // Shadow Map Size controller
    shadowMapSizeSlider.addEventListener('input', function() {
        const newSize = parseInt(this.value);
        // Round to nearest power of two for better performance
        const powerOfTwoSize = Math.pow(2, Math.round(Math.log2(newSize)));
        
        // Update display and actual size
        shadowMapSizeValue.textContent = powerOfTwoSize;
        SHADOW_MAP_SIZE = powerOfTwoSize;
        
        // Update the slider to snap to power of two values
        this.value = powerOfTwoSize;
    });

    shadowMapSizeSlider.addEventListener('change', function() {
        // Only recreate shadow maps when user stops dragging
        setupShadowMaps();
        renderModels();
    });

    // PCF Controls
    const pcfToggleBtn = document.getElementById('pcfToggleBtn');
    const pcfControls = document.getElementById('pcfControls');
    const pcfKernelSizeSlider = document.getElementById('pcfKernelSizeSlider');
    const pcfBiasSlider = document.getElementById('pcfBiasSlider');
    const pcfKernelSizeValue = document.getElementById('pcfKernelSizeValue');
    const pcfBiasValue = document.getElementById('pcfBiasValue');

    // Initialize PCF button state
    pcfControls.style.display = usePCF ? 'block' : 'none';

    pcfKernelSizeSlider.min = 1;
    pcfKernelSizeSlider.max = 7;
    pcfKernelSizeSlider.step = 2;
    pcfKernelSizeSlider.value = pcfKernelSize;
    pcfKernelSizeValue.textContent = pcfKernelSize;

    // Toggle PCF
    pcfToggleBtn.addEventListener('click', function() {
        usePCF = !usePCF;
        useVSM = false;
        pcfToggleBtn.classList.toggle('active');
        vsmToggleBtn.classList.remove('active');
        
        // Show/hide settings based on PCF state
        pcfControls.style.display = usePCF ? 'block' : 'none';
        vsmControls.style.display = 'none';
        
        calculateLightMatrices(); // Recalculate for PCF
        renderModels();
    });
    
    // Kernel size control
    pcfKernelSizeSlider.addEventListener('input', function() {
        pcfKernelSize = parseInt(this.value);
        pcfKernelSizeValue.textContent = pcfKernelSize;
        renderModels();
    });

    pcfKernelSizeSlider.addEventListener('change', function() {
        renderModels();
    });
    
    // Bias control
    pcfBiasSlider.addEventListener('input', function() {
        pcfBiasScale = parseFloat(this.value);
        pcfBiasValue.textContent = pcfBiasScale.toFixed(3);
        renderModels();
    });

    // VSM Controls
    const vsmToggleBtn = document.getElementById('vsmToggleBtn');
    const vsmControls = document.getElementById('vsmControls');
    const vsmMinVarianceSlider = document.getElementById('vsmMinVarianceSlider');
    const vsmMinVarianceValue = document.getElementById('vsmMinVarianceValue');

    // Hide VSM controls depends on the mode
    vsmControls.style.display = useVSM ? 'block' : 'none';

    vsmToggleBtn.addEventListener('click', function() {
        useVSM = !useVSM;
        usePCF = false;
        vsmToggleBtn.classList.toggle('active');
        pcfToggleBtn.classList.remove('active');
        vsmControls.style.display = useVSM ? 'block' : 'none';
        pcfControls.style.display = 'none';
        calculateLightMatrices(); // Recalculate for VSM
        setupShadowMaps();
        renderModels();
    });

    vsmMinVarianceSlider.addEventListener('input', function() {
        vsmMinVariance = parseFloat(this.value);
        vsmMinVarianceValue.textContent = vsmMinVariance.toFixed(4);
        
        if (shaderProgram) {
            gl.useProgram(shaderProgram);
            gl.uniform1f(gl.getUniformLocation(shaderProgram, "uVSMMinVariance"), vsmMinVariance);
        }
        renderModels();
    });
    
}

function updateCascadeDistances(splitRatio = 0.5) {
    const farPlane = 100; // Your far plane distance
    CASCADE_DISTANCES = [];
    
    for (let i = 1; i <= currentCascades; i++) {
        const ratio = i / currentCascades;
        // Exponential split scheme
        const distance = 0.1 + (farPlane - 0.1) * Math.pow(ratio, splitRatio);
        CASCADE_DISTANCES.push(distance);
    }
}

function setupLightControls() {
    const lightXSlider = document.getElementById('lightXSlider');
    const lightYSlider = document.getElementById('lightYSlider');
    const lightZSlider = document.getElementById('lightZSlider');
    const lightXValue = document.getElementById('lightXValue');
    const lightYValue = document.getElementById('lightYValue');
    const lightZValue = document.getElementById('lightZValue');

    // Set initial values
    lightXValue.textContent = lightPosition[0].toFixed(2);
    lightYValue.textContent = lightPosition[1].toFixed(2);
    lightZValue.textContent = lightPosition[2].toFixed(2);
    lightXSlider.value = lightPosition[0];
    lightYSlider.value = lightPosition[1];
    lightZSlider.value = lightPosition[2];

    // Add event listeners
    lightXSlider.addEventListener('input', function() {
        lightPosition[0] = parseFloat(this.value);
        lightXValue.textContent = lightPosition[0].toFixed(2);
        updateLightPosition();
    });

    lightYSlider.addEventListener('input', function() {
        lightPosition[1] = parseFloat(this.value);
        lightYValue.textContent = lightPosition[1].toFixed(2);
        updateLightPosition();
    });

    lightZSlider.addEventListener('input', function() {
        lightPosition[2] = parseFloat(this.value);
        lightZValue.textContent = lightPosition[2].toFixed(2);
        updateLightPosition();
    });
}

function updateLightPosition() {
    // Update the shader uniform
    if (shaderProgram) {
        gl.useProgram(shaderProgram);
        var lightPositionULoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
        gl.uniform3fv(lightPositionULoc, lightPosition);
    }
    
    // Re-render the scene
    renderModels();
}

function setupShadowMaps() {
    if (useVSM) {
        setupVarianceShadowMaps();
    }
    else {
        setupStandardShadowMaps();
    }
}

function setupVarianceShadowMaps() {
    // Clear existing
    varianceShadowMapFramebuffers = [];
    varianceShadowMapTextures.forEach(tex => gl.deleteTexture(tex));
    varianceShadowMapTextures = [];
    lightViewMatrices = [];
    lightProjMatrices = [];

    // Determine how many cascades to create based on current technique
    var numCascades = shadowTechnique === "csm" ? currentCascades : 1;

    for (let i = 0; i < numCascades; i++) {
        // Create RG32F texture for storing depth and depth squared
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, 
                    SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, 0, 
                    gl.RG, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        // Create FBO
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                            gl.TEXTURE_2D, texture, 0);
        
        // Check framebuffer status
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error("Framebuffer incomplete");
        }
        // We don't need a depth buffer for VSM
        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
        
        varianceShadowMapFramebuffers.push(fbo);
        varianceShadowMapTextures.push(texture);
        lightViewMatrices.push(mat4.create());
        lightProjMatrices.push(mat4.create());
    }
    // Update the shader with the new size
    if (shaderProgram) {
        gl.useProgram(shaderProgram);
        gl.uniform2f(shadowMapSizeULoc, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    }
    // Create VSM shader
    setupVSMShader();
}

function setupStandardShadowMaps() {
    // Clear any existing shadow maps
    shadowMapFramebuffers = [];
    shadowMapTextures = [];
    lightViewMatrices = [];
    lightProjMatrices = [];

    // Determine how many cascades to create based on current technique
    var numCascades = shadowTechnique === "csm" ? currentCascades : 1;

    // Create framebuffers and textures for each cascade
    for (let i = 0; i < numCascades; i++) {
        // Create and configure the shadow map texture
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, 
                    SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, 0, 
                    gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        
        // Create and configure the framebuffer
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                            gl.TEXTURE_2D, texture, 0);
        
        // Check framebuffer status
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error("Framebuffer incomplete");
        }
        
        // Store the created objects
        shadowMapFramebuffers.push(fbo);
        shadowMapTextures.push(texture);
        lightViewMatrices.push(mat4.create());
        lightProjMatrices.push(mat4.create());
    }
    // Update the shader with the new size
    if (shaderProgram) {
        gl.useProgram(shaderProgram);
        gl.uniform2f(shadowMapSizeULoc, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    }
    // Create shadow map shader
    setupShadowShader();
}

function setupShadowShader() {
    // Shadow vertex shader
    var vShaderCode = `
        attribute vec3 aVertexPosition;
        uniform mat4 uMMatrix;
        uniform mat4 uVMatrix;
        uniform mat4 uPMatrix;
        
        void main(void) {
            gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aVertexPosition, 1.0);
        }
    `;
    
    // Shadow fragment shader (empty -- only need depth)
    var fShaderCode = `
        void main(void) {
        }
    `;
    
    // Compile and link shaders
    var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vShaderCode);
    gl.compileShader(vShader);
    
    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fShaderCode);
    gl.compileShader(fShader);
    
    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        console.error('Vertex shader error:', gl.getShaderInfoLog(vShader));
    }
    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        console.error('Fragment shader error:', gl.getShaderInfoLog(fShader));
    }

    shadowShaderProgram = gl.createProgram();
    gl.attachShader(shadowShaderProgram, vShader);
    gl.attachShader(shadowShaderProgram, fShader);
    gl.linkProgram(shadowShaderProgram);

    if (!gl.getProgramParameter(shadowShaderProgram, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(shadowShaderProgram));
    }
    
    // Get attribute and uniform locations
    shadowVPosAttribLoc = gl.getAttribLocation(shadowShaderProgram, "aVertexPosition");
    shadowMMatrixULoc = gl.getUniformLocation(shadowShaderProgram, "uMMatrix");
    shadowVMatrixULoc = gl.getUniformLocation(shadowShaderProgram, "uVMatrix");
    shadowPMatrixULoc = gl.getUniformLocation(shadowShaderProgram, "uPMatrix");
}

function setupVSMShader() {
    const vsmVShader = `#version 300 es
        in vec3 aVertexPosition;
        uniform mat4 uMMatrix;
        uniform mat4 uVMatrix;
        uniform mat4 uPMatrix;
        
        void main() {
            gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aVertexPosition, 1.0);
        }
    `;
    
const vsmFShader = `#version 300 es
        precision highp float;
        out vec4 fragColor;
        
        void main() {
            float depth = gl_FragCoord.z;
            fragColor = vec4(depth, depth*depth, 0.0, 1.0);
        }
    `;
    
    // Compile and link shaders
    var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vsmVShader);
    gl.compileShader(vShader);

    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, vsmFShader);
    gl.compileShader(fShader);
    
    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        console.error('Vertex shader error:', gl.getShaderInfoLog(vShader));
    }
    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        console.error('Fragment shader error:', gl.getShaderInfoLog(fShader));
    }

    vsmShaderProgram = gl.createProgram();
    gl.attachShader(vsmShaderProgram, vShader);
    gl.attachShader(vsmShaderProgram, fShader);
    gl.linkProgram(vsmShaderProgram);
    
    if (!gl.getProgramParameter(vsmShaderProgram, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(vsmShaderProgram));
    }

    // Get attribute and uniform locations
    vsmVPosAttribLoc = gl.getAttribLocation(vsmShaderProgram, "aVertexPosition");
    vsmMMatrixULoc = gl.getUniformLocation(vsmShaderProgram, "uMMatrix");
    vsmVMatrixULoc = gl.getUniformLocation(vsmShaderProgram, "uVMatrix");
    vsmPMatrixULoc = gl.getUniformLocation(vsmShaderProgram, "uPMatrix");

    // Verify uniform locations
    if (!vsmVMatrixULoc || !vsmPMatrixULoc || !vsmMMatrixULoc) {
        console.error("Missing VSM shader uniform locations");
    }
}

function calculateLightMatrices() {
    // Calculate light direction
    const lightDir = vec3.create();
    vec3.normalize(lightDir, vec3.subtract(lightDir, lightPosition, vec3.fromValues(0,0,0)));
    
    // Calculate view matrix for light (looking from light towards origin)
    const lightViewMatrix = mat4.create();
    mat4.lookAt(lightViewMatrix, lightPosition, vec3.fromValues(0,0,0), vec3.fromValues(0,1,0));
    
    // Calculate projection matrices for each cascade
    for (let i = 0; i < currentCascades; i++) {
        const near = i === 0 ? 0.1 : CASCADE_DISTANCES[i-1];
        const far = CASCADE_DISTANCES[i];
        
        mat4.lookAt(vMatrix, Eye, Center, Up);
        // Get camera frustum corners in world space for this cascade
        const frustumCorners = getFrustumCorners(near, far, vMatrix);
        
        // Transform corners to light space
        const lightSpaceCorners = [];
        for (let j = 0; j < 8; j++) {
            const corner = vec4.fromValues(frustumCorners[j][0], frustumCorners[j][1], frustumCorners[j][2], 1);
            vec4.transformMat4(corner, corner, lightViewMatrix);
            lightSpaceCorners.push(corner);
        }
        
        // Calculate bounding box in light space
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        for (let j = 0; j < 8; j++) {
            minX = Math.min(minX, lightSpaceCorners[j][0]);
            maxX = Math.max(maxX, lightSpaceCorners[j][0]);
            minY = Math.min(minY, lightSpaceCorners[j][1]);
            maxY = Math.max(maxY, lightSpaceCorners[j][1]);
            minZ = Math.min(minZ, lightSpaceCorners[j][2]);
            maxZ = Math.max(maxZ, lightSpaceCorners[j][2]);
        }
        
        // Create orthographic projection for this cascade
        const lightProjMatrix = mat4.create();
        mat4.ortho(lightProjMatrix, minX, maxX, minY, maxY, minZ, maxZ);
        
        if (!lightViewMatrices[i]) lightViewMatrices[i] = mat4.create();
        if (!lightProjMatrices[i]) lightProjMatrices[i] = mat4.create();

        // Store matrices
        mat4.copy(lightViewMatrices[i], lightViewMatrix);
        mat4.copy(lightProjMatrices[i], lightProjMatrix);
    }
}

function getFrustumCorners(near, far, viewMatrix) {
    const corners = [];
    const tanFOV = Math.tan(0.5 * Math.PI / 2); // FOV is 0.5*PI in your code
    
    // Near plane
    const nearHeight = near * tanFOV;
    const nearWidth = nearHeight;
    
    // Far plane
    const farHeight = far * tanFOV;
    const farWidth = farHeight;
    
    // Calculate corners in view space
    // Near plane
    corners.push([-nearWidth, -nearHeight, -near]);
    corners.push([nearWidth, -nearHeight, -near]);
    corners.push([nearWidth, nearHeight, -near]);
    corners.push([-nearWidth, nearHeight, -near]);
    
    // Far plane
    corners.push([-farWidth, -farHeight, -far]);
    corners.push([farWidth, -farHeight, -far]);
    corners.push([farWidth, farHeight, -far]);
    corners.push([-farWidth, farHeight, -far]);
    
    // Transform corners to world space
    const invViewMatrix = mat4.create();
    mat4.invert(invViewMatrix, viewMatrix);
    
    for (let i = 0; i < 8; i++) {
        const corner = vec4.fromValues(corners[i][0], corners[i][1], corners[i][2], 1);
        vec4.transformMat4(corner, corner, invViewMatrix);
        corners[i] = [corner[0], corner[1], corner[2]];
    }
    
    return corners;
}

function renderShadowMaps() {
    if (useVSM) {
        renderVarianceShadowMaps();
    } else {
        renderStandardShadowMaps();
    }
}

function renderVarianceShadowMaps() {
    // First completely unbind all shadow map textures from all texture units
    for (let i = 0; i < MAX_CASCADES; i++) {
        gl.activeTexture(gl.TEXTURE5 + i);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    calculateLightMatrices();

    // Special VSM shader program
    gl.useProgram(vsmShaderProgram);
    
    // Render each cascade
    for (let i = 0; i < currentCascades; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, varianceShadowMapFramebuffers[i]);
        gl.viewport(0, 0, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
        gl.clearColor(1.0, 1.0, 0.0, 1.0); // Clear to max depth
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(vsmShaderProgram);

        // Only enable the attribute actually used by the shadow shader
        gl.enableVertexAttribArray(vsmVPosAttribLoc);
        gl.uniformMatrix4fv(vsmVMatrixULoc, false, lightViewMatrices[i]);
        gl.uniformMatrix4fv(vsmPMatrixULoc, false, lightProjMatrices[i]);
        
        // Render all triangles
        for (let whichTriSet = 0; whichTriSet < numTriangleSets; whichTriSet++) {
            const currSet = inputTriangles[whichTriSet];
            let mMatrix = mat4.create();
            makeModelTransform(currSet, mMatrix);
            gl.uniformMatrix4fv(vsmMMatrixULoc, false, mMatrix);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[whichTriSet]);
            gl.vertexAttribPointer(vsmVPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vsmVPosAttribLoc);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichTriSet]);
            gl.drawElements(gl.TRIANGLES, 3 * triSetSizes[whichTriSet], gl.UNSIGNED_SHORT, 0);
        }
        
        // Render all spheres
        const sphere = makeSphere(32); // Reuse your sphere generation function
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[vertexBuffers.length-1]);
        gl.vertexAttribPointer(vsmVPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vsmVPosAttribLoc);
        
        for (let whichSphere = 0; whichSphere < numSpheres; whichSphere++) {
            const sphereData = inputSpheres[whichSphere];
            const mMatrix = mat4.create();
            mat4.fromTranslation(mMatrix, vec3.fromValues(sphereData.x, sphereData.y, sphereData.z));
            mat4.scale(mMatrix, mMatrix, vec3.fromValues(sphereData.r, sphereData.r, sphereData.r));
            
            gl.uniformMatrix4fv(vsmMMatrixULoc, false, mMatrix);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[triangleBuffers.length-1]);
            gl.drawElements(gl.TRIANGLES, sphere.triangles.length, gl.UNSIGNED_SHORT, 0);
        }
    }
    // Switch back to main shader program before binding textures
    gl.useProgram(shaderProgram);

    // Bind VSM textures for main rendering
    for (let i = 0; i < currentCascades; i++) {
        gl.activeTexture(gl.TEXTURE5 + i);
        gl.bindTexture(gl.TEXTURE_2D, varianceShadowMapTextures[i]);
        gl.uniform1i(varianceShadowMapULoc[i], 5 + i);
    }
    
    // Restore default framebuffer and viewport
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function renderStandardShadowMaps() {
    // First completely unbind all shadow map textures from all texture units
    for (let i = 0; i < MAX_CASCADES; i++) {
        gl.activeTexture(gl.TEXTURE1 + i);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    calculateLightMatrices();
    gl.useProgram(shadowShaderProgram);
    
    // Render each cascade
    for (let i = 0; i < currentCascades; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowMapFramebuffers[i]);
        gl.viewport(0, 0, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(shadowShaderProgram);

        // Only enable the attribute actually used by the shadow shader
        gl.disableVertexAttribArray(vNormAttribLoc);
        gl.disableVertexAttribArray(vUVAttribLoc);
        gl.enableVertexAttribArray(shadowVPosAttribLoc);
        gl.uniformMatrix4fv(shadowVMatrixULoc, false, lightViewMatrices[i]);
        gl.uniformMatrix4fv(shadowPMatrixULoc, false, lightProjMatrices[i]);
        
        // Render all triangles
        for (let whichTriSet = 0; whichTriSet < numTriangleSets; whichTriSet++) {
            const currSet = inputTriangles[whichTriSet];
            let mMatrix = mat4.create();
            makeModelTransform(currSet, mMatrix);
            gl.uniformMatrix4fv(shadowMMatrixULoc, false, mMatrix);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[whichTriSet]);
            gl.vertexAttribPointer(shadowVPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(shadowVPosAttribLoc);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichTriSet]);
            gl.drawElements(gl.TRIANGLES, 3 * triSetSizes[whichTriSet], gl.UNSIGNED_SHORT, 0);
        }
        
        // Render all spheres
        const sphere = makeSphere(32); // Reuse your sphere generation function
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[vertexBuffers.length-1]);
        gl.vertexAttribPointer(shadowVPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shadowVPosAttribLoc);
        
        for (let whichSphere = 0; whichSphere < numSpheres; whichSphere++) {
            const sphereData = inputSpheres[whichSphere];
            const mMatrix = mat4.create();
            mat4.fromTranslation(mMatrix, vec3.fromValues(sphereData.x, sphereData.y, sphereData.z));
            mat4.scale(mMatrix, mMatrix, vec3.fromValues(sphereData.r, sphereData.r, sphereData.r));
            
            gl.uniformMatrix4fv(shadowMMatrixULoc, false, mMatrix);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[triangleBuffers.length-1]);
            gl.drawElements(gl.TRIANGLES, sphere.triangles.length, gl.UNSIGNED_SHORT, 0);
        }
    }
    // After all shadow maps are rendered, rebind them for the main render pass
    for (let i = 0; i < currentCascades; i++) {
        gl.activeTexture(gl.TEXTURE1 + i);
        gl.bindTexture(gl.TEXTURE_2D, shadowMapTextures[i]);
    }
    
    // Restore default framebuffer and viewport
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

// Function to extract frustum planes
function extractFrustumPlanes(pMatrix, vMatrix) {
    var pvMatrix = mat4.create();
    mat4.multiply(pvMatrix, pMatrix, vMatrix); // Combine projection and view matrices

    const planes = [];
    // Extract planes from the view-projection matrix
    for (let i = 0; i < 6; i++) {
        const plane = vec4.create();
        const row = Math.floor(i / 2);
        const sign = i % 2 === 0 ? 1 : -1;

        // Construct the plane equation from the matrix
        for (let j = 0; j < 4; j++) {
            plane[j] = pvMatrix[3 + j * 4] + sign * pvMatrix[row + j * 4];
        }

        // Normalize the plane
        const length = Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);
        plane[0] /= length;
        plane[1] /= length;
        plane[2] /= length;
        plane[3] /= length;

        planes.push(plane);
    }
    return planes;
}

// Function to determine if a given trianfle is within the viewing frustum
function isTriangleInFrustum(vertices, planes) {
     // Iterate through each plane to check if the triangle intersects it
    for (let i = 0; i < planes.length; i++) {
        var plane = planes[i];
        let inside = false;

        // Check each vertex of the triangle
        for (let j = 0; j < 3; j++) {
            const vertex = vertices[j];
            const distance = plane[0] * vertex[0] + plane[1] * vertex[1] + plane[2] * vertex[2] + plane[3];

             // If the vertex is in front of the plane, the triangle is inside the frustum
            if (distance >= 0) {
                inside = true;
                break;
            }
        }
        // If all vertices are outside any plane, the triangle is outside the frustum
        if (!inside) {
            return false;
        }
    }
    return true;
}

// make a sphere with radius 1 at the origin, with numLongSteps longitudes. 
// Returns verts, tris and normals.
function makeSphere(numLongSteps) {
    
    try {
        if (numLongSteps % 2 != 0)
            throw "in makeSphere: uneven number of longitude steps!";
        else if (numLongSteps < 4)
            throw "in makeSphere: number of longitude steps too small!";
        else { // good number longitude steps
        
            // make vertices, normals and uvs -- repeat longitude seam
            const INVPI = 1/Math.PI, TWOPI = Math.PI+Math.PI, INV2PI = 1/TWOPI, epsilon=0.001*Math.PI;
            var sphereVertices = [0,-1,0]; // vertices to return, init to south pole
            var sphereUvs = [0.5,0]; // uvs to return, bottom texture row collapsed to one texel
            var angleIncr = TWOPI / numLongSteps; // angular increment 
            var latLimitAngle = angleIncr * (Math.floor(numLongSteps*0.25)-1); // start/end lat angle
            var latRadius, latY, latV; // radius, Y and texture V at current latitude
            for (var latAngle=-latLimitAngle; latAngle<=latLimitAngle+epsilon; latAngle+=angleIncr) {
                latRadius = Math.cos(latAngle); // radius of current latitude
                latY = Math.sin(latAngle); // height at current latitude
                latV = latAngle*INVPI + 0.5; // texture v = (latAngle + 0.5*PI) / PI
                for (var longAngle=0; longAngle<=TWOPI+epsilon; longAngle+=angleIncr) { // for each long
                    sphereVertices.push(-latRadius*Math.sin(longAngle),latY,latRadius*Math.cos(longAngle));
                    sphereUvs.push(longAngle*INV2PI,latV); // texture u = (longAngle/2PI)
                } // end for each longitude
            } // end for each latitude
            sphereVertices.push(0,1,0); // add north pole
            sphereUvs.push(0.5,1); // top texture row collapsed to one texel
            var sphereNormals = sphereVertices.slice(); // for this sphere, vertices = normals; return these

            // make triangles, first poles then middle latitudes
            var sphereTriangles = []; // triangles to return
            var numVertices = Math.floor(sphereVertices.length/3); // number of vertices in sphere
            for (var whichLong=1; whichLong<=numLongSteps; whichLong++) { // poles
                sphereTriangles.push(0,whichLong,whichLong+1);
                sphereTriangles.push(numVertices-1,numVertices-whichLong-1,numVertices-whichLong-2);
            } // end for each long
            var llVertex; // lower left vertex in the current quad
            for (var whichLat=0; whichLat<(numLongSteps/2 - 2); whichLat++) { // middle lats
                for (var whichLong=0; whichLong<numLongSteps; whichLong++) {
                    llVertex = whichLat*(numLongSteps+1) + whichLong + 1;
                    sphereTriangles.push(llVertex,llVertex+numLongSteps+1,llVertex+numLongSteps+2);
                    sphereTriangles.push(llVertex,llVertex+numLongSteps+2,llVertex+1);
                } // end for each longitude
            } // end for each latitude
        } // end if good number longitude steps
        return({vertices:sphereVertices, normals:sphereNormals, uvs:sphereUvs, triangles:sphereTriangles});
    } // end try
    
    catch(e) {
        console.log(e);
    } // end catch
} // end make sphere

// read models in, load them into webgl buffers
function loadModels() {
    
    // load a texture for the current set or sphere
    function loadTexture(whichModel,currModel,textureFile) {
        
        // load a 1x1 gray image into texture for use when no texture, and until texture loads
        textures[whichModel] = gl.createTexture(); // new texture struct for model
        var currTexture = textures[whichModel]; // shorthand
        gl.bindTexture(gl.TEXTURE_2D, currTexture); // activate model's texture
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // invert vertical texcoord v, load gray 1x1
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,new Uint8Array([64, 64, 64, 255]));        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // invert vertical texcoord v
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // use linear filter for magnification
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); // use mipmap for minification
        gl.generateMipmap(gl.TEXTURE_2D); // construct mipmap pyramid
        gl.bindTexture(gl.TEXTURE_2D, null); // deactivate model's texture
        
        // if there is a texture to load, asynchronously load it
        if (textureFile != false) {
            currTexture.image = new Image(); // new image struct for texture
            currTexture.image.onload = function () { // when texture image loaded...
                gl.bindTexture(gl.TEXTURE_2D, currTexture); // activate model's new texture
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, currTexture.image); // norm 2D texture
                gl.generateMipmap(gl.TEXTURE_2D); // rebuild mipmap pyramid
                gl.bindTexture(gl.TEXTURE_2D, null); // deactivate model's new texture
            } // end when texture image loaded
            currTexture.image.onerror = function () { // when texture image load fails...
                console.log("Unable to load texture " + textureFile); 
            } // end when texture image load fails
            currTexture.image.crossOrigin = "Anonymous"; // allow cross origin load, please
            currTexture.image.src = "textures/"+ textureFile; // set image location

        } // end if material has a texture
    } // end load texture
    
    // read in the triangle data
    inputTriangles = scene;

    try {
        if (inputTriangles == String.null)
            throw "Unable to load triangles file!";
        else {
            var currSet; // the current triangle set
            var whichSetVert; // index of vertex in current triangle set
            var whichSetTri; // index of triangle in current triangle set
            var vtxToAdd; // vtx coords to add to the vertices array
            var normToAdd; // vtx normal to add to the normal array
            var uvToAdd; // uv coords to add to the uv arry
            var triToAdd; // tri indices to add to the index array
            var maxCorner = vec3.fromValues(Number.MIN_VALUE,Number.MIN_VALUE,Number.MIN_VALUE); // bbox corner
            var minCorner = vec3.fromValues(Number.MAX_VALUE,Number.MAX_VALUE,Number.MAX_VALUE); // other corner
        
            // process each triangle set to load webgl vertex and triangle buffers
            numTriangleSets = inputTriangles.length; // remember how many tri sets
            for (var whichSet=0; whichSet<numTriangleSets; whichSet++) { // for each tri set
                currSet = inputTriangles[whichSet];
                
                // set up hilighting, modeling translation and rotation
                currSet.center = vec3.fromValues(0,0,0);  // center point of tri set
                currSet.on = false; // not highlighted
                currSet.translation = vec3.fromValues(0,0,0); // no translation
                currSet.xAxis = vec3.fromValues(1,0,0); // model X axis
                currSet.yAxis = vec3.fromValues(0,1,0); // model Y axis 

                // set up the vertex, normal and uv arrays, define model center and axes
                currSet.glVertices = []; // flat coord list for webgl
                currSet.glNormals = []; // flat normal list for webgl
                currSet.glUvs = []; // flat texture coord list for webgl
                var numVerts = currSet.vertices.length; // num vertices in tri set
                for (whichSetVert=0; whichSetVert<numVerts; whichSetVert++) { // verts in set
                    vtxToAdd = currSet.vertices[whichSetVert]; // get vertex to add
                    normToAdd = currSet.normals[whichSetVert]; // get normal to add
                    uvToAdd = currSet.uvs[whichSetVert]; // get uv to add
                    currSet.glVertices.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]); // put coords in set vertex list
                    currSet.glNormals.push(normToAdd[0],normToAdd[1],normToAdd[2]); // put normal in set normal list
                    currSet.glUvs.push(uvToAdd[0],uvToAdd[1]); // put uv in set uv list
                    vec3.max(maxCorner,maxCorner,vtxToAdd); // update world bounding box corner maxima
                    vec3.min(minCorner,minCorner,vtxToAdd); // update world bounding box corner minima
                    vec3.add(currSet.center,currSet.center,vtxToAdd); // add to ctr sum
                } // end for vertices in set
                vec3.scale(currSet.center,currSet.center,1/numVerts); // avg ctr sum

                // send the vertex coords, normals and uvs to webGL; load texture
                vertexBuffers[whichSet] = gl.createBuffer(); // init empty webgl set vertex coord buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(currSet.glVertices),gl.STATIC_DRAW); // data in
                normalBuffers[whichSet] = gl.createBuffer(); // init empty webgl set normal component buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(currSet.glNormals),gl.STATIC_DRAW); // data in
                uvBuffers[whichSet] = gl.createBuffer(); // init empty webgl set uv coord buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,uvBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(currSet.glUvs),gl.STATIC_DRAW); // data in
                loadTexture(whichSet,currSet,currSet.material.texture); // load tri set's texture
                // set up the triangle index array, adjusting indices across sets
                currSet.glTriangles = []; // flat index list for webgl
                triSetSizes[whichSet] = currSet.triangles.length; // number of tris in this set
                for (whichSetTri=0; whichSetTri<triSetSizes[whichSet]; whichSetTri++) {
                    triToAdd = currSet.triangles[whichSetTri]; // get tri to add
                    currSet.glTriangles.push(triToAdd[0],triToAdd[1],triToAdd[2]); // put indices in set list
                } // end for triangles in set

                // send the triangle indices to webGL
                triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(currSet.glTriangles),gl.STATIC_DRAW); // data in

            } // end for each triangle set 
            
            // read in the sphere data
            inputSpheres = objects;
            if (inputSpheres == String.null)
                throw "Unable to load spheres file!";
            else {
                
                // init sphere highlighting, translation and rotation; update bbox
                var sphere; // current sphere
                var temp = vec3.create(); // an intermediate vec3
                var minXYZ = vec3.create(), maxXYZ = vec3.create();  // min/max xyz from sphere
                numSpheres = inputSpheres.length; // remember how many spheres
                for (var whichSphere=0; whichSphere<numSpheres; whichSphere++) {
                    sphere = inputSpheres[whichSphere];
                    sphere.on = false; // spheres begin without highlight
                    sphere.translation = vec3.fromValues(0,0,0); // spheres begin without translation
                    sphere.xAxis = vec3.fromValues(1,0,0); // sphere X axis
                    sphere.yAxis = vec3.fromValues(0,1,0); // sphere Y axis 
                    sphere.center = vec3.fromValues(0,0,0); // sphere instance is at origin
                    vec3.set(minXYZ,sphere.x-sphere.r,sphere.y-sphere.r,sphere.z-sphere.r); 
                    vec3.set(maxXYZ,sphere.x+sphere.r,sphere.y+sphere.r,sphere.z+sphere.r); 
                    vec3.min(minCorner,minCorner,minXYZ); // update world bbox min corner
                    vec3.max(maxCorner,maxCorner,maxXYZ); // update world bbox max corner
                    loadTexture(numTriangleSets+whichSphere,sphere,sphere.texture); // load the sphere's texture

                }
                viewDelta = vec3.length(vec3.subtract(temp,maxCorner,minCorner)) / 100; // set global

                // make one sphere instance that will be reused, with 32 longitude steps
                var oneSphere = makeSphere(32);

                // send the sphere vertex coords and normals to webGL
                vertexBuffers.push(gl.createBuffer()); // init empty webgl sphere vertex coord buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[vertexBuffers.length-1]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(oneSphere.vertices),gl.STATIC_DRAW); // data in
                normalBuffers.push(gl.createBuffer()); // init empty webgl sphere vertex normal buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[normalBuffers.length-1]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(oneSphere.normals),gl.STATIC_DRAW); // data in
                uvBuffers.push(gl.createBuffer()); // init empty webgl sphere vertex uv buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,uvBuffers[uvBuffers.length-1]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(oneSphere.uvs),gl.STATIC_DRAW); // data in
        
                triSetSizes.push(oneSphere.triangles.length);

                // send the triangle indices to webGL
                triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[triangleBuffers.length-1]); // activate that buffer
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(oneSphere.triangles),gl.STATIC_DRAW); // data in
            } // end if sphere file loaded
        } // end if triangle file loaded
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end load models

// setup the webGL shaders
function setupShaders() {
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `#version 300 es
        in vec3 aVertexPosition; // vertex position
        in vec3 aVertexNormal; // vertex normal
        in vec2 aVertexUV; // vertex texture uv
        
        uniform mat4 umMatrix; // the model matrix
        uniform mat4 upvmMatrix; // the project view model matrix
        
        out vec3 vWorldPos; // interpolated world position of vertex
        out vec3 vVertexNormal; // interpolated normal for frag shader
        out vec2 vVertexUV; // interpolated uv for frag shader

        void main(void) {
            
            // vertex position
            vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);

            // vertex normal
            vec4 vWorldNormal4 = umMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z)); 
            
            // vertex uv
            vVertexUV = aVertexUV;
        }
    `;
    
    // define fragment shader
    var fShaderCode = `#version 300 es
        // Set a maximum number of cascades
        #define MAX_CASCADES 4 

        precision highp float; // set float to medium precision
        precision highp sampler2DShadow;

        // eye location
        uniform vec3 uEyePosition; // the eye's position in world
        
        // light properties
        uniform vec3 uLightAmbient; // the light's ambient color
        uniform vec3 uLightDiffuse; // the light's diffuse color
        uniform vec3 uLightSpecular; // the light's specular color
        uniform vec3 uLightPosition; // the light's position
        
        // material properties
        uniform vec3 uAmbient; // the ambient reflectivity
        uniform vec3 uDiffuse; // the diffuse reflectivity
        uniform vec3 uSpecular; // the specular reflectivity
        uniform float uShininess; // the specular exponent
        
        // texture properties
        uniform bool uUsingTexture; // if we are using a texture
        uniform sampler2D uTexture; // the texture for the fragment
        
        // shadow map properties
        uniform sampler2DShadow uShadowMaps[MAX_CASCADES];
        uniform mat4 uLightViewMatrices[MAX_CASCADES];
        uniform mat4 uLightProjMatrices[MAX_CASCADES];
        uniform float uCascadeDistances[MAX_CASCADES];
        uniform vec2 uShadowMapSize;
        uniform int uCascadeCount; // actual number of cascades in use (1-4)
 
        // geometry properties
        in vec2 vVertexUV; // texture uv of fragment   
        in vec3 vWorldPos; // world xyz of fragment
        in vec3 vVertexNormal; // normal of fragment

        out vec4 fragColor;

        // PCF properties
        uniform bool uUsePCF; // uniform for PCf setting
        uniform int uPCFKernelSize; // uniform for PCF kernel size
        uniform float uPCFBiasScale; // uniform for PCF bias scale

        // VSM properties
        uniform bool uUseVSM; // uniform for VSM setting
        uniform float uVSMMinVariance; // minimum variance to prevent light bleeding
        uniform sampler2D uVarianceShadowMaps[MAX_CASCADES]; // VSM uses regular sampler2D

        // Shadow calculation
        float calculateShadow(vec3 worldPos, vec3 lightDir) {
            if (uCascadeCount == 0) return 0.0; // No shadows if disabled

            // Determine which cascade to use
            float viewDepth = length(worldPos - uEyePosition);
            int cascade = 0;
            
            for (int i = 0; i < MAX_CASCADES-1; i++) {
                if (i < uCascadeCount-1 && viewDepth > uCascadeDistances[i]) {
                    cascade = i+1;
                }
            }
            
            // Ensure not to exceed the actual number of cascades in use
            cascade = min(cascade, uCascadeCount-1);

            // Transform to light space
            vec4 lightSpacePos;
            if (cascade == 0) {
                lightSpacePos = uLightProjMatrices[0] * uLightViewMatrices[0] * vec4(worldPos, 1.0);
            } else if (cascade == 1) {
                lightSpacePos = uLightProjMatrices[1] * uLightViewMatrices[1] * vec4(worldPos, 1.0);
            } else if (cascade == 2) {
                lightSpacePos = uLightProjMatrices[2] * uLightViewMatrices[2] * vec4(worldPos, 1.0);
            } else if (cascade == 3) {
                lightSpacePos = uLightProjMatrices[3] * uLightViewMatrices[3] * vec4(worldPos, 1.0);
            }
            lightSpacePos.xyz = lightSpacePos.xyz / lightSpacePos.w;
            lightSpacePos.xyz = lightSpacePos.xyz * 0.5 + 0.5;
            
            // Add bias to reduce shadow acne
            float bias = max(uPCFBiasScale * (1.0 - dot(vVertexNormal, lightDir)), 0.005);
        
            float shadow = 0.0;
            // PCF for smoother shadows
            if (uUsePCF) {
                vec2 texelSize = vec2(1.0) / uShadowMapSize;
                int kernelHalf = uPCFKernelSize / 2;
                int samples = 0;

                for(int x = -kernelHalf; x <= kernelHalf; ++x) {
                    for(int y = -kernelHalf; y <= kernelHalf; ++y) {
                        vec2 offset = vec2(x, y) * texelSize;
                        // Pass depth as third component for shadow comparison
                        vec3 sampleCoord = vec3(lightSpacePos.xy + offset, lightSpacePos.z - bias);

                        // Sample shadow map
                        if (cascade == 0) {
                            shadow += 1.0 - texture(uShadowMaps[0], sampleCoord);
                        } else if (cascade == 1) {
                            shadow += 1.0 - texture(uShadowMaps[1], sampleCoord);
                        } else if (cascade == 2) {
                            shadow += 1.0 - texture(uShadowMaps[2], sampleCoord);
                        } else {
                            shadow += 1.0 - texture(uShadowMaps[3], sampleCoord);
                        }
                        samples++;
                    }
                }
                shadow /= float(samples);
            } else if (uUseVSM) {
                vec2 moments;
                // Sample moments
                if (cascade == 0) {
                    moments = texture(uVarianceShadowMaps[0], lightSpacePos.xy).rg;
                } else if (cascade == 1) {
                    moments = texture(uVarianceShadowMaps[1], lightSpacePos.xy).rg;
                } else if (cascade == 2) {
                    moments = texture(uVarianceShadowMaps[2], lightSpacePos.xy).rg;
                } else {
                    moments = texture(uVarianceShadowMaps[3], lightSpacePos.xy).rg;
                }
                    
                // Surface depth in light space
                float depth = lightSpacePos.z;

                // Variance shadow mapping calculation using Chebyshev's inequality
                float p = depth <= moments.x ? 1.0 : 0.0;
                float variance = moments.y - (moments.x * moments.x);
                variance = max(variance, uVSMMinVariance);
                
                float d = depth - moments.x;
                float p_max = variance / (variance + d*d);

                shadow = 1.0 - clamp(max(p, p_max), 0.0, 1.0);
            } else {
                // Simple shadow lookup without PCF
                vec3 sampleCoord = vec3(lightSpacePos.xy, lightSpacePos.z - bias);

                // Sample shadow map
                if (cascade == 0) {
                    shadow = 1.0 - texture(uShadowMaps[0], sampleCoord);
                }
                else if (cascade == 1) {
                    shadow = 1.0 - texture(uShadowMaps[1], sampleCoord);
                }
                else if (cascade == 2) {
                    shadow = 1.0 - texture(uShadowMaps[2], sampleCoord);
                }
                else {
                    shadow = 1.0 - texture(uShadowMaps[3], sampleCoord);
                }
            }
            return shadow;
        }

        void main(void) {
            // ambient term
            vec3 ambient = uAmbient*uLightAmbient; 
            
            // diffuse term
            vec3 normal = normalize(vVertexNormal); 
            vec3 light = normalize(uLightPosition - vWorldPos);
            float lambert = max(0.0,dot(normal,light));
            vec3 diffuse = uDiffuse*uLightDiffuse*lambert; // diffuse term
            
            // specular term
            vec3 eye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(light+eye);
            float highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
            vec3 specular = uSpecular*uLightSpecular*highlight; // specular term
            
            // shadow 
            vec3 lightDir = normalize(uLightPosition - vWorldPos);
            float shadow = calculateShadow(vWorldPos, lightDir);

            // combine to find lit color with shadow
            vec3 litColor = ambient + (1.0 - shadow) * (diffuse + specular);
            
            if (!uUsingTexture) {
                fragColor = vec4(litColor, 1.0);
            } else {
                vec4 texColor = texture(uTexture, vVertexUV);
                fragColor = vec4(texColor.rgb * litColor, 1.0);
            } // end if using texture
        } // end main
    `;
    
    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                
                // locate and enable vertex attributes
                vPosAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition"); // ptr to vertex pos attrib
                gl.enableVertexAttribArray(vPosAttribLoc); // connect attrib to array
                vNormAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexNormal"); // ptr to vertex normal attrib
                gl.enableVertexAttribArray(vNormAttribLoc); // connect attrib to array
                vUVAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexUV"); // ptr to vertex UV attrib
                gl.enableVertexAttribArray(vUVAttribLoc); // connect attrib to array
                
                // locate vertex uniforms
                mMatrixULoc = gl.getUniformLocation(shaderProgram, "umMatrix"); // ptr to mmat
                pvmMatrixULoc = gl.getUniformLocation(shaderProgram, "upvmMatrix"); // ptr to pvmmat
                
                // locate fragment uniforms
                var eyePositionULoc = gl.getUniformLocation(shaderProgram, "uEyePosition"); // ptr to eye position
                var lightAmbientULoc = gl.getUniformLocation(shaderProgram, "uLightAmbient"); // ptr to light ambient
                var lightDiffuseULoc = gl.getUniformLocation(shaderProgram, "uLightDiffuse"); // ptr to light diffuse
                var lightSpecularULoc = gl.getUniformLocation(shaderProgram, "uLightSpecular"); // ptr to light specular
                var lightPositionULoc = gl.getUniformLocation(shaderProgram, "uLightPosition"); // ptr to light position
                ambientULoc = gl.getUniformLocation(shaderProgram, "uAmbient"); // ptr to ambient
                diffuseULoc = gl.getUniformLocation(shaderProgram, "uDiffuse"); // ptr to diffuse
                specularULoc = gl.getUniformLocation(shaderProgram, "uSpecular"); // ptr to specular
                shininessULoc = gl.getUniformLocation(shaderProgram, "uShininess"); // ptr to shininess
                usingTextureULoc = gl.getUniformLocation(shaderProgram, "uUsingTexture"); // ptr to using texture
                textureULoc = gl.getUniformLocation(shaderProgram, "uTexture"); // ptr to texture
                // PCf uniforms
                usePCFULoc = gl.getUniformLocation(shaderProgram, "uUsePCF"); // use PCF 
                pcfKernelSizeULoc = gl.getUniformLocation(shaderProgram, "uPCFKernelSize");
                pcfBiasScaleULoc = gl.getUniformLocation(shaderProgram, "uPCFBiasScale");

                // VSM uniforms
                useVSMULoc = gl.getUniformLocation(shaderProgram, "uUseVSM"); // use VSM 
                vsmMinVarianceULoc = gl.getUniformLocation(shaderProgram, "uVSMMinVariance");

                // locate shadow map uniforms
                var cascadeDistancesULoc = gl.getUniformLocation(shaderProgram, "uCascadeDistances");
                
                for (let i = 0; i < MAX_CASCADES; i++) {
                    gl.activeTexture(gl.TEXTURE1 + i);
                    if (i < currentCascades) {
                        gl.bindTexture(gl.TEXTURE_2D, shadowMapTextures[i]);
                    } else {
                        // Bind a dummy shadow map texture or the first shadow map
                        gl.bindTexture(gl.TEXTURE_2D, shadowMapTextures[0]);
                    }
                    gl.uniform1i(shadowMapULoc[i], 1 + i);
                    shadowMapULoc.push(gl.getUniformLocation(shaderProgram, `uShadowMaps[${i}]`));
                    lightViewMatricesULoc.push(gl.getUniformLocation(shaderProgram, `uLightViewMatrices[${i}]`));
                    lightProjMatricesULoc.push(gl.getUniformLocation(shaderProgram, `uLightProjMatrices[${i}]`));
                }
                
                // Initialize VSM texture
                for (let i = 0; i < MAX_CASCADES; i++) {
                    gl.activeTexture(gl.TEXTURE5 + i);
                    const loc = gl.getUniformLocation(shaderProgram, `uVarianceShadowMaps[${i}]`);
                    varianceShadowMapULoc.push(loc);
                    gl.uniform1i(loc, 5 + i); // Use higher texture units
                }

                gl.uniform1fv(cascadeDistancesULoc, new Float32Array(CASCADE_DISTANCES));
                shadowMapSizeULoc = gl.getUniformLocation(shaderProgram, "uShadowMapSize");
                cascadeCountULoc = gl.getUniformLocation(shaderProgram, "uCascadeCount");
                gl.uniform1i(cascadeCountULoc, shadowTechnique === "csm" ? currentCascades : 1);
                gl.uniform2f(shadowMapSizeULoc, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
                
                // pass global (not per model) constants into fragment uniforms
                gl.uniform3fv(eyePositionULoc,Eye); // pass in the eye's position
                gl.uniform3fv(lightAmbientULoc,lightAmbient); // pass in the light's ambient emission
                gl.uniform3fv(lightDiffuseULoc,lightDiffuse); // pass in the light's diffuse emission
                gl.uniform3fv(lightSpecularULoc,lightSpecular); // pass in the light's specular emission
                gl.uniform3fv(lightPositionULoc,lightPosition); // pass in the light's position

                // Pass the PCF setting to the shader
                gl.uniform1i(usePCFULoc, usePCF);
                gl.uniform1i(pcfKernelSizeULoc, pcfKernelSize);
                gl.uniform1f(pcfBiasScaleULoc, pcfBiasScale);

                // Pass the VSM to the shader
                gl.uniform1i(useVSMULoc, useVSM);
                gl.uniform1f(vsmMinVarianceULoc, vsmMinVariance);
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

var pMatrix = mat4.create(); // projection matrix
var vMatrix = mat4.create(); // view matrix

// construct the model transform matrix, based on model state
function makeModelTransform(currModel, mMatrix) {
    var zAxis = vec3.create(), sumRotation = mat4.create(), temp = mat4.create(), negCenter = vec3.create();

    vec3.normalize(zAxis,vec3.cross(zAxis,currModel.xAxis,currModel.yAxis)); // get the new model z axis
    mat4.set(sumRotation, // get the composite rotation
        currModel.xAxis[0], currModel.yAxis[0], zAxis[0], 0,
        currModel.xAxis[1], currModel.yAxis[1], zAxis[1], 0,
        currModel.xAxis[2], currModel.yAxis[2], zAxis[2], 0,
        0, 0,  0, 1);
    vec3.negate(negCenter,currModel.center);
    mat4.multiply(sumRotation,sumRotation,mat4.fromTranslation(temp,negCenter)); // rotate * -translate
    mat4.multiply(sumRotation,mat4.fromTranslation(temp,currModel.center),sumRotation); // translate * rotate * -translate
    mat4.fromTranslation(mMatrix,currModel.translation); // translate in model matrix
    mat4.multiply(mMatrix,mMatrix,sumRotation); // rotate in model matrix
} // end make model transform

// render the loaded model
function renderModels() {
    // First render all shadow maps
    renderShadowMaps();
    
    gl.useProgram(shaderProgram);
    
    var hMatrix = mat4.create(); // handedness matrix
    var mMatrix = mat4.create(); // model matrix
    var hpvMatrix = mat4.create(); // hand * proj * view matrices
    var hpvmMatrix = mat4.create(); // hand * proj * view * model matrices
    const HIGHLIGHTMATERIAL = 
        {ambient:[0.5,0.5,0], diffuse:[0.5,0.5,0], specular:[0,0,0], n:1, alpha:1, texture:false}; // hlht mat
    
    window.requestAnimationFrame(renderModels); // set up frame render callback
    
    gl.clear(/*gl.COLOR_BUFFER_BIT |*/ gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    
    // Pass the current cascade count to the shader
    gl.uniform1i(cascadeCountULoc, shadowTechnique === "csm" ? currentCascades : 1);
    // Pass the PCF setting to the shader
    gl.uniform1i(usePCFULoc, usePCF);
    gl.uniform1i(pcfKernelSizeULoc, pcfKernelSize);
    gl.uniform1f(pcfBiasScaleULoc, pcfBiasScale);

    // Pass the VSM setting to the shader
    gl.uniform1i(useVSMULoc, useVSM);
    gl.uniform1f(vsmMinVarianceULoc, vsmMinVariance);

    var numActiveCascades = shadowTechnique === "csm" ? currentCascades : 1;

    for (let i = 0; i < MAX_CASCADES; i++) {
        gl.activeTexture(gl.TEXTURE1 + i);
        if (i < numActiveCascades) {
            gl.bindTexture(gl.TEXTURE_2D, shadowMapTextures[i]);
        } else {
            // Bind a valid dummy depth texture or reuse the first shadow map
            gl.bindTexture(gl.TEXTURE_2D, shadowMapTextures[0]);
        }
        gl.uniform1i(shadowMapULoc[i], 1 + i);
        // Only update matrices for active cascades
        if (i < numActiveCascades) {
            gl.uniformMatrix4fv(lightViewMatricesULoc[i], false, lightViewMatrices[i]);
            gl.uniformMatrix4fv(lightProjMatricesULoc[i], false, lightProjMatrices[i]);
        }
    }
    // When rendering with VSM
    if (useVSM) {
        for (let i = 0; i < currentCascades; i++) { 
            gl.activeTexture(gl.TEXTURE5 + i);
            gl.bindTexture(gl.TEXTURE_2D, varianceShadowMapTextures[i]);
            gl.uniform1i(varianceShadowMapULoc[i], 5 + i);
        }
    }
    // set up handedness, projection and view
    mat4.fromScaling(hMatrix,vec3.fromValues(-1,1,1)); // create handedness matrix
    mat4.perspective(pMatrix,0.5*Math.PI,1,0.1,100); // create projection matrix
    mat4.lookAt(vMatrix,Eye,Center,Up); // create view matrix
    mat4.multiply(hpvMatrix,hMatrix,pMatrix); // handedness * projection
    mat4.multiply(hpvMatrix,hpvMatrix,vMatrix); // handedness * projection * view

    // render each triangle set
    var currSet, setMaterial; // the tri set and its material properties
    for (var whichTriSet=0; whichTriSet<numTriangleSets; whichTriSet++) {
        currSet = inputTriangles[whichTriSet];
        
        // make model transform, add to view project
        makeModelTransform(currSet, mMatrix);
        mat4.multiply(hpvmMatrix,hpvMatrix,mMatrix); // handedness * project * view * model
        gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix); // pass in the m matrix
        gl.uniformMatrix4fv(pvmMatrixULoc, false, hpvmMatrix); // pass in the hpvm matrix
        
        // reflectivity: feed to the fragment shader
        if (inputTriangles[whichTriSet].on)
            setMaterial = HIGHLIGHTMATERIAL; // highlight material
        else
            setMaterial = currSet.material; // normal material
        gl.uniform3fv(ambientULoc,setMaterial.ambient); // pass in the ambient reflectivity
        gl.uniform3fv(diffuseULoc,setMaterial.diffuse); // pass in the diffuse reflectivity
        gl.uniform3fv(specularULoc,setMaterial.specular); // pass in the specular reflectivity
        gl.uniform1f(shininessULoc,setMaterial.n); // pass in the specular exponent
        gl.uniform1i(usingTextureULoc,(currSet.material.texture != false)); // whether the set uses texture
        gl.activeTexture(gl.TEXTURE0); // bind to active texture 0 (the first)
        gl.bindTexture(gl.TEXTURE_2D, textures[whichTriSet]); // bind the set's texture
        gl.uniform1i(textureULoc, 0); // pass in the texture and active texture 0
        
        // position, normal and uv buffers: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichTriSet]); // activate position
        gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0); // feed
        gl.enableVertexAttribArray(vPosAttribLoc);

        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichTriSet]); // activate normal
        gl.vertexAttribPointer(vNormAttribLoc,3,gl.FLOAT,false,0,0); // feed
        gl.enableVertexAttribArray(vNormAttribLoc);

        gl.bindBuffer(gl.ARRAY_BUFFER,uvBuffers[whichTriSet]); // activate uv
        gl.vertexAttribPointer(vUVAttribLoc,2,gl.FLOAT,false,0,0); // feed
        gl.enableVertexAttribArray(vUVAttribLoc);

        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichTriSet]); // activate
        gl.drawElements(gl.TRIANGLES,3*triSetSizes[whichTriSet],gl.UNSIGNED_SHORT,0); // render
    } // end for each triangle set
    
    // render each sphere
    var sphere, currentMaterial, instanceTransform = mat4.create(); // the current sphere and material
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[vertexBuffers.length-1]); // activate vertex buffer
    gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0); // feed vertex buffer to shader
    gl.enableVertexAttribArray(vPosAttribLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[normalBuffers.length-1]); // activate normal buffer
    gl.vertexAttribPointer(vNormAttribLoc,3,gl.FLOAT,false,0,0); // feed normal buffer to shader
    gl.enableVertexAttribArray(vNormAttribLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER,uvBuffers[uvBuffers.length-1]); // activate uv
    gl.vertexAttribPointer(vUVAttribLoc,2,gl.FLOAT,false,0,0); // feed
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[triangleBuffers.length-1]); // activate tri buffer
    gl.enableVertexAttribArray(vUVAttribLoc);

    for (var whichSphere=0; whichSphere<numSpheres; whichSphere++) {
        sphere = inputSpheres[whichSphere];
        
        // define model transform, premult with pvmMatrix, feed to shader
        makeModelTransform(sphere, mMatrix);
        mat4.fromTranslation(instanceTransform,vec3.fromValues(sphere.x,sphere.y,sphere.z)); // recenter sphere
        mat4.scale(mMatrix,mMatrix,vec3.fromValues(sphere.r,sphere.r,sphere.r)); // change size
        mat4.multiply(mMatrix,instanceTransform,mMatrix); // apply recenter sphere
        hpvmMatrix = mat4.multiply(hpvmMatrix,hpvMatrix,mMatrix); // premultiply with hpv matrix
        gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix); // pass in model matrix
        gl.uniformMatrix4fv(pvmMatrixULoc, false, hpvmMatrix); // pass in handed project view model matrix

        // reflectivity: feed to the fragment shader
        if (sphere.on)
            currentMaterial = HIGHLIGHTMATERIAL;
        else
            currentMaterial = sphere;
        gl.uniform3fv(ambientULoc,currentMaterial.ambient); // pass in the ambient reflectivity
        gl.uniform3fv(diffuseULoc,currentMaterial.diffuse); // pass in the diffuse reflectivity
        gl.uniform3fv(specularULoc,currentMaterial.specular); // pass in the specular reflectivity
        gl.uniform1f(shininessULoc,currentMaterial.n); // pass in the specular exponent
        gl.uniform1i(usingTextureULoc,(sphere.texture != false)); // whether the sphere uses texture
        gl.activeTexture(gl.TEXTURE0); // bind to active texture 0 (the first)
        gl.bindTexture(gl.TEXTURE_2D, textures[numTriangleSets+whichSphere]); // bind the set's texture
        gl.uniform1i(textureULoc, 0); // pass in the texture and active texture 0

        // draw a transformed instance of the sphere
        gl.drawElements(gl.TRIANGLES,triSetSizes[triSetSizes.length-1],gl.UNSIGNED_SHORT,0); // render
    } // end for each sphere
} // end render model


const frameTimes = [];
const numFramesToAverage = 10;

var fps;
var avgFrameTime;
// Measure frame time
function measureFrameTime() {
    var startTime = performance.now();

    // 1. Render shadow maps first (update shadow textures)
    renderShadowMaps();

    // 2. Render the scene using the updated shadow maps
    renderModels();
    
    var endTime = performance.now();
    var frameTime = endTime - startTime;

    // Store frame time
    frameTimes.push(frameTime);
    if (frameTimes.length > numFramesToAverage) {
        frameTimes.shift();
    }
    // Calculate average frame time
    avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
    // Convert frame time to FPS
    fps = 10 / avgFrameTime;
    return fps;
}

// Update HUD
function updateHUD(fps) {
    document.getElementById('fps').textContent = fps.toFixed(2);
    document.getElementById('frameTime').textContent = "     /     "+ avgFrameTime.toFixed(2) + "ms";
}

// Main render loop
function render() {
    fps = measureFrameTime();
    requestAnimationFrame(render);
}

/* MAIN -- HERE is where execution begins after window load */
function main() {
    setupWebGL(); // set up the webGL environment
    setupShadowControls(); // set up the UI control for shadow techniques
    setupLightControls(); // set up the UI control for light position
    setupShadowMaps(); // set up the shadow maps
    loadModels(); // load in the models from tri file
    setupShaders(); // setup the webGL shaders
    render();
    // Update HUD every second
    setInterval(() => {
        const fps = measureFrameTime(); // Recalculate FPS for the HUD
        updateHUD(fps);
    }, 1000); // 1000ms = 1 second  
    
} // end main