/**
 * GLB compression utility using @gltf-transform v4.
 *
 * Applies Draco mesh compression + dedup/prune/resample in-place on a saved
 * .glb file. The original file is overwritten with the compressed version.
 *
 * Usage:
 *   const { compressGlb } = require("./glbCompress");
 *   await compressGlb("/var/www/storage/models/file.glb");
 */

const fs   = require("fs/promises");
const path = require("path");

const { NodeIO }                          = require("@gltf-transform/core");
const { draco, resample, dedup, prune }   = require("@gltf-transform/functions");
const draco3d                             = require("draco3d");

// Lazily initialised so the Draco modules are only created once per process.
let _encoderModule = null;
let _decoderModule = null;

async function getDracoModules() {
  if (!_encoderModule) _encoderModule = await draco3d.createEncoderModule({});
  if (!_decoderModule) _decoderModule = await draco3d.createDecoderModule({});
  return { encoder: _encoderModule, decoder: _decoderModule };
}

/**
 * Compress a GLB file in-place using Draco mesh compression.
 *
 * @param {string} filePath  Absolute path to the .glb file on disk.
 * @returns {Promise<{ originalBytes: number, compressedBytes: number }>}
 */
async function compressGlb(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".glb") {
    throw new Error(`compressGlb: expected a .glb file, got "${ext}"`);
  }

  const { encoder, decoder } = await getDracoModules();

  // NodeIO uses dynamic import for extensions — use require for CommonJS compat.
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.encoder": encoder,
      "draco3d.decoder": decoder,
    });

  const originalBytes = (await fs.stat(filePath)).size;

  // Read the file into a glTF Document.
  const document = await io.read(filePath);

  // Apply transforms:
  // 1. dedup   — remove duplicate accessors / textures / materials
  // 2. prune   — remove unused nodes, meshes, materials
  // 3. resample — reduce redundant animation keyframes
  // 4. draco   — Draco mesh compression (biggest size win)
  await document.transform(
    dedup(),
    prune(),
    resample(),
    draco({
      method:           "edgebreaker",
      encodeSpeed:      5,
      decodeSpeed:      5,
      quantizePosition: 14,
      quantizeNormal:   10,
      quantizeTexcoord: 12,
      quantizeColor:    8,
      quantizeGeneric:  12,
    }),
  );

  // Overwrite the original file with the compressed version.
  await io.write(filePath, document);

  const compressedBytes = (await fs.stat(filePath)).size;
  return { originalBytes, compressedBytes };
}

module.exports = { compressGlb };
