// queries/part2_queries.js

// Перемикаємося на потрібну БД
db = db.getSiblingDB("spotify");


console.log("\nЗавдання 1. Треки для вечірки");
const partyTracks = db.tracks.find(
  {
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    duration_ms: { $gte: 180000, $lte: 300000 }
  },
  {
    // Залишаємо лише потрібні поля, нічого зайвого! І ніяких обмежень на кількість треків. Бо це ж вечірка!
    _id: 0,
    track_id: 1,
    track_name: 1,
    artists: 1,
    album_name: 1
  }
).toArray();

console.log(`Знайдено треків для вечірки: ${partyTracks.length}`);
console.log("    Але поки виведемо перші 20, а якщо не втратимо свідомість від весілля, то потім виведемо ще.\n");
// Виводимо кожен трек одним рядком.
partyTracks.slice(0, 20).forEach(track => {
  // Оскільки artists — це масив, об'єднуємо їх через кому
  const artistsStr = track.artists.join(", ");
  console.log(`[${track.track_id}] ${track.track_name} — ${artistsStr} (Альбом: ${track.album_name})`);
});


console.log("\nЗавдання 2. ТОП-20 виконавців, у яких усі треки популярні\n");
const popularArtists = db.tracks.aggregate([
  // Розгортаємо масив виконавців, щоб рахувати статистику для кожного окремо
  { $unwind: "$artists" },
  // Групуємо по імені виконавця
  {
    $group: {
      _id: "$artists",
      track_count: { $sum: 1 },
      min_popularity: { $min: "$popularity" },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  // Фільтруємо: мінімум 3 треки і мінімальна популярність кожного >= 60
  {
    $match: {
      track_count: { $gte: 3 },
      min_popularity: { $gte: 60 }
    }
  },
  // Форматуємо результат та округлюємо середнє значення, забезпечуємо вивід полів у потрібному порядку
  {
    $project: {
      _id: 0,
      artist: "$_id",
      track_count: "$track_count",
      min_popularity: "$min_popularity",
      avg_popularity: { $round: ["$avg_popularity", 1] }
    }
  },
  // Сортуємо за спаданням середньої популярності та беремо топ-20
  { $sort: { avg_popularity: -1 } },
  { $limit: 20 }
]).toArray();
console.log(popularArtists);


console.log("\nЗавдання 3. Нетипові треки");
console.log("    На прикладі одного жанру (першого в результаті), щоб не дуже сильно захаращувати консоль.\n");

const outlierTracks = db.tracks.aggregate([
  // Використовуємо віконну функцію для розрахунку статистики по кожному жанру
  {
    $setWindowFields: {
      partitionBy: "$track_genre",
      output: {
        avg_tempo: { $avg: "$audio_features.tempo" },
        std_tempo: { $stdDevPop: "$audio_features.tempo" }
      }
    }
  },
  // Розраховуємо поріг (mean + 2 * stdDev)
  {
    $addFields: {
      outlier_threshold: {
        $add: ["$avg_tempo", { $multiply: [2, "$std_tempo"] }]
      }
    }
  },
  // Фільтруємо лише ті треки, де темп перевищує поріг
  {
    $match: {
      $expr: { $gt: ["$audio_features.tempo", "$outlier_threshold"] }
    }
  },
  // Групуємо результати по жанрах для потрібного формату виводу
  {
    $group: {
      _id: "$track_genre",
      avg_tempo: { $first: "$avg_tempo" },
      outlier_threshold: { $first: "$outlier_threshold" },
      outlier_tracks: {
        $push: {
          _id: "$_id",
          track_name: "$track_name",
          popularity: "$popularity",
          artists: "$artists",
          audio_features: { tempo: "$audio_features.tempo" }
        }
      }
    }
  },
  // Фінальне форматування та округлення значень
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_tempo: { $round: ["$avg_tempo", 1] },
      outlier_threshold: { $round: ["$outlier_threshold", 1] },
      outlier_tracks: "$outlier_tracks"
    }
  }
]).toArray();
// Виводимо для одного жанру, щоб не захаращувати консоль, але якщо треба для всіх, то console.log(outlierTracks);
console.log(outlierTracks[0]);


console.log("\nЗавдання 4: Треки для фонової роботи");
const backgroundTracks = db.tracks.find(
  {
    "audio_features.loudness": { $lt: -10 },
    "audio_features.speechiness": { $lt: 0.1 },
    "audio_features.instrumentalness": { $gt: 0.5 },
    explicit: false
  },
  {
    // Беремо лише базову інформацію для компактного виводу
    _id: 0,
    track_id: 1,
    track_name: 1,
    artists: 1
  }
  // Для роботи теж не робимо обмежень по кількості треків, бо якщо слухати одне й те саме, буде неприкольно.
).toArray();

// Виводимо загальну кількість
console.log(`Загалом знайдено треків для фонової роботи: ${backgroundTracks.length}`);
console.log("    Але на сьогодні нам цілком хватить 20 треків. А коли вони закінчаться, то підемо додому, бо скільки можна працювати.\n");
backgroundTracks.slice(0, 20).forEach(track => {
  const artistsStr = track.artists.join(", ");
  console.log(`[${track.track_id}] ${track.track_name} — ${artistsStr}`);
});