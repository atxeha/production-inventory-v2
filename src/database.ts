import path from "path";
import { app } from "electron";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const isDev = !app.isPackaged;

const dbFileName = "inventory.db";
const dbPath = isDev
  ? path.join(__dirname, "..", "db", dbFileName)
  : path.join(app.getPath("userData"), dbFileName);
  
process.env.DATABASE_URL = `file:${dbPath}`;

if (!isDev && !fs.existsSync(dbPath)) {
    const appDbPath = path.join(process.resourcesPath, dbFileName);
    fs.copyFileSync(appDbPath, dbPath);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}?connection_limit=1`,
    },
  },
});

export { prisma };

function isoDate(date: string) {
  if (!date) {
    throw new Error("Date parameter is undefined or null");
  }
  if (date.length === 16) {
    return new Date(date + ":00");
  }
  return new Date(date);
}

export async function addItem(
  itemCode: string,
  itemName: string,
  quantity: number,
  unit: string,
  withdrawn: number,
  addedBy: string,
  deliveredBy: string,
  date: string,
  isDelivered: boolean,
  releasedBy: string
) {
  const iso = isoDate(date);
  async function createRelatedRecords(itemId: number) {
    const promises = [];
    if (isDelivered) {
      promises.push(
        prisma.requestDelivered.create({
          data: {
            itemId,
            deliveredQuantity: quantity,
            deliveredBy,
            receivedBy: addedBy,
            deliveredDate: new Date(iso),
          },
        })
      );
    }
    if (withdrawn > 0) {
      promises.push(
        prisma.pulledItem.create({
          data: {
            itemId,
            releasedQuantity: withdrawn,
            releasedBy,
            receivedBy: addedBy,
            releasedDate: new Date(iso),
          },
        })
      );
    }
    await Promise.all(promises);
  }

  const existingItem = await prisma.item.findUnique({
    where: { itemCode },
  });

  if (existingItem) {
    if (existingItem.isDeleted) {
      const newItem = await prisma.item.update({
        where: { itemCode },
        data: {
          itemName,
          quantity: withdrawn > 0 ? quantity - withdrawn : quantity,
          unit,
          withdrawn: withdrawn || 0,
          addedBy,
          date: new Date(iso),
          isDeleted: false,
        },
      });

      await createRelatedRecords(existingItem.id);
      return newItem;
    } else {
      throw new Error(
        `Code '${itemCode}' already exists.`
      );
    }
  }

  const newItem = await prisma.item.create({
    data: {
      itemCode,
      itemName,
      quantity: withdrawn > 0 ? quantity - withdrawn : quantity,
      unit,
      withdrawn: withdrawn || 0,
      addedBy,
      date: new Date(iso),
    },
  });

  await createRelatedRecords(newItem.id);
  return newItem;
}

export async function getItems() {
  return await prisma.item.findMany({
    where: { isDeleted: false },
    orderBy: {
      itemName: "asc",
    },
    include: {
      PurchaseRequest: true,
      RequestDelivered: true,
      PulledItem: true,
    }
  });
}

export async function editItem(
  id: number,
  itemCode: string,
  itemName: string,
  unit: string
) {
  try {
    const itemId = Number(id);

    return await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        return { success: false, message: "Item not found." };
      }

      if (item.itemCode === itemCode && item.itemName === itemName && item.unit === unit) {
        return {success: false, message: "No changes detected."}
      }

      await tx.item.update({
        where: { id: itemId },
        data: {
          itemCode,
          itemName,
          unit,
        },
      });

      return {
        success: true,
        message: "Information updated.",
        item: item,
      };
    });
  } catch (error) {
    return {
      success: false,
      message: (error as Error)?.message || "An unknown error occurred",
    };
  }
}

export async function pullItem(
  itemId: number,
  releasedQuantity: number,
  releasedBy: string,
  receivedBy: string,
  releasedDate: string
): Promise<{ success: boolean; message: string; item?: object }> {
  try {
      return await prisma.$transaction(async (tx) => {

        const iso = isoDate(releasedDate);

          const item = await tx.item.findUnique({
              where: { id: itemId },
          });

          if (!item) {
              throw new Error("Item not found.");
          }
          if (item.quantity < releasedQuantity) {
              throw new Error("Not enough stock available.");
          }

          await tx.pulledItem.create({
              data: {
                itemId: itemId,
                  releasedQuantity,
                  releasedBy,
                  receivedBy,
                  releasedDate: new Date(iso),
              },
          });

          await tx.item.update({
              where: { id: itemId },
              data: {
                  quantity: { decrement: releasedQuantity },
                  withdrawn: { increment: releasedQuantity }
              },
          });

          return {
              success: true,
              message: "Item successfully pulled.",
              item: item,
          };
      });
  } catch (error) {
      return {
          success: false,
          message: (error as Error).message,
      };
  }
}

export async function getPullItems() {
    return await prisma.pulledItem.findMany({
      where: { isDeleted: false },
      orderBy: {
        releasedDate: "desc",
    },
    include: {
      item: true,
    }
    });
}

export async function updateItemQuantity(
  id: number,
  newQuantity: number,
  updatedBy: string,
  date: string,
  deliveredBy: string
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const iso = isoDate(date)
      const itemId = Number(id);
      const quantity = Number(newQuantity)
      
      const item = await tx.item.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        return { success: false, message: "Item not found." };
      }
      
      if (newQuantity < 0) {
        return { success: false, message: "Quantity cannot be negative." };
      }

      await tx.item.update({
        where: { id: itemId },
        data: {
          quantity: {increment: newQuantity},
          updatedBy,
          updatedOn: new Date(iso),
        },
      });

      await tx.requestDelivered.create({
        data: {
          itemId: id,
          deliveredQuantity: quantity,
          deliveredBy: deliveredBy,
          receivedBy: updatedBy,
          deliveredDate: new Date(iso),
        },
      })

      return { success: true, message: "Quantity updated.", item: item, };
    });
  } catch (error) {
    return {
      success: false,
      message: (error as Error)?.message || "An unknown error occurred",
    };
  }
}

export async function addLog(
    itemId: number,
    user: string,
    log: string
) {
    try {
        const id = Number(itemId)
        await prisma.log.create({
            data: {
                itemId: id,
                user,
                log
            },
        })
        return { success: true, message: "Log created." }
    } catch (error) {
        return { success: false, message: (error as Error).message }
    }
}

export async function getLog() {
    return await prisma.log.findMany({
        include: {
            item: true,
        },
        orderBy: {
          createdAt: "desc",
      },
    });
}

export async function deleteAllLogs() {
  try {
    const deletedLogs = await prisma.log.deleteMany();
    if (deletedLogs.count === 0) {
      return { success: false, message: "No logs to delete." };
    }
    return { success: true, message: "All logs deleted."}
  } catch (error) {
    return { success: false, message: `An error occurs ${(error as Error).message}`}
  }
}

export async function deleteItemFromAnyTable(id: string, table: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const tableMap: Record<string, any> = {
        item: tx.item,
        PurchaseRequest: tx.purchaseRequest,
        RequestDelivered: tx.requestDelivered,
        PulledItem: tx.pulledItem,
      };

      const model = tableMap[table];
      if (model && typeof model.delete === "function") {
        const deletedItem = await model.delete({ where: { id } });
        return { success: true, message: `Item deleted.` };
      }
    });
  } catch (error) {
    return {
      success: false,
      message: (error as Error)?.message || "An unknown error occurred",
    };
  }
}

