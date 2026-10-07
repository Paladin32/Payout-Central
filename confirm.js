const {ActionRowBuilder,ButtonBuilder,ButtonStyle}=require('discord.js');
function buttons(id){return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`confirm:${id}`).setLabel('Confirm').setStyle(ButtonStyle.Danger),new ButtonBuilder().setCustomId(`decline:${id}`).setLabel('Decline').setStyle(ButtonStyle.Secondary))}
module.exports={buttons};
