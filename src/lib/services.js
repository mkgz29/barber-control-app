export function normalizeServiceName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function getHaircutServiceName(haircut) {
  return (
    String(haircut?.service_name_snapshot || "").trim() ||
    String(haircut?.service || "").trim() ||
    "Sin servicio"
  );
}

export function getHaircutBasePrice(haircut) {
  const value = haircut?.base_price ?? haircut?.price ?? haircut?.final_price ?? 0;
  return Number(value || 0);
}

export function getHaircutFinalPrice(haircut) {
  const value = haircut?.final_price ?? haircut?.price ?? 0;
  return Number(value || 0);
}

export function mapServiceToOption(service) {
  return {
    id: service.id,
    name: String(service.name || "").trim(),
    price: Number(service.price || 0),
    is_active: service.is_active !== false,
  };
}
