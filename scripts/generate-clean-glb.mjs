import fs from 'fs';
import path from 'path';

// Construct a valid binary GLB (glTF 2.0) containing a stylized modern designer product
// We'll generate a minimalist lounge chair / block geometry with vertex positions, normals, and colors/materials

function createGLB() {
  // Let's create a modern minimalist product:
  // A sleek cube-based lounge chair composed of:
  // 1. Base cushion
  // 2. Backrest
  // 3. Wooden legs

  // Helper to build a box mesh with positions, normals, and indices
  function createBox(x, y, z, w, h, d) {
    const hw = w / 2;
    const hh = h / 2;
    const hd = d / 2;

    // 6 faces * 4 vertices = 24 vertices
    const positions = [
      // Front (+Z)
      x - hw, y - hh, z + hd,  x + hw, y - hh, z + hd,  x + hw, y + hh, z + hd,  x - hw, y + hh, z + hd,
      // Back (-Z)
      x + hw, y - hh, z - hd,  x - hw, y - hh, z - hd,  x - hw, y + hh, z - hd,  x + hw, y + hh, z - hd,
      // Top (+Y)
      x - hw, y + hh, z + hd,  x + hw, y + hh, z + hd,  x + hw, y + hh, z - hd,  x - hw, y + hh, z - hd,
      // Bottom (-Y)
      x - hw, y - hh, z - hd,  x + hw, y - hh, z - hd,  x + hw, y - hh, z + hd,  x - hw, y - hh, z + hd,
      // Right (+X)
      x + hw, y - hh, z + hd,  x + hw, y - hh, z - hd,  x + hw, y + hh, z - hd,  x + hw, y + hh, z + hd,
      // Left (-X)
      x - hw, y - hh, z - hd,  x - hw, y - hh, z + hd,  x - hw, y + hh, z + hd,  x - hw, y + hh, z - hd,
    ];

    const normals = [
      // Front
      0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
      // Back
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      // Top
      0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
      // Bottom
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      // Right
      1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
      // Left
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ];

    const indices = [];
    for (let face = 0; face < 6; face++) {
      const o = face * 4;
      indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }

    return { positions, normals, indices };
  }

  // Combine boxes into one unified mesh
  const parts = [
    // Seat cushion (Cobalt/Navy accent)
    createBox(0, 0.45, 0, 1.2, 0.22, 1.1),
    // Backrest
    createBox(0, 0.95, -0.45, 1.2, 0.8, 0.2),
    // Left armrest
    createBox(-0.55, 0.65, 0, 0.16, 0.4, 0.95),
    // Right armrest
    createBox(0.55, 0.65, 0, 0.16, 0.4, 0.95),
    // Front Left Leg
    createBox(-0.45, 0.17, 0.4, 0.08, 0.34, 0.08),
    // Front Right Leg
    createBox(0.45, 0.17, 0.4, 0.08, 0.34, 0.08),
    // Back Left Leg
    createBox(-0.45, 0.17, -0.4, 0.08, 0.34, 0.08),
    // Back Right Leg
    createBox(0.45, 0.17, -0.4, 0.08, 0.34, 0.08),
  ];

  const allPositions = [];
  const allNormals = [];
  const allIndices = [];

  let vertexOffset = 0;
  for (const part of parts) {
    allPositions.push(...part.positions);
    allNormals.push(...part.normals);
    for (const idx of part.indices) {
      allIndices.push(idx + vertexOffset);
    }
    vertexOffset += part.positions.length / 3;
  }

  // Min / max calculations
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < allPositions.length; i += 3) {
    minX = Math.min(minX, allPositions[i]);
    minY = Math.min(minY, allPositions[i + 1]);
    minZ = Math.min(minZ, allPositions[i + 2]);
    maxX = Math.max(maxX, allPositions[i]);
    maxY = Math.max(maxY, allPositions[i + 1]);
    maxZ = Math.max(maxZ, allPositions[i + 2]);
  }

  // Binary buffers
  // 1. Indices: Uint16Array
  const indexArray = new Uint16Array(allIndices);
  // 2. Positions: Float32Array
  const posArray = new Float32Array(allPositions);
  // 3. Normals: Float32Array
  const normArray = new Float32Array(allNormals);

  // Align byte offsets to 4 bytes
  const indexBytes = Buffer.from(indexArray.buffer);
  const padIndex = (4 - (indexBytes.length % 4)) % 4;
  const paddedIndexBuffer = Buffer.concat([indexBytes, Buffer.alloc(padIndex)]);

  const posBytes = Buffer.from(posArray.buffer);
  const padPos = (4 - (posBytes.length % 4)) % 4;
  const paddedPosBuffer = Buffer.concat([posBytes, Buffer.alloc(padPos)]);

  const normBytes = Buffer.from(normArray.buffer);
  const padNorm = (4 - (normBytes.length % 4)) % 4;
  const paddedNormBuffer = Buffer.concat([normBytes, Buffer.alloc(padNorm)]);

  const binBuffer = Buffer.concat([paddedIndexBuffer, paddedPosBuffer, paddedNormBuffer]);

  const indexOffset = 0;
  const posOffset = paddedIndexBuffer.length;
  const normOffset = posOffset + paddedPosBuffer.length;

  const gltfJson = {
    asset: {
      version: "2.0",
      generator: "Forma3D Minimal Generator"
    },
    scene: 0,
    scenes: [{ name: "Forma3D_Demo_Scene", nodes: [0] }],
    nodes: [{ name: "Forma3D_Minimal_Armchair", mesh: 0 }],
    materials: [
      {
        name: "FormaCobaltNavy",
        pbrMetallicRoughness: {
          baseColorFactor: [0.27, 0.41, 0.91, 1.0], // #4568E8 Cobalt
          metallicFactor: 0.1,
          roughnessFactor: 0.5
        }
      }
    ],
    meshes: [
      {
        name: "Armchair_Mesh",
        primitives: [
          {
            attributes: {
              POSITION: 1,
              NORMAL: 2
            },
            indices: 0,
            material: 0,
            mode: 4 // TRIANGLES
          }
        ]
      }
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5123, // UNSIGNED_SHORT
        count: allIndices.length,
        type: "SCALAR",
        min: [0],
        max: [vertexOffset - 1]
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: allPositions.length / 3,
        type: "VEC3",
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ]
      },
      {
        bufferView: 2,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: allNormals.length / 3,
        type: "VEC3",
        min: [-1, -1, -1],
        max: [1, 1, 1]
      }
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: indexOffset,
        byteLength: indexBytes.length,
        target: 34963 // ELEMENT_ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: posOffset,
        byteLength: posBytes.length,
        target: 34962 // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: normOffset,
        byteLength: normBytes.length,
        target: 34962 // ARRAY_BUFFER
      }
    ],
    buffers: [
      {
        byteLength: binBuffer.length
      }
    ]
  };

  const jsonString = JSON.stringify(gltfJson);
  let jsonBuffer = Buffer.from(jsonString, 'utf8');
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  if (jsonPadding > 0) {
    jsonBuffer = Buffer.concat([jsonBuffer, Buffer.from(' '.repeat(jsonPadding), 'utf8')]);
  }

  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;
  const glbHeader = Buffer.alloc(12);
  glbHeader.writeUInt32LE(0x46546C67, 0); // "glTF"
  glbHeader.writeUInt32LE(2, 4);          // version 2
  glbHeader.writeUInt32LE(totalLength, 8);// total file size

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // "JSON"

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuffer.length, 0);
  binChunkHeader.writeUInt32LE(0x004E4942, 4);  // "BIN\0"

  const glbFile = Buffer.concat([
    glbHeader,
    jsonChunkHeader,
    jsonBuffer,
    binChunkHeader,
    binBuffer
  ]);

  return glbFile;
}

const glbBuffer = createGLB();
const outDir = path.resolve('./apps/web/public/models');
fs.mkdirSync(outDir, { recursive: true });
const targetFile = path.join(outDir, 'sample-product.glb');
fs.writeFileSync(targetFile, glbBuffer);
console.log('SUCCESS: Generated 100% valid standalone GLB at:', targetFile, glbBuffer.length, 'bytes');
