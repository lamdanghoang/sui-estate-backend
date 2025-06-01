"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseConnection = checkDatabaseConnection;
const supabase_1 = require("./config/supabase");
// Hàm kiểm tra kết nối Supabase
async function checkDatabaseConnection() {
    try {
        const { error } = await supabase_1.supabase.from("health_check").select("*").limit(1);
        if (error)
            throw error;
        console.log("✅ Supabase connection successful");
        return true;
    }
    catch (error) {
        console.error("❌ Supabase connection failed:", error);
        return false;
    }
}
