export declare const API_VERSION = "v1";
export declare const API_PREFIX = "/api/v1";
export declare const JOB_STATUS_LABELS: Record<string, string>;
export declare const JOB_STATUS_ORDER: readonly ["QUEUED", "PROCESSING", "DOWNLOADING", "SUCCEEDED"];
export declare const MODEL_FORMAT: {
    readonly GLB: "glb";
    readonly GLTF: "gltf";
};
export declare const MODEL_SOURCE_TYPE: {
    readonly GENERATION: "GENERATION";
    readonly UPLOAD: "UPLOAD";
};
export declare const ALLOWED_MODEL_EXTENSIONS: readonly [".glb"];
export declare const ALLOWED_MODEL_MIMES: readonly ["model/gltf-binary", "application/octet-stream"];
export declare const MAX_MODEL_UPLOAD_SIZE_BYTES: number;
export declare const TRIPO_PROVIDER_NAME: "tripo";
//# sourceMappingURL=constants.d.ts.map