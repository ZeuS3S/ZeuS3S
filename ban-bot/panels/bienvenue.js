const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ModalBuilder,
  TextInputBuilder, TextInputStyle, ChannelType, SlashCommandBuilder, PermissionFlagsBits,
} = require('discord.js');
const store = require('../store');
const { COLORS, eph } = require('../util');

const fmt = (text, member) => text
  .replaceAll('{user}', member.user.username)
  .replaceAll('{mention}', `<@${member.id}>`)
  .replaceAll('{server}', member.guild.name)
  .replaceAll('{count}', String(member.guild.memberCount));

function welcomeEmbed(w, member) {
  return new EmbedBuilder().setColor(COLORS.green).setTitle(fmt(w.title, member).slice(0, 256))
    .setDescription(fmt(w.message, member).slice(0, 4000)).setThumbnail(member.displayAvatarURL()).setTimestamp();
}

function render(guildId) {
  const w = store.get(guildId).welcome;
  const embed = new EmbedBuilder()
    .setColor(w.enabled ? COLORS.green : COLORS.grey)
    .setTitle('Message de bienvenue')
    .setDescription('Envoyé dans le salon choisi à chaque arrivée. Variables : `{user}` `{mention}` `{server}` `{count}`.')
    .addFields(
      { name: 'Statut', value: w.enabled ? 'Actif' : 'Inactif', inline: true },
      { name: 'Salon', value: w.channelId ? `<#${w.channelId}>` : 'Non défini', inline: true },
      { name: 'Titre', value: w.title.slice(0, 256) },
      { name: 'Message', value: w.message.slice(0, 1000) },
    );
  const channel = new ChannelSelectMenuBuilder()
    .setCustomId('bienvenue:channel').setPlaceholder('Choisir le salon de bienvenue').setChannelTypes(ChannelType.GuildText);
  if (w.channelId) channel.setDefaultChannels(w.channelId);
  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(channel),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bienvenue:toggle').setLabel(w.enabled ? 'Désactiver' : 'Activer')
          .setStyle(w.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('bienvenue:edit').setLabel('Modifier le texte').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('bienvenue:preview').setLabel('Aperçu').setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
}

async function handle(i) {
  const w = store.get(i.guildId).welcome;
  const act = i.customId.split(':')[1];
  if (i.isChannelSelectMenu() && act === 'channel') w.channelId = i.values[0];
  else if (i.isButton() && act === 'toggle') {
    if (!w.enabled && !w.channelId) return i.reply({ content: 'Choisis d’abord un salon.', ...eph });
    w.enabled = !w.enabled;
  } else if (i.isButton() && act === 'preview') {
    return i.reply({ embeds: [welcomeEmbed(w, i.member)], ...eph });
  } else if (i.isButton() && act === 'edit') {
    return i.showModal(new ModalBuilder().setCustomId('bienvenue:editModal').setTitle('Message de bienvenue').addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Titre')
        .setStyle(TextInputStyle.Short).setMaxLength(200).setValue(w.title).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('message').setLabel('Message')
        .setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setValue(w.message).setRequired(true)),
    ));
  } else if (i.isModalSubmit() && act === 'editModal') {
    w.title = i.fields.getTextInputValue('title');
    w.message = i.fields.getTextInputValue('message');
  }
  store.save();
  return i.update(render(i.guildId));
}

async function onJoin(member) {
  const w = store.get(member.guild.id).welcome;
  if (!w.enabled || !w.channelId) return;
  const ch = await member.guild.channels.fetch(w.channelId).catch(() => null);
  if (ch?.isTextBased()) ch.send({ content: `<@${member.id}>`, embeds: [welcomeEmbed(w, member)] }).catch(() => {});
}

const command = new SlashCommandBuilder()
  .setName('bienvenue').setDescription('Configurer le message de bienvenue')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false);

module.exports = { name: 'bienvenue', command, render, handle, onJoin };
