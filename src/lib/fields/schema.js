import { z } from "zod";

function labelOf(definition) {
  return definition.label_bn || definition.label || definition.key;
}

function baseField(definition) {
  const label = labelOf(definition);

  switch (definition.type) {
    case "number":
      return z.preprocess(
        (value) =>
          value === "" || value === null || value === undefined
            ? undefined
            : Number(value),
        z.number({ error: `${label}: সঠিক সংখ্যা দিন` })
      );
    case "boolean":
      return z.boolean();
    case "multiselect":
      return z.array(z.string());
    case "date":
      return z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, `${label}: সঠিক তারিখ দিন`);
    default:
      return z.string();
  }
}

// Runtime zod schema generated from owner-managed field_definitions rows.
export function schemaFromFields(definitions = []) {
  const shape = {};

  for (const definition of definitions) {
    let field = baseField(definition);

    if (definition.required) {
      if (field instanceof z.ZodString) {
        field = field.min(1, `${labelOf(definition)}: এই ঘরটি পূরণ করুন`);
      }
    } else {
      field = field.optional();
    }

    shape[definition.key] = field;
  }

  return z.object(shape).passthrough();
}
