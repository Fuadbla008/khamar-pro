export function formDataToObject(formData) {
  const result = {};

  if (!formData || typeof formData.entries !== "function") return result;

  for (const [key, value] of formData.entries()) {
    const nextValue = typeof value === "string" ? value : String(value ?? "");
    if (!Object.hasOwn(result, key)) {
      result[key] = nextValue;
    } else if (Array.isArray(result[key])) {
      result[key].push(nextValue);
    } else {
      result[key] = [result[key], nextValue];
    }
  }

  return result;
}

export function objectToFormData(values) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(key, String(item ?? ""));
      }
    } else {
      formData.append(key, String(value ?? ""));
    }
  }

  return formData;
}
