const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder,
  StringSelectMenuBuilder, ChannelType, SlashCommandBuilder, PermissionFlagsBits,
} = require('discord.js');
const store = require('../store');
const { COLORS, eph } = require('../util');

const LABELS = {
  ban: 'Ban', kick: 'Expulsion', timeout: 'Sourdine', unban: 'Débannissement',
  role_add: 'Rôle donné', role_remove: 'Rôle retiré',
};

// Enregistre un événement dans l'historique et le poste dans le salon de logs
async function record(guild, entry) {
  const cfg = store.get(guild.id);
  cfg.logs.history.push({ t: Date.now(), ...entry });
  if (cfg.logs.history.length > 50) cfg.logs.history.splice(0, cfg.logs.history.length - 50);
  store.save();
  if (!cfg.logs.channelId) return;
  const ch = await guild.channels.fetch(cfg.logs.channelId).catch(() => null);
  if (!ch?.isTextBased()) return;
  const embed = new EmbedBuilder()
    .setColor(entry.type.startsWith('role') || entry.type === 'unban' ? COLORS.green : COLORS.red)
    .setTitle(LABELS[entry.type] ?? entry.type)
    .setDescription(`<@${entry.userId}> (${entry.tag})`)
    .setTimestamp();
  if (entry.detail) embed.addFields({ name: 'Détail', value: String(entry.detail).slice(0, 1000) });
  ch.send({ embeds: [embed] }).catch(() => {});
}

function render(guildId) {
  const l = store.get(guildId).logs;
  const last = l.history.slice(-10).reverse();
  const embed = new EmbedBuilder()
    .setColor(COLORS.blurple)
    .setTitle('Logs et historique')
    .setDescription('Chaque ban, expulsion, sourdine et changement de rôle automatique est noté ici.')
    .addFields(
      { name: 'Salon de logs', value: l.channelId ? `<#${l.channelId}>` : 'Non défini' },
      {
        name: `Derniers événements (${l.history.length} gardés)`,
        value: last.length
          ? last.map((e) => `<t:${Math.floor(e.t / 1000)}:R> · ${LABELS[e.type] ?? e.type} · <@${e.userId}>`).join('\n')
          : 'Rien pour le moment.',
      },
    );

  const channel = new ChannelSelectMenuBuilder()
    .setCustomId('logs:channel').setPlaceholder('Choisir le salon de logs').setChannelTypes(ChannelType.GuildText);
  if (l.channelId) channel.setDefaultChannels(l.channelId);
  const rows = [new ActionRowBuilder().addComponents(channel)];

  const bans = [...new Map(l.history.filter((e) => e.type === 'ban').reverse().map((e) => [e.userId, e])).values()].slice(0, 25);
  if (bans.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('logs:unban').setPlaceholder('Annuler un ban…')
        .addOptions(bans.map((e) => ({ label: String(e.tag).slice(0, 100), value: e.userId, description: e.userId }))),
    ));
  }
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('logs:clear').setLabel('Vider l’historique').setStyle(ButtonStyle.Danger).setDisabled(!l.history.length),
  ));
  return { embeds: [embed], components: rows };
}

async function handle(i) {
  const l = store.get(i.guildId).logs;
  const act = i.customId.split(':')[1];
  if (i.isChannelSelectMenu() && act === 'channel') l.channelId = i.values[0];
  else if (i.isButton() && act === 'clear') l.history = [];
  else if (i.isStringSelectMenu() && act === 'unban') {
    const userId = i.values[0];
    const tag = l.history.find((e) => e.userId === userId)?.tag ?? userId;
    const ok = await i.guild.members.unban(userId, `Annulé par ${i.user.tag}`).then(() => true).catch(() => false);
    if (!ok) return i.reply({ content: 'Impossible de débannir (déjà débanni ou permission manquante).', ...eph });
    await record(i.guild, { type: 'unban', userId, tag, detail: `Par ${i.user.tag}` });
  }
  store.save();
  return i.update(render(i.guildId));
}

const command = new SlashCommandBuilder()
  .setName('logs').setDescription('Gérer les logs et l’historique du bot')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false);

module.exports = { name: 'logs', command, render, handle, record };
