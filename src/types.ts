
export enum Language {
  ENGLISH = 'English',
  HAUSA = 'Hausa',
  YORUBA = 'Yoruba',
  IGBO = 'Igbo',
  FRENCH = 'French'
}

export interface EntityAnalysis {
  name: string;
  type: string;
  sentimentScore: number; // -1.0 to 1.0
  magnitude: number; // 0.0+
}

export interface FeedbackData {
  id: string;
  match: string; // The match/event name
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  timestamp: string;
  entities: EntityAnalysis[];
  overallScore: number;
  justification?: string; // AI reasoning for the sentiment score
}

export interface DailySentiment {
  date: string;
  avgScore: number;
}
