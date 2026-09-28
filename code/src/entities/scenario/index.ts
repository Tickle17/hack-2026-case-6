export * from './model/types';
export { createRun } from './lib/interpreter';
export type {
  ScenarioRun,
  PendingTask,
  DayTask,
  AnswerResult,
} from './lib/interpreter';
export { evaluate, activeTasks } from './lib/conditions';
export { applyEffect, applyEffects } from './lib/effects';
export {
  createInitialState,
  canAfford,
  START_BALANCE,
  MAX_BALANCE,
  MIN_BALANCE,
  DAILY_REWARD,
  STATE_VERSION,
} from './lib/state';
export { saveState, loadState, clearState } from './lib/persistence';
export type { StatePort } from './lib/persistence';
export {
  affordability,
  limitLeft,
  mustCost,
  mustShortfall,
  shoppingList,
  purchaseEffects,
  missingNeeds,
  treatBoughtToday,
  shopPhase,
  mustCover,
  coverAndBuyEffects,
} from './lib/shopping';
export type { Affordability, CoverOption } from './lib/shopping';
export { taskBlocker, DIRTY_BELOW } from './lib/tasks';
export type { TaskBlock } from './lib/tasks';
export {
  challengeFlag,
  morningFlag,
  needsFirstFlag,
  reminderFlag,
} from './lib/day-flags';
export { lessonReminder } from './lib/lesson-reminder';
export {
  dayChallenges,
  planKept,
  savingsKept,
  PLAN_KEPT_REWARD,
  SAVINGS_KEPT_REWARD,
} from './lib/challenges';
export type { Challenge, ChallengeId } from './lib/challenges';
export { LEDGER_LIMIT } from './lib/state';
export {
  askedTaskHint,
  currentHint,
  planStepHint,
  HINTS_OFF_MESSAGE,
  HINT_TARGETS,
  SUGGESTED_WANT,
} from './lib/hints';
export type { HintContext, Hint, PlanDraft } from './lib/hints';
export { EVENTS, eventForDay, SALE_DISCOUNT } from './config/events';
export type { DayEvent, EventKind } from './config/events';
export { GLOSSARY, termById } from './config/glossary';
export { phraseWords, shuffleWords } from './lib/phrase';
export { dayXpInput, savedToday } from './lib/day-xp';
export type { Term } from './config/glossary';
export {
  makeGateProblem,
  checkGate,
  adultSummary,
  PARENT_BONUS,
  parentBonusGivenToday,
} from './lib/adult';
export type { GateProblem, AdultSummary } from './lib/adult';
export { daySummary } from './lib/day-summary';
export type { DaySummary, DayLine } from './lib/day-summary';
export { averageContribution, goalProgress } from './lib/savings';
export type { GoalProgress } from './lib/savings';
export { GOALS, goalById, goalEta, SUGGESTED_GOAL } from './config/goals';
export type { GoalSpec } from './config/goals';
export { DIRECTIONS } from './config/budget-icons';
export type { BudgetDirection } from './config/budget-icons';
export { validateScenario, validateLessons } from './lib/validate';
export type { Problem } from './lib/validate';
export { lessonToNodes, lessonEntryId } from './lib/lesson-nodes';
export { personalize, PLAYER_SLOT, PET_SLOT } from './lib/text';
export { INTRO } from './config/intro';
export {
  LESSONS,
  lessonForDay,
  lessonDays,
  FIRST_LESSON_DAY,
} from './config/lessons';
export {
  REGISTRIES,
  TASKS,
  ITEMS,
  SPECIES,
  CONSUMABLES_TOTAL,
} from './config/registries';
export { purchaseFeedback, savingsFeedback } from './lib/feedback';
export { HOW_TO_PLAY } from './config/how-to-play';
export type { HowToSection } from './config/how-to-play';
export { ACHIEVEMENTS } from './config/achievements';
export type { Achievement } from './config/achievements';
export { newAchievements } from './lib/achievements';
