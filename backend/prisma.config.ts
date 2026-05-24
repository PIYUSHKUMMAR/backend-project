import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "../prisma/schema.prisma", // Added ../ to point to the root folder
  migrations: {
    path: "../prisma/migrations",    // Added ../ to point to the root folder
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});