
import React from 'react';

export const COLORS = {
  primary: '#008751', // Nigerian Green
  secondary: '#ffffff', // Nigerian White
  accent: '#facc15', // Gold
  danger: '#ef4444',
  success: '#22c55e',
};

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ha', name: 'Hausa' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'ig', name: 'Igbo' },
  { code: 'fr', name: 'French' },
];

export const FEEDBACK_TOPICS = [
  {
    id: 'match',
    label: 'Match',
    description: 'Tactics, team shape, result, referee calls, and game management.',
  },
  {
    id: 'players',
    label: 'Players',
    description: 'Player performance, selection, attitude, development, and injuries.',
  },
  {
    id: 'transfer',
    label: 'Transfers',
    description: 'Signings, departures, scouting, and squad-building decisions.',
  },
];

export const FOOTBALL_FOCUS_AREAS = [
  'Coaching',
  'Officiating',
  'Facilities',
  'Club Management',
  'Supporter Experience',
  'Medical & Fitness',
  'Youth Development',
  'Player Welfare',
];

export const TOPIC_FOCUS_AREAS: Record<string, string[]> = {
  match: [
    'Coaching',
    'Officiating',
    'Facilities',
    'Supporter Experience',
    'Club Management',
  ],
  players: [
    'Player Welfare',
    'Medical & Fitness',
    'Youth Development',
    'Coaching',
    'Club Management',
  ],
  transfer: [
    'Scouting & Recruitment',
    'Squad Planning',
    'Contract Decisions',
    'Player Welfare',
    'Club Management',
  ],
};
