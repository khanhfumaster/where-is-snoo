import './createPost.js';

import { Devvit, useState } from '@devvit/public-api';
import { distanceToPoints } from './game.js';
import {
  GameData,
  GameGuess,
  getAllGameGuesses,
  getGameDataByPostId,
  getGameGuess,
  incrementUserScoreOnSubredditLeaderboard,
  setGameGuess,
} from './api/store.js';

// Defines the messages that are exchanged between Devvit and Web View
type WebViewMessage =
  | {
      type: 'initialData';
      data: {
        username: string;
        snoovatarUrl: string;
        guess: GameGuess | null;
        actual: { lat: number; lng: number } | null | undefined;
      };
    }
  | {
      type: 'submitGuess';
      data: { lat: number; lng: number };
    };

Devvit.configure({
  media: true,
  redditAPI: true,
  redis: true,
});

// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: 'Webview Example',
  height: 'tall',
  render: (context) => {
    // Load username with `useAsync` hook
    const [username] = useState(async () => {
      const currUser = await context.reddit.getCurrentUser();
      return currUser?.username ?? 'anon';
    });

    const [snoovatarUrl] = useState<string | null>(async () => {
      const currUser = await context.reddit.getCurrentUser();
      const snoovatarUrl = await currUser?.getSnoovatarUrl();
      return snoovatarUrl ?? null;
    });

    const [postData] = useState<GameData | null>(async () => {
      return await getGameDataByPostId(context, context.postId!);
    });

    const [guess, setLocalGuess] = useState<GameGuess | null>(async () => {
      const _guess = await getGameGuess(context, context.postId!, username);

      return _guess;
    });

    const [allGameGuesses, setAllGameGuesses] = useState<{
      [username: string]: GameGuess;
    } | null>(async () => {
      const _allGuesses = await getAllGameGuesses(context, context.postId!);
      return _allGuesses;
    });

    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardPageNumber, setLeaderboardPageNumber] = useState(1);
    const [showLocationOnResultsScreen, setShowLocationOnResultsScreen] =
      useState(false);

    const [webviewVisible, setWebviewVisible] = useState(true);
    const [webviewExpanded, setWebviewExpanded] = useState(false);

    const onMessage = async (msg: WebViewMessage) => {
      if (!postData) {
        return;
      }

      switch (msg.type) {
        case 'submitGuess':
          const { lat, lng } = msg.data;

          // Calculate the distance between the guess and the actual location
          const distance = Math.sqrt(
            Math.pow(lat - postData.coordinates.lat, 2) +
              Math.pow(lng - postData.coordinates.lng, 2)
          );

          // distance in degrees is not very useful, convert to meters
          const distanceInMeters = distance * 111_000;

          // humanize the distance
          let distanceString = '';
          if (distanceInMeters < 1_000) {
            distanceString = `${distanceInMeters.toFixed(2)} meters`;
          } else {
            distanceString = `${(distanceInMeters / 1_000).toFixed(2)} km`;
          }

          const points = distanceToPoints(distanceInMeters);

          const gameGuess = {
            lat,
            lng,
            username,
            snoovatarUrl: snoovatarUrl ?? '',
            points,
            distanceString,
          };

          await setGameGuess(context, context.postId!, username, gameGuess);

          setAllGameGuesses((prev) => ({
            ...prev,
            [username]: gameGuess,
          }));

          setLocalGuess(gameGuess);

          await incrementUserScoreOnSubredditLeaderboard(
            context,
            context.subredditId,
            username,
            points
          );

          context.ui.webView.postMessage('mapWebView', {
            type: 'showResults',
            data: {
              guess: gameGuess,
              actual: postData.coordinates,
            },
          });

          // Show a toast with the distance
          context.ui.showToast({
            text: `Your guess is ${distanceString} away from the correct location`,
          });

          break;
        case 'initialData':
          context.ui.webView.postMessage('mapWebView', {
            type: 'initialData',
            data: {
              username: username,
              snoovatarUrl: snoovatarUrl ?? '',
              ...(guess ? { guess, actual: postData?.coordinates } : {}),
              allGameGuesses,
            },
          });
          break;

        default:
          throw new Error(`Unknown message type: ${msg satisfies never}`);
      }
    };

    // When the button is clicked, send initial data to web view and show it
    const toggleWebviewVisibility = () => {
      setWebviewVisible(!webviewVisible);
    };

    const onSubmitGuess = async () => {
      context.ui.webView.postMessage('mapWebView', {
        type: 'submitGuess',
      });
    };

    if (!postData) {
      return <text>Loading...</text>;
    }

    if (guess) {
      return (
        <vstack grow={true} height={'100%'} alignment="middle center">
          <zstack grow padding="small" height={'100%'} width="100%">
            <image
              url={postData.streetViewMediaAsset.mediaUrl}
              height="100%"
              width="100%"
              imageWidth={postData.streetViewImageData.width}
              imageHeight={postData.streetViewImageData.height}
              resizeMode="cover"
            />

            {!showLocationOnResultsScreen && (
              <vstack
                height="100%"
                width="100%"
                alignment="center middle"
                gap="small"
              >
                <hstack gap="medium" width="90%" height="70%">
                  <vstack
                    height={'100%'}
                    width={showLeaderboard ? '60%' : '100%'}
                    cornerRadius="medium"
                  >
                    <webview
                      url="page.html"
                      id="mapWebView"
                      grow
                      height={'100%'}
                      width={'100%'}
                      onMessage={(msg) => onMessage(msg as WebViewMessage)}
                    />
                  </vstack>

                  {showLeaderboard && (
                    <vstack
                      height={'100%'}
                      width={'40%'}
                      cornerRadius="medium"
                      backgroundColor="black"
                      gap="small"
                      padding="medium"
                    >
                      <text style="heading">
                        🏆 Leaderboard (
                        {Object.keys(allGameGuesses ?? {}).length})
                      </text>
                      <vstack gap="small">
                        {Object.entries(allGameGuesses ?? {})
                          .sort(([, a], [, b]) => b.points - a.points)
                          .slice(
                            (leaderboardPageNumber - 1) * 5,
                            leaderboardPageNumber * 5
                          )
                          .map(([un, guess]) => (
                            <hstack
                              key={un}
                              gap="small"
                              padding="small"
                              backgroundColor={
                                un === username ? 'orange' : 'black'
                              }
                              cornerRadius="small"
                            >
                              <image
                                url={guess.snoovatarUrl}
                                imageHeight={20}
                                imageWidth={20}
                              />
                              <text size="small">
                                u/{un} - {guess.points} points
                              </text>
                            </hstack>
                          ))}
                      </vstack>

                      <hstack gap="small">
                        <button
                          size="small"
                          appearance="plain"
                          onPress={() =>
                            setLeaderboardPageNumber(leaderboardPageNumber - 1)
                          }
                          disabled={leaderboardPageNumber === 1}
                        >
                          Previous
                        </button>
                        <button
                          size="small"
                          appearance="plain"
                          onPress={() =>
                            setLeaderboardPageNumber(leaderboardPageNumber + 1)
                          }
                          disabled={
                            leaderboardPageNumber * 5 >=
                            Object.keys(allGameGuesses ?? {}).length
                          }
                        >
                          Next
                        </button>
                      </hstack>
                    </vstack>
                  )}
                </hstack>

                <hstack width="90%" gap="small">
                  <vstack
                    padding="medium"
                    alignment="center"
                    gap="small"
                    width="75%"
                    backgroundColor="black"
                    border="thick"
                    cornerRadius="medium"
                  >
                    <text style="heading" weight="bold" color="orange">
                      {guess.points} points
                    </text>

                    <vstack
                      backgroundColor="#FFD5C6"
                      cornerRadius="full"
                      width="100%"
                    >
                      <hstack
                        backgroundColor="#D93A00"
                        width={`${(guess.points / 5000) * 100}%`}
                      >
                        <spacer size="medium" shape="square" />
                      </hstack>
                    </vstack>

                    <text>
                      Your guess was {guess.distanceString} from the correct
                      location.
                    </text>
                  </vstack>

                  <vstack
                    padding="medium"
                    alignment="center"
                    gap="small"
                    width="25%"
                    backgroundColor="black"
                    border="thick"
                    cornerRadius="medium"
                  >
                    <button
                      size="small"
                      appearance="plain"
                      onPress={() => setShowLeaderboard(!showLeaderboard)}
                    >
                      {showLeaderboard ? 'Hide' : 'Show'} leaderboard
                    </button>
                    <button
                      size="small"
                      appearance="plain"
                      onPress={() => setShowLocationOnResultsScreen(true)}
                    >
                      View location
                    </button>
                  </vstack>
                </hstack>
              </vstack>
            )}

            {showLocationOnResultsScreen && (
              <vstack
                height="100%"
                width="100%"
                alignment="end bottom"
                padding="medium"
                gap="medium"
              >
                <button
                  size="small"
                  appearance="primary"
                  onPress={() => setShowLocationOnResultsScreen(false)}
                >
                  Back to results
                </button>
              </vstack>
            )}
          </zstack>
        </vstack>
      );
    }

    return (
      <vstack grow={true} height={'100%'} alignment="middle center">
        <zstack grow padding="small" height={'100%'} width="100%">
          <image
            url={postData.streetViewMediaAsset.mediaUrl}
            height="100%"
            width="100%"
            imageWidth={postData.streetViewImageData.width}
            imageHeight={postData.streetViewImageData.height}
            resizeMode="cover"
          />

          <vstack
            height="100%"
            width="100%"
            alignment={webviewExpanded ? 'center middle' : 'end bottom'}
            padding="medium"
            gap="medium"
          >
            {webviewVisible && (
              <vstack
                height={webviewExpanded ? '80%' : '50%'}
                width={webviewExpanded ? '70%' : '50%'}
                cornerRadius="medium"
                gap="small"
              >
                <webview
                  url="page.html"
                  id="mapWebView"
                  grow
                  height={'100%'}
                  width={'100%'}
                  onMessage={(msg) => onMessage(msg as WebViewMessage)}
                />
              </vstack>
            )}

            <hstack gap="small">
              {webviewVisible && (
                <button
                  size="medium"
                  width="70%"
                  appearance="success"
                  onPress={onSubmitGuess}
                >
                  📍 Submit guess
                </button>
              )}

              {!webviewExpanded && (
                <button
                  size="medium"
                  appearance="primary"
                  onPress={toggleWebviewVisibility}
                >
                  {webviewVisible ? 'Hide' : 'Show'} map
                </button>
              )}

              {webviewVisible && (
                <button
                  size="medium"
                  appearance="primary"
                  onPress={() => setWebviewExpanded(!webviewExpanded)}
                >
                  {webviewExpanded ? 'Shrink' : 'Expand'} map
                </button>
              )}
            </hstack>
          </vstack>
        </zstack>
      </vstack>
    );
  },
});

export default Devvit;
