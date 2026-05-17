// scripts/02_transform.js

// Перемикаємося на потрібну базу даних
db = db.getSiblingDB("spotify");

// 1. Видаляємо цільову колекцію, якщо вона вже існує, щоб забезпечити clean run
db.tracks.drop();

console.log("Перетворення почато...");

// 2. Run the Aggregation Pipeline
db.tracks_raw.aggregate([
  {
    $project: {
      // Лишаємо тільки потрібні поля
      _id: 0, // Прибираємо _id, він буде створений автоматично
      track_id: 1,
      track_name: 1,
      album_name: 1,
      explicit: 1,
      popularity: 1,
      duration_ms: 1,
      track_genre: 1,

      // Перетворюємо рядок artists на очищений масив
      artists: {
        $map: {
          input: { $split: ["$artists", ";"] },
          as: "artist",
          in: { $trim: { input: "$$artist" } }
        }
      },

      // Створюємо вкладений об'єкт audio_features
      audio_features: {
        danceability: "$danceability",
        energy: "$energy",
        loudness: "$loudness",
        speechiness: "$speechiness",
        acousticness: "$acousticness",
        instrumentalness: "$instrumentalness",
        liveness: "$liveness",
        valence: "$valence",
        tempo: "$tempo",
        key: "$key",
        mode: "$mode",
        time_signature: "$time_signature"
      },

      // Порахуємо тривалість в секундах (округлено до 1 десяткового знаку)
      duration_sec: { 
        $round: [{ $divide: ["$duration_ms", 1000] }, 1] 
      },

      // Порахуємо рівень популярності
      popularity_tier: {
        $switch: {
          branches: [
            { case: { $gte: ["$popularity", 70] }, then: "high" },
            { case: { $gte: ["$popularity", 40] }, then: "medium" }
          ],
          default: "low"
        }
      }
    }
  },
  // Записуємо результати в нову колекцію 'tracks'
  {
    $out: "tracks"
  }
]);

console.log("Перетворення завершено!");
console.log("Загальна кількість документів у 'tracks':", db.tracks.countDocuments({}));
console.log("Приклад перетвореного документа:");
console.log(db.tracks.findOne());