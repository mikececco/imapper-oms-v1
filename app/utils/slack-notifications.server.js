import { WebClient } from '@slack/web-api';

export async function sendSlackNotification(message, error) {
  // Check if running in a server environment before attempting to send
  if (typeof window !== 'undefined') {
    console.warn('Attempted to send Slack notification from a non-server environment. Skipping.');
    return;
  }

  try {
    const token = process.env.SLACK_BOT_TOKEN;
    const channelId = process.env.SLACK_ERROR_CHANNEL_ID;
    const mentionUserId = process.env.SLACK_MENTION_USER_ID;

    if (!token || !channelId) {
      console.error('Slack token or channel ID is not configured. Please set SLACK_BOT_TOKEN and SLACK_ERROR_CHANNEL_ID environment variables.');
      return;
    }

    const web = new WebClient(token);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    const stackTrace = error instanceof Error && error.stack ? `\n\`\`\`${error.stack}\`\`\`` : '';

    let notificationText = '';
    if (mentionUserId) {
      notificationText += `<@${mentionUserId}> `;
    }
    notificationText += `🚨 Error in imapper-oms-v1 🚨\n*Message:* ${message}\n*Details:* ${errorMessage}${stackTrace}`;

    await web.chat.postMessage({
      channel: channelId,
      text: notificationText,
      mrkdwn: true,
    });
    console.log('Slack notification sent successfully.');
  } catch (slackError) {
    console.error('Error sending Slack notification:', slackError);
  }
} 