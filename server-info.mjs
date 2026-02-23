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

let statusMessage;

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
      .setURL(`https://surf.arnoldhub.com/map/${state.map}`)
      .setColor("DarkBlue")
      .setImage(`${mapImageRepoUrl}${state.map}.jpg`)
      .setThumbnail("attachment://arnoldhublogo.png")
      .addFields(
        { name: "Map", value: state.map, inline: true },
        { name: "Players", value: `${state.players.length}/64`, inline: true },
      )
      .setTimestamp()
      .setFooter({
        text: `Click title to view map on webpanel`,
      });

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

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!statusMessage) {
      statusMessage = await channel.send({
        embeds: [embed],
        files: [logoFile],
      });
    } else {
      await statusMessage.edit({
        embeds: [embed],
        files: [logoFile],
      });
    }
  } catch (err) {
    console.error("Error fetching server info:", err);
  }
}

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  console.log(`📡 Monitoring server: ${SERVER_HOST}:${SERVER_PORT}`);
  console.log(`📢 Posting updates to channel: ${CHANNEL_ID}`);
  console.log(`⏱️  Update interval: ${UPDATE_INTERVAL / 1000} seconds`);
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
