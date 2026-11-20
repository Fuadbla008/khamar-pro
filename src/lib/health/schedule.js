// Auto-scheduling is shared by the animal-create action and any future import
// path. It is deliberately not a "use server" module so both server action
// files can call it with their own Supabase client.

export function addDays(dateString, days) {
  const date = new Date(`${String(dateString).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// The brief specifies purchase_date + offset_days. Fall back to birth date and
// finally today for animals created without either date.
export function scheduleBaseDate(animal) {
  return animal?.purchase_date || animal?.dob || localToday();
}

export async function scheduleHealthForAnimal(supabase, {
  farmId,
  animalId,
  species,
  baseDate,
  userId,
}) {
  if (!farmId || !animalId || !species) return;

  const { data: templates, error } = await supabase
    .from("health_templates")
    .select("id, farm_id, type, title_bn, description_bn, offset_days, is_recurring, recurring_days")
    .eq("species", species)
    .eq("is_active", true)
    .or(`farm_id.eq.${farmId},farm_id.is.null`);

  if (error || !templates?.length) return;

  // A farm-scoped template overrides a global one with the same type/title.
  const byKey = new Map();
  for (const template of templates) {
    const key = `${template.type}|${template.title_bn}`;
    const current = byKey.get(key);
    if (!current || (template.farm_id === farmId && current.farm_id !== farmId)) {
      byKey.set(key, template);
    }
  }

  const base = String(baseDate || localToday()).slice(0, 10);
  const rows = [...byKey.values()]
    .map((template) => {
      const date = addDays(base, template.offset_days);
      if (!date) return null;
      return {
        farm_id: farmId,
        animal_id: animalId,
        type: template.type,
        title: template.title_bn,
        medicine_item_id: null,
        dosage: null,
        notes: template.description_bn ?? null,
        date,
        next_due_date: null,
        cost: 0,
        created_by: userId ?? null,
        template_id: template.id,
        is_done: false,
        custom_fields: {},
      };
    })
    .filter(Boolean);

  if (rows.length) {
    await supabase.from("health_records").insert(rows);
  }
}
