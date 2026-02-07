import { world, system, DynamicPropertiesDefinition } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const RANKS = ["visitor", "user", "admin", "owner"];
const RANK_LABELS = {
  visitor: "Visitante",
  user: "User",
  admin: "Admin",
  owner: "Owner"
};

function getRank(player) {
  return player.getDynamicProperty("cw_rank") ?? "visitor";
}

function updateNameTag(player) {
  const rank = getRank(player);
  const label = RANK_LABELS[rank] ?? "Visitante";
  player.nameTag = `[${label}] ${player.name}`;
}

function setRank(player, rank) {
  if (!RANKS.includes(rank)) {
    return false;
  }
  player.setDynamicProperty("cw_rank", rank);
  updateNameTag(player);
  return true;
}

function assignOwnerIfMissing(player) {
  const ownerAssigned = world.getDynamicProperty("cw_owner_assigned") ?? false;
  if (!ownerAssigned) {
    world.setDynamicProperty("cw_owner_assigned", true);
    setRank(player, "owner");
  }
}

world.beforeEvents.worldInitialize.subscribe((event) => {
  const playerProps = new DynamicPropertiesDefinition();
  playerProps.defineString("cw_rank", 16);
  playerProps.defineBoolean("cw_joined");
  event.propertyRegistry.registerPlayerDynamicProperties(playerProps);

  const worldProps = new DynamicPropertiesDefinition();
  worldProps.defineBoolean("cw_owner_assigned");
  event.propertyRegistry.registerWorldDynamicProperties(worldProps);
});

world.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  const joined = player.getDynamicProperty("cw_joined") ?? false;
  if (!joined) {
    player.setDynamicProperty("cw_joined", true);
    assignOwnerIfMissing(player);
    updateNameTag(player);
    player.onScreenDisplay.setTitle("Bienvenidos al Clanword");
    player.onScreenDisplay.setSubtitle("Respeta las reglas del clan");
  } else {
    updateNameTag(player);
  }
});

world.beforeEvents.chatSend.subscribe((event) => {
  const message = event.message.trim();
  if (!message.startsWith("/rang ")) {
    return;
  }
  event.cancel = true;
  const sender = event.sender;
  const senderRank = getRank(sender);
  if (senderRank !== "owner" && senderRank !== "admin") {
    sender.sendMessage("No tienes permiso para usar /rang.");
    return;
  }
  const parts = message.split(" ");
  if (parts.length < 3) {
    sender.sendMessage("Uso: /rang <usuario> <rango>");
    return;
  }
  const targetName = parts[1];
  const desiredRank = parts[2].toLowerCase();
  const target = world.getPlayers().find((player) => player.name === targetName);
  if (!target) {
    sender.sendMessage("No se encontró al usuario.");
    return;
  }
  if (!setRank(target, desiredRank)) {
    sender.sendMessage("Rango inválido. Usa: visitor, user, admin, owner.");
    return;
  }
  sender.sendMessage(`Rango actualizado para ${target.name}: ${desiredRank}.`);
  target.sendMessage(`Tu rango ahora es: ${desiredRank}.`);
});

world.afterEvents.itemUse.subscribe(async (event) => {
  const player = event.source;
  if (!player || event.itemStack?.typeId !== "supreme:builder_axe") {
    return;
  }
  const rank = getRank(player);
  if (rank !== "owner" && rank !== "admin") {
    player.sendMessage("Solo Owner o Admin pueden usar la Acha Constructora.");
    return;
  }
  const form = new ActionFormData()
    .title("Acha Constructora")
    .body("Elige lo que quieres construir")
    .button("Casa")
    .button("Mansión")
    .button("Aldea")
    .button("Base")
    .button("Reto");

  const response = await form.show(player);
  if (response.canceled) {
    return;
  }
  const choice = response.selection;
  await buildStructure(player, choice);
});

