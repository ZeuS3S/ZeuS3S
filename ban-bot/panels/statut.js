const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder, StringSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, PermissionFlagsBits,
} = require('discord.js');
const store = require('../store');
const { COLORS, eph } = require('../util');

const pending = new Map(); // userId -> mot-clé saisi, en attente du choix du rôle

function render(guildId) {
  const rules = store.get(guildId).statusRules;
  const embed = new EmbedBuilder()
    .setColor(COLORS.blurple)
    .setTitle('Rôle selon le statut')
    .setDescription('Un membre dont le statut personnalisé contient le texte reçoit le rôle. Il le perd quand le texte disparaît. Il doit être en ligne, pas en invisible.')
    .addFields({
      name: `Règles (${rules.length})`,
      value: rules.length ? rules.map((r, n) => `${n + 1}. \`${r.keyword}\` → <@&${r.roleId}>`).join('\n') : 'Aucune règle pour le moment.',
    });
  const rows = [];
  if (rules.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('statut:delsel').setPlaceholder('Supprimer des règles…')
        .setMinValues(1).setMaxValues(Math.min(rules.length, 25))
        .addOptions(rules.slice(0, 25).map((r, n) => ({ label: `${n + 1}. ${r.keyword}`.slice(0, 100), value: String(n) }))),
    ));
  }
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('statut:add').setLabel('Ajouter une règle').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('statut:sync').setLabel('Resynchroniser').setStyle(ButtonStyle.Secondary).setDisabled(!rules.length),
  ));
  return { embeds: [embed], components: rows };
}

function rolePrompt(keyword) {
  return {
    embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('Ajouter une règle')
      .setDescription(`Texte à trouver : \`${keyword}\`\nChoisis maintenant le rôle à donner.`)],
    components: [
      new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('statut:addRole').setPlaceholder('Rôle à donner')),
      new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('statut:cancel').setLabel('Annuler').setStyle(ButtonStyle.Secondary)),
    ],
  };
}

async function handle(i, ctx) {
  const g = store.get(i.guildId);
  const act = i.customId.split(':')[1];
  if (i.isButton() && act === 'add') {
    return i.showModal(new ModalBuilder().setCustomId('statut:addModal').setTitle('Ajouter une règle de statut').addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('keyword').setLabel('Texte à trouver dans le statut')
          .setPlaceholder('discord.gg/movixfr').setStyle(TextInputStyle.Short).setMaxLength(60).setRequired(true),
      ),
    ));
  }
  if (i.isModalSubmit() && act === 'addModal') {
    const keyword = i.fields.getTextInputValue('keyword').trim();
    if (!keyword) return i.reply({ content: 'Le texte est vide.', ...eph });
    pending.set(i.user.id, keyword);
    return i.update(rolePrompt(keyword));
  }
  if (i.isRoleSelectMenu() && act === 'addRole') {
    const keyword = pending.get(i.user.id);
    if (!keyword) return i.update(render(i.guildId));
    pending.delete(i.user.id);
    const role = i.roles.first();
    const me = i.guild.members.me;
    if (role.managed || role.id === i.guildId || role.position >= me.roles.highest.position) {
      return i.update({ ...render(i.guildId), content: `Je ne peux pas donner ${role} : place mon rôle au-dessus, ou choisis un autre rôle.` });
    }
    if (!g.statusRules.some((r) => r.keyword.toLowerCase() === keyword.toLowerCase() && r.roleId === role.id)) {
      g.statusRules.push({ keyword, roleId: role.id });
      store.save();
      ctx.syncGuild(i.guild).catch(() => {});
    }
    return i.update({ ...render(i.guildId), content: '' });
  }
  if (i.isButton() && act === 'cancel') {
    pending.delete(i.user.id);
    return i.update({ ...render(i.guildId), content: '' });
  }
  if (i.isStringSelectMenu() && act === 'delsel') {
    const drop = new Set(i.values.map(Number));
    g.statusRules = g.statusRules.filter((_, n) => !drop.has(n));
    store.save();
    ctx.syncGuild(i.guild).catch(() => {});
  } else if (i.isButton() && act === 'sync') {
    ctx.syncGuild(i.guild).catch(() => {});
  }
  return i.update(render(i.guildId));
}

const command = new SlashCommandBuilder()
  .setName('statut').setDescription('Configurer les rôles automatiques selon le statut')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false);

module.exports = { name: 'statut', command, render, handle };
