"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importStar(require("express"));
const db_1 = require("./db");
const api_queries_1 = require("./utils/api-queries");
const supabase_1 = require("./config/supabase");
const app = (0, express_1.default)();
const router = (0, express_1.Router)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check endpoint với kiểm tra database
router.get("/", async (req, res) => {
    try {
        const dbStatus = await (0, db_1.checkDatabaseConnection)();
        res.json({
            message: "🚀 API is functional 🚀",
            database: {
                supabase: dbStatus ? "connected" : "disconnected",
            },
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({
            error: "Health check failed",
            details: errorMessage,
        });
    }
});
router.get("/nfts", async (req, res) => {
    const acceptedQueries = [
        {
            key: "is_listed",
            type: api_queries_1.WhereParamTypes.BOOLEAN,
        },
        {
            key: "owner",
            type: api_queries_1.WhereParamTypes.STRING,
        },
        {
            key: "object_id",
            type: api_queries_1.WhereParamTypes.STRING,
        },
    ];
    try {
        let query = supabase_1.supabase.from("nft").select("*");
        const whereConditions = (0, api_queries_1.parseWhereStatement)(req.query, acceptedQueries);
        if (whereConditions) {
            Object.entries(whereConditions).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }
        // Pagination
        const pagination = (0, api_queries_1.parsePaginationForQuery)(req.query);
        if (pagination) {
            const from = (pagination.page - 1) * pagination.limit;
            const to = from + pagination.limit - 1;
            query = query.range(from, to);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        res.json((0, api_queries_1.formatPaginatedResponse)(data));
    }
    catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        res.status(400).json({ error: errorMessage });
    }
});
app.use(router);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server ready at: http://localhost:${PORT}`));
