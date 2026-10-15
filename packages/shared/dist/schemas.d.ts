import { z } from 'zod';
export declare const PRODUCT_CATEGORIES: readonly ["furniture", "electronics", "apparel", "jewelry", "footwear", "packaging", "toys", "automotive", "food", "other"];
export declare const ALLOWED_IMAGE_MIMES: readonly ["image/jpeg", "image/png", "image/webp"];
export declare const ALLOWED_IMAGE_EXTENSIONS: readonly [".jpg", ".jpeg", ".png", ".webp"];
export declare const MAX_UPLOAD_SIZE_BYTES: number;
export declare const createProductSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodNullable<z.ZodEnum<["furniture", "electronics", "apparel", "jewelry", "footwear", "packaging", "toys", "automotive", "food", "other"]>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    category?: "furniture" | "electronics" | "apparel" | "jewelry" | "footwear" | "packaging" | "toys" | "automotive" | "food" | "other" | null | undefined;
}, {
    name?: string | undefined;
    category?: "furniture" | "electronics" | "apparel" | "jewelry" | "footwear" | "packaging" | "toys" | "automotive" | "food" | "other" | null | undefined;
}>;
export declare const updateProductSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodNullable<z.ZodEnum<["furniture", "electronics", "apparel", "jewelry", "footwear", "packaging", "toys", "automotive", "food", "other"]>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    category?: "furniture" | "electronics" | "apparel" | "jewelry" | "footwear" | "packaging" | "toys" | "automotive" | "food" | "other" | null | undefined;
}, {
    name?: string | undefined;
    category?: "furniture" | "electronics" | "apparel" | "jewelry" | "footwear" | "packaging" | "toys" | "automotive" | "food" | "other" | null | undefined;
}>;
export declare const productIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const generationIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const assetIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["QUEUED", "PROCESSING", "DOWNLOADING", "SUCCEEDED", "FAILED"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "QUEUED" | "PROCESSING" | "DOWNLOADING" | "SUCCEEDED" | "FAILED" | undefined;
    search?: string | undefined;
}, {
    status?: "QUEUED" | "PROCESSING" | "DOWNLOADING" | "SUCCEEDED" | "FAILED" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    search?: string | undefined;
}>;
export declare const shopifyResolveSchema: z.ZodObject<{
    shopifyProductId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodEffects<z.ZodString, string, string>;
    shopDomain: z.ZodOptional<z.ZodString>;
    returnUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    shopifyProductId: string;
    imageUrl: string;
    title?: string | undefined;
    shopDomain?: string | undefined;
    returnUrl?: string | undefined;
}, {
    shopifyProductId: string;
    imageUrl: string;
    title?: string | undefined;
    shopDomain?: string | undefined;
    returnUrl?: string | undefined;
}>;
export declare const shopifyGenerateSchema: z.ZodObject<{
    shopifyProductId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodEffects<z.ZodString, string, string>;
    shopDomain: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    shopifyProductId: string;
    imageUrl: string;
    title?: string | undefined;
    shopDomain?: string | undefined;
}, {
    shopifyProductId: string;
    imageUrl: string;
    title?: string | undefined;
    shopDomain?: string | undefined;
}>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ShopifyResolveInput = z.infer<typeof shopifyResolveSchema>;
export type ShopifyGenerateInput = z.infer<typeof shopifyGenerateSchema>;
//# sourceMappingURL=schemas.d.ts.map