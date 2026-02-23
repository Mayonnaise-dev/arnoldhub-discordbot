import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import { config } from "dotenv";
import { GameDig } from "gamedig";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

config();

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
  console.error("❌ Error: DISCORD_TOKEN is required in .env file");
  process.exit(1);
}

if (!process.env.CHANNEL_ID) {
  console.error("❌ Error: CHANNEL_ID is required in .env file");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const TOKEN = process.env.DISCORD_TOKEN;
const SERVER_HOST = process.env.SERVER_HOST || "surfing.arnoldhub.com";
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 27015;
const SERVER_TYPE = process.env.SERVER_TYPE || "csgo";
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL) || 60000;
const WEBPANEL_MAP_BASE_URL = process.env.WEBPANEL_MAP_BASE_URL;
const SERVER_MAX_PLAYERS = parseInt(process.env.SERVER_MAX_PLAYERS) || 64;
const MESSAGE_ID_FILE = path.join(__dirname, "message-state.json");

let statusMessage;

async function loadMessageState() {
  try {
    const data = await fs.readFile(MESSAGE_ID_FILE, "utf8");
    const state = JSON.parse(data);
    console.log(`📂 Loaded message state from file:`, state);
    return state;
  } catch (error) {
    console.log("📂 No previous message state found");
    return null;
  }
}

async function saveMessageState(messageId, channelId) {
  try {
    const state = {
      messageId,
      channelId,
      lastUpdated: new Date().toISOString(),
    };
    await fs.writeFile(MESSAGE_ID_FILE, JSON.stringify(state, null, 2), "utf8");
    console.log(`💾 Saved message state:`, state);
  } catch (error) {
    console.error("❌ Failed to save message state:", error);
  }
}

async function loadMapData() {
  try {
    const filePath = path.join(__dirname, "surf_.json");

    const fileContent = await fs.readFile(filePath, "utf8");
    const mapData = JSON.parse(fileContent);

    return mapData;
  } catch (error) {
    console.error("❌ Failed to load local map data:", error);
    return {};
  }
}

async function updateServerStatus() {
  try {
    const mapImageRepoUrl =
      "https://raw.githubusercontent.com/Letaryat/poor-sharptimermappics/main/pics/";

    const logoPath = path.join(__dirname, "assets", "arnoldhublogo.png");
    const logoFile = new AttachmentBuilder(logoPath);

    const state = await GameDig.query({
      type: SERVER_TYPE,
      host: SERVER_HOST,
      port: SERVER_PORT,
    });

    const mapData = await loadMapData();
    const mapInfo = mapData[state.map.toLowerCase()] || null;

    const embed = new EmbedBuilder()
      .setTitle("Arnoldhub")
      .setColor("DarkBlue")
      .setImage(`${mapImageRepoUrl}${state.map}.jpg`)
      .setThumbnail("attachment://arnoldhublogo.png")
      .addFields(
        { name: "Map", value: state.map, inline: true },
        {
          name: "Players",
          value: `${state.players.length}/${SERVER_MAX_PLAYERS}`,
          inline: true,
        },
      )
      .setTimestamp();

    if (WEBPANEL_MAP_BASE_URL) {
      embed.setURL(`${WEBPANEL_MAP_BASE_URL}${state.map}`).setFooter({
        text: `Click title to view map on webpanel`,
      });
    }

    if (mapInfo) {
      embed.addFields({
        name: "Map Info",
        value: `**Tier**: ${mapInfo.Tier}\n**Type**: ${mapInfo.Type}`,
        inline: false,
      });
    } else {
      embed.addFields({
        name: "Map Info",
        value: "No info found for this map in local database.",
        inline: false,
      });
    }

    embed.addFields({
      name: "Connect Info",
      value: `connect ${SERVER_HOST}`,
      inline: false,
    });

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!statusMessage) {
      console.log("📤 Creating new status message...");
      statusMessage = await channel.send({
        embeds: [embed],
        files: [logoFile],
      });
      await saveMessageState(statusMessage.id, CHANNEL_ID);
      console.log(`✅ Created new message with ID: ${statusMessage.id}`);
    } else {
      console.log(`🔄 Updating existing message: ${statusMessage.id}`);
      await statusMessage.edit({
        embeds: [embed],
        files: [logoFile],
      });
    }
  } catch (err) {
    console.error("Error fetching server info:", err);
  }
}

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  console.log(`📡 Monitoring server: ${SERVER_HOST}:${SERVER_PORT}`);
  console.log(`📢 Posting updates to channel: ${CHANNEL_ID}`);
  console.log(`⏱️  Update interval: ${UPDATE_INTERVAL / 1000} seconds`);

  // Try to load existing message state
  const savedState = await loadMessageState();
  if (
    savedState &&
    savedState.messageId &&
    savedState.channelId === CHANNEL_ID
  ) {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      statusMessage = await channel.messages.fetch(savedState.messageId);
      console.log(
        `✅ Found and will update existing message: ${savedState.messageId}`,
      );
    } catch (error) {
      console.log("⚠️  Previous status message not found, will create new one");
      console.log("   Error:", error.message);
      statusMessage = null;
    }
  } else if (savedState && savedState.channelId !== CHANNEL_ID) {
    console.log(
      `⚠️  Saved message was for different channel, will create new one`,
    );
    statusMessage = null;
  }

  updateServerStatus();
  setInterval(updateServerStatus, UPDATE_INTERVAL);
});

client.on("error", (error) => {
  console.error("❌ Discord client error:", error);
});

client.login(TOKEN).catch((error) => {
  console.error("❌ Failed to login to Discord:", error);
  process.exit(1);
});
