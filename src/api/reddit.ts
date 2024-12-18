import { Devvit } from '@devvit/public-api';

export async function getSnoovatarUrl(context: Devvit.Context) {
  const currUser = await context.reddit.getCurrentUser();
  const snoovatarUrl = await currUser?.getSnoovatarUrl();
  return snoovatarUrl ?? null;
}
