/** 统一的服务端错误类型：携带 HTTP 状态码、机器可读错误码与结构化明细。 */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function validationError(details) {
  return new ApiError(400, 'VALIDATION_ERROR', '定义校验未通过', details);
}

export function notFound(message) {
  return new ApiError(404, 'NOT_FOUND', message);
}
