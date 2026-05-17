// queries/part4_indexes.js

// Перемикаємося на потрібну БД
db = db.getSiblingDB("spotify");

console.log("\nЗавдання 1. Аналіз запиту та індексація");

// Скидаємо індекси, якщо вони вже є
db.tracks.dropIndexes();

console.log("\n    explain() ДО створення індексу");
const explainBefore = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 }).explain("executionStats");

console.log(`Етап (Stage): ${explainBefore.queryPlanner.winningPlan.stage} (або SORT -> COLLSCAN)`);
console.log(`Переглянуто документів (totalDocsExamined): ${explainBefore.executionStats.totalDocsExamined}`);

console.log("\nСтворюємо індекс");
// Equality (track_genre) -> Sort (popularity) -> Range (danceability)
db.tracks.createIndex({
  track_genre: 1,
  popularity: -1,
  "audio_features.danceability": 1
}, { name: "idx_genre_popularity_danceability" });
console.log("Індекс idx_genre_popularity_danceability успішно створено.");

console.log("\n     explain() ПІСЛЯ створення індексу");
const explainAfter = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 }).explain("executionStats");

// MongoDB часто загортає IXSCAN всередину FETCH
const winningStage = explainAfter.queryPlanner.winningPlan.stage === "FETCH" 
  ? explainAfter.queryPlanner.winningPlan.inputStage.stage 
  : explainAfter.queryPlanner.winningPlan.stage;

console.log(`Етап (Stage): ${winningStage}`);
console.log(`Використаний індекс: ${explainAfter.queryPlanner.winningPlan.inputStage.indexName}`);
console.log(`Переглянуто документів (totalDocsExamined): ${explainAfter.executionStats.totalDocsExamined}`);


console.log("\nЗавдання 2. Індекс для інших полів");
// Поле explicit (boolean) ставимо першим як Equality.
db.tracks.createIndex({
  explicit: 1,
  "audio_features.instrumentalness": 1,
  "audio_features.speechiness": 1
}, { name: "idx_explicit_instrumentalness_speechiness" });
console.log("Індекс idx_explicit_instrumentalness_speechiness успішно створено.");

console.log("\nПеревіряємо використання нового індексу");
const explainWorkQuery = db.tracks.find({
  explicit: false,
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 }
}).explain("executionStats");

const workWinningStage = explainWorkQuery.queryPlanner.winningPlan.stage === "FETCH" 
  ? explainWorkQuery.queryPlanner.winningPlan.inputStage.stage 
  : explainWorkQuery.queryPlanner.winningPlan.stage;

console.log(`Етап (Stage): ${workWinningStage}`);
console.log(`Використаний індекс: ${explainWorkQuery.queryPlanner.winningPlan.inputStage.indexName}`);