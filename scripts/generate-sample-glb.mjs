import * as THREE from 'three';

class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.result = null;
  }
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (this.onload) this.onload({ target: this });
    }).catch((err) => {
      if (this.onerror) this.onerror(err);
    });
  }
}

globalThis.FileReader = MockFileReader;

const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
const fs = await import('fs');
const path = await import('path');

const scene = new THREE.Scene();
const group = new THREE.Group();
group.name = 'Forma3D_Sample_Armchair';

const navyMat = new THREE.MeshStandardMaterial({ color: 0x17243A, roughness: 0.6, metalness: 0.1 });
const cobaltMat = new THREE.MeshStandardMaterial({ color: 0x4568E8, roughness: 0.5, metalness: 0.2 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0xA67C52, roughness: 0.6, metalness: 0.0 });

// Seat cushion
const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 1.1), cobaltMat);
seat.position.y = 0.55;
group.add(seat);

// Back cushion
const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.2), navyMat);
back.position.set(0, 1.05, -0.45);
back.rotation.x = 0.1;
group.add(back);

// Left & Right Armrests
const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 1.0), navyMat);
armL.position.set(-0.62, 0.8, 0);
group.add(armL);

const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 1.0), navyMat);
armR.position.set(0.62, 0.8, 0);
group.add(armR);

// Legs
const legGeo = new THREE.CylinderGeometry(0.035, 0.02, 0.5, 16);
const legFL = new THREE.Mesh(legGeo, woodMat);
legFL.position.set(-0.48, 0.25, 0.38);
legFL.rotation.z = 0.08;
legFL.rotation.x = -0.08;
group.add(legFL);

const legFR = new THREE.Mesh(legGeo, woodMat);
legFR.position.set(0.48, 0.25, 0.38);
legFR.rotation.z = -0.08;
legFR.rotation.x = -0.08;
group.add(legFR);

const legBL = new THREE.Mesh(legGeo, woodMat);
legBL.position.set(-0.48, 0.25, -0.38);
legBL.rotation.z = 0.08;
legBL.rotation.x = 0.12;
group.add(legBL);

const legBR = new THREE.Mesh(legGeo, woodMat);
legBR.position.set(0.48, 0.25, -0.38);
legBR.rotation.z = -0.08;
legBR.rotation.x = 0.12;
group.add(legBR);

scene.add(group);

const exporter = new GLTFExporter();
try {
  const gltf = await exporter.parseAsync(scene, { binary: true });
  const outDir = path.resolve('./apps/web/public/models');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'sample-product.glb');
  fs.writeFileSync(outFile, Buffer.from(gltf));
  console.log('SUCCESS: Written sample GLB to', outFile, gltf.byteLength, 'bytes');
} catch (err) {
  console.error('Export error:', err);
}
