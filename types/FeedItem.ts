export interface FeedItem {
  id: number;
  url: string;
  source: string;
  content: string;              // KÖTELEZŐ
  detailed_content: string;     // KÖTELEZŐ
  ai_clean: number;    // KÖTELEZŐ
  created_at: string;           // KÖTELEZŐ
}
