import { Devvit, JobContext, JSONObject, MediaAsset } from '@devvit/public-api';

export interface GameData extends JSONObject {
  coordinates: { lat: number; lng: number };
  streetViewImageData: {
    width: number;
    height: number;
  };
  streetViewMediaAsset: MediaAsset;
}

export function setGameDataByPostId(
  context: Devvit.Context | JobContext,
  postId: string,
  data: GameData
) {
  return context.redis.set(`game:${postId}`, JSON.stringify(data));
}

export async function getGameDataByPostId(
  context: Devvit.Context,
  postId: string
): Promise<GameData | null> {
  const rawData = await context.redis.get(`game:${postId}`);

  if (rawData) {
    return JSON.parse(rawData);
  }

  return null;
}

export interface GameGuess extends JSONObject {
  lat: number;
  lng: number;
  username: string;
  snoovatarUrl: string;
  points: number;
  distanceString: string;
}

export function setGameGuess(
  context: Devvit.Context,
  postId: string,
  username: string,
  guess: GameGuess
) {
  return context.redis.hSet(`game:${postId}:guesses`, {
    [username]: JSON.stringify(guess),
  });
}

export function getGameGuess(
  context: Devvit.Context,
  postId: string,
  username: string
): Promise<GameGuess | null> {
  return context.redis
    .hGet(`game:${postId}:guesses`, username)
    .then((guess) => (guess ? JSON.parse(guess) : null));
}

export async function getAllGameGuesses(
  context: Devvit.Context,
  postId: string
): Promise<{ [username: string]: GameGuess }> {
  const allGuesses = await context.redis.hGetAll(`game:${postId}:guesses`);

  return Object.fromEntries(
    Object.entries(allGuesses).map(([username, guess]) => [
      username,
      JSON.parse(guess),
    ])
  );
}

export function addUserToSubredditLeaderboard(
  context: Devvit.Context,
  subredditId: string,
  username: string
) {
  return context.redis.zAdd(`leaderboard:${subredditId}`, {
    member: username,
    score: 1,
  });
}

export function incrementUserScoreOnSubredditLeaderboard(
  context: Devvit.Context,
  subredditId: string,
  username: string,
  increment: number
) {
  return context.redis.zIncrBy(
    `leaderboard:${subredditId}`,
    username,
    increment
  );
}

export function getTop100SubredditLeaderboard(
  context: Devvit.Context,
  subredditId: string
): Promise<
  {
    member: string;
    score: number;
  }[]
> {
  return context.redis.zRange(`leaderboard:${subredditId}`, 0, 99, {
    by: 'score',
  });
}

export function setUserSnoovatarUrl(
  context: Devvit.Context,
  username: string,
  snoovatarUrl: string
) {
  return context.redis.set(`snoovatar:${username}`, snoovatarUrl);
}

export function getUserSnoovatarUrl(
  context: Devvit.Context,
  username: string
): Promise<string | undefined> {
  return context.redis.get(`snoovatar:${username}`);
}

export async function batchGetUserSnoovatarUrls(
  context: Devvit.Context,
  usernames: string[]
): Promise<{ [username: string]: string | null }> {
  const results = await context.redis.mGet(
    usernames.map((username) => `snoovatar:${username}`)
  );

  return Object.fromEntries(
    usernames.map((username, index) => [username, results[index]])
  );
}

export function incrementGameCount(
  context: Devvit.Context | JobContext,
  subredditId: string
) {
  return context.redis.incrBy(`gameCount:${subredditId}`, 1);
}

export function getGameCount(
  context: Devvit.Context,
  subredditId: string
): Promise<number> {
  return context.redis
    .get(`gameCount:${subredditId}`)
    .then((count) => (count ? parseInt(count) : 0));
}
