/** Where each entity lives in the app (used by Timeline, Search, Alerts, Map). */
export const ENTITY_PATH: Record<string, string> = {
  tasks: '/tasks', goals: '/goals', projects: '/projects', milestones: '/milestones', deadlines: '/deadlines', events: '/calendar', habits: '/habits', focus_sessions: '/focus',
  reviews: '/review', decisions: '/decisions', accomplishments: '/accomplishments', memories: '/memory', experiments: '/experiments', notes: '/capture', inbox: '/capture',
  subjects: '/study', topics: '/study', chapters: '/study', study_resources: '/study', practice_results: '/study', exams: '/academic', assignments: '/academic',
  clients: '/work', deliverables: '/work', programs: '/fitness', workouts: '/fitness', exercise_sets: '/fitness', finance_items: '/finance', personal_items: '/personal',
};
