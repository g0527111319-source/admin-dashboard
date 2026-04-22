// Ambient type declarations for 3D-conversion dependencies that ship
// without .d.ts files. We only declare the narrow slice we actually
// call — better to fail loudly when we use something new than to
// paper over it with `any` everywhere.

declare module "draco3dgltf" {
  // The WASM modules expose a grab-bag of encoder/decoder methods that
  // @gltf-transform calls internally — we don't touch them directly, so
  // we leave the module shape opaque but typed.
  // Emscripten factories accept an optional Module config; we use
  // { locateFile } to point the loader at the nft-copied .wasm files
  // since webpack breaks the default __dirname-based resolution.
  type DracoFactoryOptions = {
    locateFile?: (file: string) => string;
  };
  export function createDecoderModule(
    options?: DracoFactoryOptions
  ): Promise<unknown>;
  export function createEncoderModule(
    options?: DracoFactoryOptions
  ): Promise<unknown>;
  const draco3d: {
    createDecoderModule: typeof createDecoderModule;
    createEncoderModule: typeof createEncoderModule;
  };
  export default draco3d;
}

declare module "obj2gltf" {
  type Options = {
    binary?: boolean;
    separate?: boolean;
    separateTextures?: boolean;
    checkTransparency?: boolean;
    secure?: boolean;
    packOcclusion?: boolean;
    metallicRoughness?: boolean;
    specularGlossiness?: boolean;
    unlit?: boolean;
  };
  // With { binary: true } obj2gltf resolves to a Buffer; otherwise it
  // resolves to the glTF JSON object. We always call it with binary:true,
  // so a narrow Buffer return type is sufficient for our usage.
  function obj2gltf(objPath: string, options?: Options): Promise<Buffer>;
  export default obj2gltf;
}
