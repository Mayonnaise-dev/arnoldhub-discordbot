import { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { config } from 'dotenv';
import { GameDig } from 'gamedig';;

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const TOKEN = process.env.DISCORD_TOKEN;

let statusMessage;

// Load and parse KSF map data from external source
const fs = require('fs').promises;
const path = require('path');

async function loadMapData() {
  try {
    // Construct the path to the file located in the same directory as this script
    const filePath = path.join(__dirname, 'surf_.json');

    // Read the file and parse the JSON
    const fileContent = await fs.readFile(filePath, 'utf8');
    const mapData = JSON.parse(fileContent);

    return mapData;

  } catch (error) {
    console.error('❌ Failed to load local map data:', error);
    return {};
  }
}

async function updateServerStatus() {
  try {
    // Repo URL from the C# snippet
    const mapImageRepoUrl = "https://raw.githubusercontent.com/Letaryat/poor-sharptimermappics/main/pics/";

    const logoFile = new AttachmentBuilder('./assets/arnoldhublogo.png');

    const state = await GameDig.query({
      type: 'cs2',
      host: 'surf.arnoldhub.com',
      port: 27015
    });

    const mapData = await loadMapData();
    const mapInfo = mapData[state.map.toLowerCase()] || null;

    const embed = new EmbedBuilder()
      .setTitle('Arnoldhub')
      .setColor('DarkBlue')
      .setImage(`${mapImageRepoUrl}${state.map}.jpg`)
      .setThumbnail('attachment://arnoldhublogo.png')
      .addFields(
        { name: 'Map', value: state.map, inline: true },
        { name: 'Players', value: `${state.players.length}/64`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Connect: connect surf.arnoldhub.com` });

    // UPDATED: Only displays Tier and Type (Capitalized to match your JSON)
    if (mapInfo) {
      embed.addFields({
        name: 'Map Info',
        value: `**Tier**: ${mapInfo.Tier}\n**Type**: ${mapInfo.Type}`,
        inline: false
      });
    } else {
      embed.addFields({
        name: 'Map Info',
        value: 'No info found for this map in local database.',
        inline: false
      });
    }

    if (state.players.length > 0) {
      const players = state.players
        .map(p => `• ${p.name || 'Unnamed'}${p.score !== undefined ? ` - Score: ${p.score}` : ''}`)
        .slice(0, 20);

      embed.addFields({ name: 'Players Online', value: players.join('\n') });
    } else {
      embed.addFields({ name: 'Players Online', value: 'No players currently online' });
    }

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!statusMessage) {
      statusMessage = await channel.send({
        embeds: [embed],
        files: [logoFile]
      });
    } else {
      await statusMessage.edit({
        embeds: [embed],
        files: [logoFile]
      });
    }

  } catch (err) {
    console.error('Error fetching server info:', err);
  }
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  updateServerStatus();
  setInterval(updateServerStatus, 60 * 1000);
});

client.login(TOKEN);
