import { supabase } from "./config/supabase";

// Hàm kiểm tra kết nối Supabase
export async function checkDatabaseConnection() {
  try {
    const { error } = await supabase.from("health_check").select("*").limit(1);
    if (error) throw error;
    console.log("✅ Supabase connection successful");
    return true;
  } catch (error) {
    console.error("❌ Supabase connection failed:", error);
    return false;
  }
}
