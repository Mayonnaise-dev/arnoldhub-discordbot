import { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { config } from 'dotenv';
import { GameDig } from 'gamedig';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const TOKEN = process.env.DISCORD_TOKEN;

let statusMessage;

async function loadMapData() {
  try {
    const filePath = path.join(__dirname, 'surf_.json');

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
    const mapImageRepoUrl = "https://raw.githubusercontent.com/Letaryat/poor-sharptimermappics/main/pics/";

    const logoPath = path.join(__dirname, 'assets', 'arnoldhublogo.png');
    const logoFile = new AttachmentBuilder(logoPath);

    const state = await GameDig.query({
      type: 'csgo',
      host: 'surf.arnoldhub.com',
      port: 27015
    });

    console.log('✅ Fetched server info:', state.players);
    console.log('✅ Fetched server info:', state.players[0].raw);

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