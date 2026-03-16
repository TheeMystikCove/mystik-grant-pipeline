import { Client } from "@notionhq/client";

let _client: Client | null = null;

export function getNotionClient(): Client {
  if (!_client) {
    if (!process.env.NOTION_API_KEY) {
      throw new Error("NOTION_API_KEY is not set");
    }
    _client = new Client({ auth: process.env.NOTION_API_KEY });
  }
  return _client;
}

export const NOTION_DBS = {
  opportunities: process.env.NOTION_OPPORTUNITIES_DB_ID!,
  proposals: process.env.NOTION_PROPOSALS_DB_ID!,
  review: process.env.NOTION_REVIEW_DB_ID!,
} as const;
