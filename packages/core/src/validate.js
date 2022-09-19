import Ajv from "ajv";
import en from "ajv-i18n/localize/en";
import fi from "ajv-i18n/localize/fi";
import sv from "ajv-i18n/localize/sv";
import toPath from "lodash/toPath";
import {
  deepEquals,
  getDefaultFormState,
  isObject,
  mergeObjects,
} from "./utils";
let ajv = createAjvInstance();

const localize = { en, fi, sv };

let formerCustomFormats = null;
let formerMetaSchema = null;
const ROOT_SCHEMA_PREFIX = "__rjsf_rootSchema";

function createAjvInstance() {
  const ajv = new Ajv({
    errorDataPath: "property",
    allErrors: true,
    multipleOfPrecision: 8,
    schemaId: "auto",
    unknownFormats: "ignore",
    messages: false,
  });

  // add custom formats
  ajv.addFormat(
    "data-url",
    /^data:([a-z]+\/[a-z0-9-+.]+)?;(?:name=(.*);)?base64,(.*)$/
  );
  ajv.addFormat(
    "color",
    /^(#?([0-9A-Fa-f]{3}){1,2}\b|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow|(rgb\(\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*\))|(rgb\(\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*\)))$/
  );
  return ajv;
}

function toErrorSchema(errors) {
  // Transforms a ajv validation errors list:
  // [
  //   {property: ".level1.level2[2].level3", message: "err a"},
  //   {property: ".level1.level2[2].level3", message: "err b"},
  //   {property: ".level1.level2[4].level3", message: "err b"},
  // ]
  // Into an error tree:
  // {
  //   level1: {
  //     level2: {
  //       2: {level3: {errors: ["err a", "err b"]}},
  //       4: {level3: {errors: ["err b"]}},
  //     }
  //   }
  // };
  if (!errors.length) {
    return {};
  }
  return errors.reduce((errorSchema, error) => {
    const { property, message } = error;
    const path = toPath(property);
    let parent = errorSchema;

    // If the property is at the root (.level1) then toPath creates
    // an empty array element at the first index. Remove it.
    if (path.length > 0 && path[0] === "") {
      path.splice(0, 1);
    }

    for (const segment of path.slice(0)) {
      if (!(segment in parent)) {
        parent[segment] = {};
      }
      parent = parent[segment];
    }

    if (Array.isArray(parent.__errors)) {
      // We store the list of errors for this node in a property named __errors
      // to avoid name collision with a possible sub schema field named
      // "errors" (see `validate.createErrorHandler`).
      parent.__errors = parent.__errors.concat(message);
    } else {
      if (message) {
        parent.__errors = [message];
      }
    }
    return errorSchema;
  }, {});
}

export function toErrorList(errorSchema, fieldName = "root") {
  // XXX: We should transform fieldName as a full field path string.
  let errorList = [];
  if ("__errors" in errorSchema) {
    errorList = errorList.concat(
      errorSchema.__errors.map(stack => {
        return {
          stack: `${stack}`,
        };
      })
    );
  }
  return Object.keys(errorSchema).reduce((acc, key) => {
    if (key !== "__errors") {
      acc = acc.concat(toErrorList(errorSchema[key], key));
    }
    return acc;
  }, errorList);
}

function createErrorHandler(formData) {
  const handler = {
    // We store the list of errors for this node in a property named __errors
    // to avoid name collision with a possible sub schema field named
    // "errors" (see `utils.toErrorSchema`).
    __errors: [],
    addError(message) {
      this.__errors.push(message);
    },
  };
  if (isObject(formData)) {
    return Object.keys(formData).reduce((acc, key) => {
      return { ...acc, [key]: createErrorHandler(formData[key]) };
    }, handler);
  }
  if (Array.isArray(formData)) {
    return formData.reduce((acc, value, key) => {
      return { ...acc, [key]: createErrorHandler(value) };
    }, handler);
  }
  return handler;
}

function unwrapErrorHandler(errorHandler) {
  return Object.keys(errorHandler).reduce((acc, key) => {
    if (key === "addError") {
      return acc;
    } else if (key === "__errors") {
      return { ...acc, [key]: errorHandler[key] };
    }
    return { ...acc, [key]: unwrapErrorHandler(errorHandler[key]) };
  }, {});
}

/**
 * Transforming the error output from ajv to format used by jsonschema.
 * At some point, components should be updated to support ajv.
 */
function transformAjvErrors(errors = []) {
  if (errors === null) {
    return [];
  }

  return errors.map(e => {
    const { dataPath, keyword, message, params, schemaPath } = e;
    let property = `${dataPath}`;

    // put data in expected format
    return {
      name: keyword,
      property,
      message,
      params, // specific to ajv
      stack: `${property} ${message}`.trim(),
      schemaPath,
    };
  });
}

/**
 * This function processes the formData with a user `validate` contributed
 * function, which receives the form data and an `errorHandler` object that
 * will be used to add custom validation errors for each field.
 */
export default function validateFormData(
  formData,
  schema,
  customValidate,
  transformErrors,
  additionalMetaSchemas = [],
  customFormats = {},
  intl
) {
  // Include form data with undefined values, which is required for validation.
  const rootSchema = schema;
  formData = getDefaultFormState(schema, formData, rootSchema, true);

  const newMetaSchemas = !deepEquals(formerMetaSchema, additionalMetaSchemas);
  const newFormats = !deepEquals(formerCustomFormats, customFormats);

  if (newMetaSchemas || newFormats) {
    ajv = createAjvInstance();
  }

  // add more schemas to validate against
  if (
    additionalMetaSchemas &&
    newMetaSchemas &&
    Array.isArray(additionalMetaSchemas)
  ) {
    ajv.addMetaSchema(additionalMetaSchemas);
    formerMetaSchema = additionalMetaSchemas;
  }

  // add more custom formats to validate against
  if (customFormats && newFormats && isObject(customFormats)) {
    Object.keys(customFormats).forEach(formatName => {
      ajv.addFormat(formatName, customFormats[formatName]);
    });

    formerCustomFormats = customFormats;
  }

  const removeDataFromValidation = (
    elements,
    required,
    formData,
    objectList
  ) => {
    for (const key in elements) {
      const element = elements[key];
      if (element?.type === "object" && element?.format !== "table") {
        removeDataFromValidation(
          element.properties,
          element.required,
          formData[key],
          false
        );
      } else if (
        element?.type === "array" &&
        element?.items.type === "object"
      ) {
        removeDataFromValidation(
          element.items.properties,
          element.items.required,
          formData[key],
          true
        );
      } else if (
        !required?.includes(key) &&
        element?.type === "array" &&
        (element?.items.type !== "object" ||
          element?.items.format === "table") &&
        !element?.items.pattern &&
        !element?.items.minimum &&
        !element?.items.maximum &&
        !element?.items.maxLength
      ) {
        // do not validate these fields
        if (objectList) {
          for (const formDatum of formData) {
            delete formDatum[key];
          }
        } else {
          delete formData[key];
        }
      }
    }
  };

  removeDataFromValidation(schema.properties, schema.required, formData, false);

  const addAnyOf = schema => {
    let errorSchema = { ...schema, properties: {} };

    if (schema?.type === "array" && schema?.items?.type === "object") {
      errorSchema.items = addAnyOf(schema.items);
    } else if (schema.type === "object" && schema.requireAtLeastOne) {
      const anyOf = [];
      for (const key in schema.properties) {
        const schemaObject = { required: [`${key}`], properties: {} };
        if (schema.properties[key].type === "string") {
          schemaObject.properties[key] = {
            minLength: 1,
          };
        } else if (schema.properties[key].type === "array") {
          schemaObject.properties[key] = {
            minItems: 1,
          };
        }
        anyOf.push(schemaObject);
      }
      errorSchema = {
        ...schema,
        anyOf: anyOf,
      };
    } else if (schema.type === "object" && schema.properties) {
      for (const key in schema.properties) {
        errorSchema.properties[key] = addAnyOf(schema.properties[key]);
      }
    }

    return errorSchema;
  };

  const anyOfSchema = addAnyOf(schema);

  let validationError = null;
  try {
    ajv.validate(anyOfSchema, formData);
  } catch (err) {
    validationError = err;
  }

  localize[intl.locale.split("-")[0]](ajv.errors);

  let errors = transformAjvErrors(ajv.errors);
  // Clear errors to prevent persistent errors, see #1104

  ajv.errors = null;

  const noProperMetaSchema =
    validationError &&
    validationError.message &&
    typeof validationError.message === "string" &&
    validationError.message.includes("no schema with key or ref ");

  if (noProperMetaSchema) {
    errors = [
      ...errors,
      {
        stack: validationError.message,
      },
    ];
  }
  if (typeof transformErrors === "function") {
    errors = transformErrors(errors);
  }

  let errorSchema = toErrorSchema(errors);

  if (noProperMetaSchema) {
    errorSchema = {
      ...errorSchema,
      ...{
        $schema: {
          __errors: [validationError.message],
        },
      },
    };
  }

  if (typeof customValidate !== "function") {
    return { errors, errorSchema };
  }

  const errorHandler = customValidate(formData, createErrorHandler(formData));
  const userErrorSchema = unwrapErrorHandler(errorHandler);
  const newErrorSchema = mergeObjects(errorSchema, userErrorSchema, true);
  // XXX: The errors list produced is not fully compliant with the format
  // exposed by the jsonschema lib, which contains full field paths and other
  // properties.
  const newErrors = toErrorList(newErrorSchema);

  return {
    errors: newErrors,
    errorSchema: newErrorSchema,
  };
}

/**
 * Recursively prefixes all $ref's in a schema with `ROOT_SCHEMA_PREFIX`
 * This is used in isValid to make references to the rootSchema
 */
export function withIdRefPrefix(schemaNode) {
  let obj = schemaNode;
  if (schemaNode.constructor === Object) {
    obj = { ...schemaNode };
    for (const key in obj) {
      const value = obj[key];
      if (
        key === "$ref" &&
        typeof value === "string" &&
        value.startsWith("#")
      ) {
        obj[key] = ROOT_SCHEMA_PREFIX + value;
      } else {
        obj[key] = withIdRefPrefix(value);
      }
    }
  } else if (Array.isArray(schemaNode)) {
    obj = [...schemaNode];
    for (var i = 0; i < obj.length; i++) {
      obj[i] = withIdRefPrefix(obj[i]);
    }
  }
  return obj;
}

/**
 * Validates data against a schema, returning true if the data is valid, or
 * false otherwise. If the schema is invalid, then this function will return
 * false.
 */
export function isValid(schema, data, rootSchema) {
  try {
    // add the rootSchema ROOT_SCHEMA_PREFIX as id.
    // then rewrite the schema ref's to point to the rootSchema
    // this accounts for the case where schema have references to models
    // that lives in the rootSchema but not in the schema in question.
    return ajv
      .addSchema(rootSchema, ROOT_SCHEMA_PREFIX)
      .validate(withIdRefPrefix(schema), data);
  } catch (e) {
    return false;
  } finally {
    // make sure we remove the rootSchema from the global ajv instance
    ajv.removeSchema(ROOT_SCHEMA_PREFIX);
  }
}
