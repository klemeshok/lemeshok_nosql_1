// queries/part3_aggregations.js

// Перемикаємося на потрібну БД
db = db.getSiblingDB("spotify");

console.log("\nЗавдання 1. Топ-10 виконавців за середньою популярністю");
const topArtists = db.tracks.aggregate([
  // Розгортаємо масив, бо трек з кількома артистами має зараховуватися кожному
  { $unwind: "$artists" },
  {
    $group: {
      _id: "$artists",
      track_count: { $sum: 1 },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  { $match: { track_count: { $gte: 5 } } },
  { $sort: { avg_popularity: -1 } },
  { $limit: 10 },
  {
    $project: {
      _id: 0,
      artist: "$_id",
      avg_popularity: { $round: ["$avg_popularity", 1] }
    }
  }
]).toArray();
console.log(topArtists);


console.log("\nЗавдання 2. Розподіл треків за настроєм");
const moodDistribution = db.tracks.aggregate([
  // Додаємо нове поле mood на основі умов. Поріг для метрик беремо 0.5
  {
    $addFields: {
      mood: {
        $switch: {
          branches: [
            { case: { $and: [{ $gte: ["$audio_features.valence", 0.5] }, { $gte: ["$audio_features.energy", 0.5] }] }, then: "happy" },
            { case: { $and: [{ $lt: ["$audio_features.valence", 0.5] }, { $gte: ["$audio_features.energy", 0.5] }] }, then: "angry" },
            { case: { $and: [{ $gte: ["$audio_features.valence", 0.5] }, { $lt: ["$audio_features.energy", 0.5] }] }, then: "calm" },
            { case: { $and: [{ $lt: ["$audio_features.valence", 0.5] }, { $lt: ["$audio_features.energy", 0.5] }] }, then: "sad" }
          ],
          default: "unknown" // На випадок відсутніх даних
        }
      }
    }
  },
  {
    $group: {
      _id: "$mood",
      track_count: { $sum: 1 }
    }
  },
  {
    $project: {
      _id: 0,
      mood: "$_id",
      track_count: "$track_count"
    }
  },
  { $sort: { track_count: -1 } }
]).toArray();
console.log(moodDistribution);


console.log("\nЗавдання 3. Найбільш «танцювальний» жанр");
const danceableGenres = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      track_count: { $sum: 1 },
      avg_danceability: { $avg: "$audio_features.danceability" },
      avg_energy: { $avg: "$audio_features.energy" },
      avg_valence: { $avg: "$audio_features.valence" }
    }
  },
  { $match: { track_count: { $gte: 100 } } },
  // Шукаємо найбільш танцювальний, тому сортуємо за danceability
  { $sort: { avg_danceability: -1 } },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_danceability: { $round: ["$avg_danceability", 3] },
      avg_energy: { $round: ["$avg_energy", 3] },
      avg_valence: { $round: ["$avg_valence", 3] },
      track_count: "$track_count"
    }
  }
]).toArray();

console.log(`Знайдено релевантних жанрів (>= 100 треків): ${danceableGenres.length}`);
console.log(`Виводимо Топ-10 найбільш танцювальних:\n`);
console.log(danceableGenres.slice(0, 10));