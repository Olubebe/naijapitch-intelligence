
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
  { code: 'pcm', name: 'Pidgin' },
  { code: 'ha', name: 'Hausa' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'ig', name: 'Igbo' },
  { code: 'fr', name: 'French' },
];

export const FEEDBACK_TOPICS = [
  {
    id: 'match',
    label: 'Clubs & Teams',
    description: 'Club and team performance, fan intensity, and what needs attention.',
  },
  {
    id: 'players',
    label: 'Nigerian Players',
    description: 'Player performance, contribution, effort, and development.',
  },
  {
    id: 'transfer',
    label: 'Club Decisions',
    description: 'Club recruitment, squad moves, and what Nigerian clubs should improve.',
  },
];

export const NIGERIAN_CLUBS = [
  'Enyimba FC',
  'Shooting Stars SC',
  'Rangers International',
  'Enugu Rangers',
  'Heartland FC',
  'Bendel Insurance',
  'Remo Stars',
  'Kano Pillars',
  'Lobi Stars',
  'Rivers United',
  'Sunshine Stars',
  'Plateau United',
  'Abia Warriors',
  'Akwa United',
  'Niger Tornadoes',
  'Kwara United',
  'Bayelsa United',
  'El-Kanemi Warriors',
];

export const NIGERIAN_TEAMS = [
  'Super Eagles',
  'Super Falcons',
  'Flying Eagles',
  'Golden Eaglets',
  'Olympic Eagles',
  'CHAN Eagles',
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
