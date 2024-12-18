import { Devvit, JobContext } from '@devvit/public-api';
import { getImageGeometryData, getRandomStreetViewImage } from './api/map.js';
import { incrementGameCount, setGameDataByPostId } from './api/store.js';

// Configure Devvit's plugins
Devvit.configure({
  redditAPI: true,
  http: true,
  media: true,
  redis: true,
});

Devvit.addSchedulerJob({
  name: 'daily-where-is-snoo-post',
  onRun: async (event, context) => {
    if (!event.data?.subredditName) {
      return;
    }

    return createWhereIsSnooPost(context, (event.data as any).subredditName);
  },
});

async function createWhereIsSnooPost(
  context: Devvit.Context | JobContext,
  subredditName: string
) {
  const streetViewImageData = await getRandomStreetViewImage();
  const streetViewMediaAsset = await context.media.upload({
    url: streetViewImageData.thumb_1024_url,
    type: 'image',
  });

  const coordinates = await getImageGeometryData(streetViewImageData.id);

  const gameCount = await incrementGameCount(context, context.subredditId);

  const post = await context.reddit.submitPost({
    title: `Where is Snoo? #${gameCount}`,
    subredditName,
    preview: (
      <vstack grow={true} height={'100%'} alignment="middle center">
        <zstack grow padding="small" height={'100%'} width="100%">
          <image
            url={streetViewMediaAsset.mediaUrl}
            height="100%"
            width="100%"
            imageWidth={streetViewImageData.width}
            imageHeight={streetViewImageData.height}
            resizeMode="cover"
          />
        </zstack>
      </vstack>
    ),
  });

  await setGameDataByPostId(context, post.id, {
    streetViewImageData,
    streetViewMediaAsset,
    coordinates,
  });

  if ('ui' in context) {
    context.ui.navigateTo(post);
  }
}

Devvit.addMenuItem({
  label: 'Create a "Where is Snoo?" post',
  forUserType: 'moderator',
  location: 'subreddit',
  onPress: async (event, context) => {
    const subreddit = await context.reddit.getCurrentSubreddit();
    await createWhereIsSnooPost(context, subreddit.name);
  },
});

Devvit.addMenuItem({
  label: 'Start daily "Where is Snoo?" posts',
  forUserType: 'moderator',
  location: 'subreddit',
  onPress: async (event, context) => {
    const jobs = await context.scheduler.listJobs();

    if (jobs.some((job) => job.name === 'daily-where-is-snoo-post')) {
      context.ui.showToast('Daily "Where is Snoo?" posts are already running');
      return;
    }

    const subreddit = await context.reddit.getCurrentSubreddit();

    await context.scheduler.runJob({
      name: 'daily-where-is-snoo-post',
      cron: '0 6 * * *',
      data: {
        subredditName: subreddit.name,
      },
    });

    context.ui.showToast('Started daily "Where is Snoo?" posts');
  },
});

Devvit.addMenuItem({
  label: 'Stop daily "Where is Snoo?" posts',
  forUserType: 'moderator',
  location: 'subreddit',
  onPress: async (_, context) => {
    const jobs = await context.scheduler.listJobs();

    const job = jobs.find((job) => job.name === 'daily-where-is-snoo-post');

    if (!job) {
      context.ui.showToast('Not running daily posts');
      return;
    }

    await context.scheduler.cancelJob(job.id);
    context.ui.showToast('Stopped daily "Where is Snoo?" posts');
  },
});
