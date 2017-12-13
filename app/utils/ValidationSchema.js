"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Joi = require("joi");
exports.baseValidation = {
    "x-api-key": Joi.string().required(),
    "x-app-id": Joi.string().required(),
    "x-api-version": Joi.string().required(),
    "__route__": Joi.any(),
};
const withValidation = (schema) => {
    let compose = Object.assign(exports.baseValidation, schema);
    return compose;
};
exports.default = withValidation;
