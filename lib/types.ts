export type RawCategory = {
  category: string | null;
  trendScore: number;
  articleCount: number;
  sourceDiversity?: number | string;
  lastArticleAt?: string | null;
};
