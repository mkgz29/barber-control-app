import { chinosSupabase } from "./chinosSupabaseClient";

export async function getChinosPublicStaff() {
  const { data, error } = await chinosSupabase
    .from("public_staff")
    .select("id,name,photo_url,schedule,level");

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getChinosBusySlots(date) {
  if (!date) {
    throw new Error("La fecha es requerida.");
  }

  const { data, error } = await chinosSupabase
    .from("public_busy_slots")
    .select("staff_id,date,start_time,end_time")
    .eq("date", date);

  if (error) {
    throw error;
  }

  return data || [];
}
