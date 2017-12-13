import * as Joi from "joi";

export const baseValidation = {
    "x-api-key": Joi.string().required(),
    "x-app-id": Joi.string().required(),
    "x-api-version": Joi.string().required(),
    "__route__": Joi.any(),
}

const withValidation = (schema: any) => {
    let compose = Object.assign(baseValidation, schema);

    return compose;
}

export default withValidation;