import cors from "cors";
import express, { Request, Response, Router } from "express";
import { checkDatabaseConnection } from "./db";
import {
  formatPaginatedResponse,
  parsePaginationForQuery,
  parseWhereStatement,
  WhereParam,
  WhereParamTypes,
} from "./utils/api-queries";
import { supabase } from "./config/supabase";

const app = express();
const router = Router();

app.use(cors());
app.use(express.json());

// Health check endpoint với kiểm tra database
router.get("/", async (req: Request, res: Response) => {
  try {
    const dbStatus = await checkDatabaseConnection();
    res.json({
      message: "🚀 API is functional 🚀",
      database: {
        supabase: dbStatus ? "connected" : "disconnected",
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Health check failed",
      details: errorMessage,
    });
  }
});

router.get("/nfts", async (req: Request, res: Response) => {
  const acceptedQueries: WhereParam[] = [
    {
      key: "is_listed",
      type: WhereParamTypes.BOOLEAN,
    },
    {
      key: "owner",
      type: WhereParamTypes.STRING,
    },
    {
      key: "object_id",
      type: WhereParamTypes.STRING,
    },
  ];

  try {
    let query = supabase.from("nft").select("*");

    const whereConditions = parseWhereStatement(req.query, acceptedQueries);
    if (whereConditions) {
      Object.entries(whereConditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Pagination
    const pagination = parsePaginationForQuery(req.query);
    if (pagination) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(formatPaginatedResponse(data));
  } catch (e: unknown) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    res.status(400).json({ error: errorMessage });
  }
});

app.use(router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server ready at: http://localhost:${PORT}`)
);
