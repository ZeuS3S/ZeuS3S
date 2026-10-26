const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType,
  SlashCommandBuilder, PermissionFlagsBits,
} = require('discord.js');
const store = require('../store');
const { COLORS, eph, dur, num } = require('../util');

const POT_URL = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1f36f.png';

function consequence(t) {
  if (t.action === 'ban') return `un **bannissement** immédiat${t.deleteSeconds ? ', et ses messages récents sont supprimés' : ''}`;
  if (t.action === 'kick') return 'une **expulsion** immédiate du serveur';
  return `une **mise en sourdine** de ${t.timeoutMinutes} minutes`;
}

// Message d'avertissement affiché dans le salon piège, avec le compteur de sanctions
function noticePayload(t) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.red)
    .setTitle('NE PAS ÉCRIRE DANS CE SALON')
    .setDescription(`Ce salon sert à repérer les bots de spam et les comptes piratés.\nTout message envoyé ici entraîne ${consequence(t)}.\n\nSi tu lis ceci, ne réponds pas et retourne dans un autre salon.`)
    .setThumbnail(POT_URL);
  const counter = new ButtonBuilder().setCustomId('piege:counter').setLabel(`Sanctions : ${t.count ?? 0}`)
    .setEmoji('🍯').setStyle(ButtonStyle.Secondary).setDisabled(true);
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(counter)] };
}

// Publie, met à jour ou retire le message d'avertissement. Renvoie false si le bot ne peut pas écrire dans le salon.
async function syncNotice(guild) {
  const t = store.get(guild.id).trap;
  const old = t.noticeChannelId && t.noticeMessageId
    ? await guild.channels.fetch(t.noticeChannelId).then((c) => c.messages.fetch(t.noticeMessageId)).catch(() => null)
    : null;
  if (!t.enabled || !t.channelId) {
    if (old) await old.delete().catch(() => {});
    t.noticeChannelId = t.noticeMessageId = null;
    store.save();
    return true;
  }
  const payload = noticePayload(t);
  if (old && old.channelId === t.channelId) return old.edit(payload).then(() => true).catch(() => false);
  if (old) await old.delete().catch(() => {});
  const ch = await guild.channels.fetch(t.channelId).catch(() => null);
  const msg = ch?.isTextBased() ? await ch.send(payload).catch(() => null) : null;
  if (!msg) return false;
  t.noticeChannelId = ch.id;
  t.noticeMessageId = msg.id;
  store.save();
  return true;
}

const ACTIONS = { ban: 'Ban', kick: 'Expulsion', timeout: 'Sourdine' };

function render(guildId) {
  const t = store.get(guildId).trap;
  const embed = new EmbedBuilder()
    .setColor(t.enabled ? COLORS.red : COLORS.grey)
    .setTitle('Salon piège')
    .setDescription('Toute personne qui écrit dans le salon piège subit l’action choisie. Le staff (Gérer les messages ou Bannir des membres) est toujours ignoré.')
    .addFields(
      { name: 'Statut', value: t.enabled ? 'Actif' : 'Inactif', inline: true },
      { name: 'Salon', value: t.channelId ? `<#${t.channelId}>` : 'Non défini', inline: true },
      { name: 'Action', value: ACTIONS[t.action] + (t.action === 'timeout' ? ` (${t.timeoutMinutes} min)` : ''), inline: true },
      { name: 'Messages supprimés au ban', value: dur(t.deleteSeconds), inline: true },
      { name: 'Sanctions données', value: String(t.count ?? 0), inline: true },
      { name: 'Avertissement dans le salon', value: t.noticeMessageId ? 'Publié' : 'Non publié', inline: true },
      { name: 'Rôles ignorés', value: t.exemptRoles.length ? t.exemptRoles.map((r) => `<@&${r}>`).join(' ') : 'Aucun' },
    );

  const channel = new ChannelSelectMenuBuilder()
    .setCustomId('piege:channel').setPlaceholder('Choisir le salon piège').setChannelTypes(ChannelType.GuildText);
  if (t.channelId) channel.setDefaultChannels(t.channelId);

  const action = new StringSelectMenuBuilder().setCustomId('piege:action').setPlaceholder('Action')
    .addOptions(Object.entries(ACTIONS).map(([value, label]) => ({ label, value, default: value === t.action })));

  const roles = new RoleSelectMenuBuilder().setCustomId('piege:roles').setPlaceholder('Rôles ignorés par le piège')
    .setMinValues(0).setMaxValues(10);
  if (t.exemptRoles.length) roles.setDefaultRoles(...t.exemptRoles);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(channel),
      new ActionRowBuilder().addComponents(action),
      new ActionRowBuilder().addComponents(roles),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('piege:toggle').setLabel(t.enabled ? 'Désactiver' : 'Activer')
          .setStyle(t.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('piege:duration').setLabel('Durées').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('piege:publish').setLabel('Publier l’avertissement').setStyle(ButtonStyle.Secondary)
          .setDisabled(!t.enabled || !t.channelId),
      ),
    ],
  };
}

function durationModal(t) {
  const input = (id, label, value) => new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setValue(String(value)).setRequired(true),
  );
  return new ModalBuilder().setCustomId('piege:durationModal').setTitle('Durées du piège').addComponents(
    input('hours', 'Heures supprimées au ban (0 à 168)', Math.round((t.deleteSeconds / 3600) * 10) / 10),
    input('minutes', 'Minutes de sourdine (1 à 40320)', t.timeoutMinutes),
  );
}

async function handle(i) {
  const t = store.get(i.guildId).trap;
  const act = i.customId.split(':')[1];
  if (i.isChannelSelectMenu() && act === 'channel') t.channelId = i.values[0];
  else if (i.isStringSelectMenu() && act === 'action') t.action = i.values[0];
  else if (i.isRoleSelectMenu() && act === 'roles') t.exemptRoles = i.values;
  else if (i.isButton() && act === 'toggle') {
    if (!t.enabled && !t.channelId) return i.reply({ content: 'Choisis d’abord un salon piège.', ...eph });
    t.enabled = !t.enabled;
  } else if (i.isButton() && act === 'duration') return i.showModal(durationModal(t));
  else if (i.isButton() && act === 'publish') {
    if (!(await syncNotice(i.guild))) {
      return i.reply({ content: 'Je ne peux pas écrire dans ce salon : vérifie mes permissions « Envoyer des messages » et « Intégrer des liens ».', ...eph });
    }
    return i.update(render(i.guildId));
  }
  else if (i.isModalSubmit() && act === 'durationModal') {
    const hours = num(i.fields.getTextInputValue('hours'), 0, 168);
    const minutes = num(i.fields.getTextInputValue('minutes'), 1, 40320);
    if (hours === null || minutes === null) return i.reply({ content: 'Entre des nombres valides.', ...eph });
    t.deleteSeconds = Math.round(hours * 3600);
    t.timeoutMinutes = Math.round(minutes);
  }
  store.save();
  await syncNotice(i.guild); // garde l'avertissement à jour (salon, action ou durée changés)
  return i.update(render(i.guildId));
}

const command = new SlashCommandBuilder()
  .setName('piege').setDescription('Configurer le salon piège')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false);

module.exports = { name: 'piege', command, render, handle, syncNotice };
