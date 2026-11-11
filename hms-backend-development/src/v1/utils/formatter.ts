import { Response, Request } from "express";
import { StatusCode } from "../types/StatusCode";
export const apiSuccess = (res: Response, params: { data?: any; message?: string; metadata?: object | any; statusCode?: number }) => {
    res.status(params.statusCode || 200).json({ status: true, message: params.message, metadata: params.metadata, data: params.data, ...params });
};

export const apiResponse = (res: Response, params: { data: any; status?: number; message?: string; metadata?: object | any }) => {
    res.status(params.status || 200).json({ status: true, message: params.message, metadata: params.metadata, data: params.data });
};

export const apiError = (res: Response, params: { error?: any; status?: number; message?: string; statusCode?: StatusCode; metadata?: object | any }) => {
    res.status(params.status || 400).json({ status: false, statusCode: params.statusCode, message: params.message, error: params.error, metadata: params.metadata, ...params });
};
