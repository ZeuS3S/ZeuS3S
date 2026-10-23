require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const { DISCORD_TOKEN, TRAP_CHANNEL_ID, LOG_CHANNEL_ID } = process.env;
const DELETE_SECONDS = Math.min(Number(process.env.DELETE_SECONDS ?? 3600), 604800);

if (!DISCORD_TOKEN || !TRAP_CHANNEL_ID) {
  console.error('DISCORD_TOKEN et TRAP_CHANNEL_ID sont obligatoires (voir .env.example).');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('clientReady', () => console.log(`Connecté en tant que ${client.user.tag}`));

client.on('messageCreate', async (message) => {
  if (message.channelId !== TRAP_CHANNEL_ID) return;
  if (!message.guild || message.author.bot) return;

  const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (!member) return;

  // Ne jamais bannir le staff
  if (member.permissions.has(PermissionFlagsBits.ManageMessages) || member.permissions.has(PermissionFlagsBits.BanMembers)) return;

  if (!member.bannable) {
    console.warn(`Impossible de bannir ${message.author.tag} (rôle trop haut ou permission manquante).`);
    return;
  }

  try {
    await member.ban({ deleteMessageSeconds: DELETE_SECONDS, reason: 'A écrit dans le salon piège' });
    console.log(`Banni : ${message.author.tag} (${message.author.id})`);

    if (LOG_CHANNEL_ID) {
      const log = await message.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (log?.isTextBased()) {
        await log.send({
          embeds: [new EmbedBuilder()
            .setColor(0xd9534f)
            .setTitle('Membre banni (salon piège)')
            .addFields(
              { name: 'Utilisateur', value: `${message.author.tag} (${message.author.id})` },
              { name: 'Message', value: (message.content || '*vide*').slice(0, 1000) },
            )
            .setTimestamp()],
        });
      }
    }
  } catch (err) {
    console.error('Échec du ban :', err);
  }
});

client.login(DISCORD_TOKEN);