async function buildStructure(player, choice) {
  const origin = player.location;
  const x = Math.floor(origin.x) + 2;
  const y = Math.floor(origin.y);
  const z = Math.floor(origin.z) + 2;

  const commands = [];
  switch (choice) {
    case 0: // Casa
      commands.push(
        `fill ${x} ${y} ${z} ${x + 6} ${y} ${z + 6} cobblestone`,
        `fill ${x} ${y + 1} ${z} ${x + 6} ${y + 4} ${z + 6} air`,
        `fill ${x} ${y + 1} ${z} ${x + 6} ${y + 4} ${z} oak_planks`,
        `fill ${x} ${y + 1} ${z + 6} ${x + 6} ${y + 4} ${z + 6} oak_planks`,
        `fill ${x} ${y + 1} ${z} ${x} ${y + 4} ${z + 6} oak_planks`,
        `fill ${x + 6} ${y + 1} ${z} ${x + 6} ${y + 4} ${z + 6} oak_planks`,
        `fill ${x} ${y + 5} ${z} ${x + 6} ${y + 5} ${z + 6} oak_planks`,
        `setblock ${x + 3} ${y + 1} ${z} oak_door`
      );
      break;
    case 1: // Mansión
      commands.push(
        `fill ${x} ${y} ${z} ${x + 12} ${y} ${z + 12} stone_bricks`,
        `fill ${x} ${y + 1} ${z} ${x + 12} ${y + 7} ${z + 12} air`,
        `fill ${x} ${y + 1} ${z} ${x + 12} ${y + 7} ${z} spruce_planks`,
        `fill ${x} ${y + 1} ${z + 12} ${x + 12} ${y + 7} ${z + 12} spruce_planks`,
        `fill ${x} ${y + 1} ${z} ${x} ${y + 7} ${z + 12} spruce_planks`,
        `fill ${x + 12} ${y + 1} ${z} ${x + 12} ${y + 7} ${z + 12} spruce_planks`,
        `fill ${x} ${y + 8} ${z} ${x + 12} ${y + 8} ${z + 12} dark_oak_planks`,
        `setblock ${x + 6} ${y + 1} ${z} spruce_door`
      );
      break;
    case 2: // Aldea
      commands.push(
        `fill ${x} ${y} ${z} ${x + 8} ${y} ${z + 8} grass_block`,
        `fill ${x + 2} ${y + 1} ${z + 2} ${x + 6} ${y + 3} ${z + 6} air`,
        `fill ${x + 2} ${y + 1} ${z + 2} ${x + 6} ${y + 3} ${z + 2} oak_planks`,
        `fill ${x + 2} ${y + 1} ${z + 6} ${x + 6} ${y + 3} ${z + 6} oak_planks`,
        `fill ${x + 2} ${y + 1} ${z + 2} ${x + 2} ${y + 3} ${z + 6} oak_planks`,
        `fill ${x + 6} ${y + 1} ${z + 2} ${x + 6} ${y + 3} ${z + 6} oak_planks`,
        `fill ${x + 2} ${y + 4} ${z + 2} ${x + 6} ${y + 4} ${z + 6} oak_slab`
      );
      break;
    case 3: // Base
      commands.push(
        `fill ${x} ${y} ${z} ${x + 10} ${y} ${z + 10} obsidian`,
        `fill ${x} ${y + 1} ${z} ${x + 10} ${y + 5} ${z + 10} air`,
        `fill ${x} ${y + 1} ${z} ${x + 10} ${y + 5} ${z} blackstone`,
        `fill ${x} ${y + 1} ${z + 10} ${x + 10} ${y + 5} ${z + 10} blackstone`,
        `fill ${x} ${y + 1} ${z} ${x} ${y + 5} ${z + 10} blackstone`,
        `fill ${x + 10} ${y + 1} ${z} ${x + 10} ${y + 5} ${z + 10} blackstone`
      );
      break;
    case 4: // Reto
      commands.push(
        `fill ${x} ${y} ${z} ${x + 12} ${y} ${z + 12} smooth_stone`,
        `fill ${x} ${y + 1} ${z} ${x + 12} ${y + 4} ${z + 12} air`,
        `fill ${x + 2} ${y} ${z + 2} ${x + 10} ${y} ${z + 10} lava`,
        `fill ${x + 3} ${y + 1} ${z + 3} ${x + 9} ${y + 1} ${z + 9} stone`
      );
      break;
    default:
      return;
  }

  for (const command of commands) {
    try {
      await player.runCommandAsync(command);
    } catch (error) {
      player.sendMessage("No se pudo construir en esa ubicación.");
      break;
    }
  }
}

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    updateNameTag(player);
  }
}, 200);
