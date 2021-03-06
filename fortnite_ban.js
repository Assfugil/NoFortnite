require("dotenv").config();
const {
  Presence,
  MessageEmbed,
  Collection,
  TextChannel
} = require("discord.js");
const Keyv = require("keyv");
const stats = new Keyv("sqlite://.data/database.sqlite", {
  namespace: "stats"
});
const log_channels = new Keyv("sqlite://.data/database.sqlite", {
  namespace: "log_cahnnels"
});
/**
 * @param { Presence } presence
 */
module.exports = async function(_, presence) {
  if (!presence.member || !presence.guild) return;
  if (presence.guild.me.permissions.has(4) && presence.member.partial)
    presence.member = await presence.guild.members
      .fetch(presence.member.id)
      .catch(error => {
        console.error("Failed to fetch Member! " + `(${error})`);
      });
  if (!presence ||
    !presence.activities ||
    !presence.activities.some(x => x.name.toLowerCase() === "fortnite")
  )
    return;
  /**@type { Collection<string,TextChannel> } */
  const text_channels = presence.guild.channels.cache.filter(
    x => x.type === "text"
  );
  const channel =
    presence.guild.channels.cache.get(
      await log_channels.get(presence.member.guild.id)
    ) || text_channels.find(x => x.name === "no-fortnite-logs");
  if (presence.user.partial) presence.user = await presence.user.fetch();
  if (!presence.member.bannable) {
    if (!channel) return;
    if (!channel.permissionsFor(presence.guild.me).serialize().SEND_MESSAGES)
      return;
    const embed = new MessageEmbed()
      .setAuthor(
        presence.member.user.tag,
        presence.member.user.displayAvatarURL({ dynamic: true, size: 256 })
      )
      .setDescription("is playing Fortnite but I cannot ban it!")
      .setColor(0xff8800)
      .setTimestamp()
      .setFooter(
        "Don't play Fortnite!",
        presence.member.client.user.displayAvatarURL({
          dynamic: true,
          size: 256
        })
      );
    channel.send(embed);
    return;
  } else {
    try {
      const guildName = JSON.parse(JSON.stringify(presence.member.guild.name))
      await presence.member.user
        .send(
          "You are being banned from " +
            presence.guild.name +
            " for playing Fortnite."
        )
        .catch(() => {});
      await presence.member
        .ban({ reason: "Playing Fortnite" })
        .then(async member => {
          console.log(presence.user.tag + " is banned from " + guildName + ".");
          let globalBanCount = (await stats.get("global-ban-count")) || 0;
          globalBanCount += 1;
          stats.set("global-ban-count", globalBanCount);
          let guildBanCount =
            (await stats.get(member.guild.id + "-ban-count")) || 0;
          guildBanCount += 1;
          stats.set(member.guild.id + "-ban-count", guildBanCount);
          if (!channel) return;
          if (
            !channel.permissionsFor(presence.guild.me).serialize().SEND_MESSAGES
          )
            return;
          const embed = new MessageEmbed()
            .setAuthor(
              presence.user.tag,
              presence.user.displayAvatarURL({ dynamic: true, size: 256 })
            )
            .setDescription("is banned for playing Fortnite!")
            .setColor(0xff0000)
            .setTimestamp()
            .setFooter(
              "Don't play Fortnite!",
              presence.user.client.user.displayAvatarURL({
                dynamic: true,
                size: 256
              })
            );
          channel.send(embed);
          return;
        })
        .catch(console.error);
    } catch (error) {
      console.log(
        "It seems that someone else kicked on banned the member before me!"
      );
    }
  }
};
