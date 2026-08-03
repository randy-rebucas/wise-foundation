import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type PrismaDelegate = {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
  deleteMany: (args?: unknown) => Promise<unknown>;
  createMany: (args: { data: Record<string, unknown>[] }) => Promise<unknown>;
};

function delegateFor(modelName: string): PrismaDelegate {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  return (prisma as unknown as Record<string, PrismaDelegate>)[key];
}

/**
 * Topologically sorts all Prisma models parent-first, based on their FK relations,
 * so a full-database dump/restore can insert (or reverse-delete) in dependency order.
 */
export function getModelsInDependencyOrder(): string[] {
  const models = Prisma.dmmf.datamodel.models;
  const modelNames = new Set(models.map((m) => m.name));

  // Build adjacency: model -> set of models it depends on (via relation fields with relationFromFields on this model)
  const dependsOn = new Map<string, Set<string>>();
  for (const model of models) {
    const deps = new Set<string>();
    for (const field of model.fields) {
      if (
        field.kind === "object" &&
        field.relationFromFields &&
        field.relationFromFields.length > 0 &&
        modelNames.has(field.type) &&
        field.type !== model.name
      ) {
        deps.add(field.type);
      }
    }
    dependsOn.set(model.name, deps);
  }

  const ordered: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string) {
    if (visited.has(name)) return;
    if (visiting.has(name)) return; // break cycles (e.g. self-relations, AppSettings<->Branch)
    visiting.add(name);
    for (const dep of dependsOn.get(name) ?? []) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    ordered.push(name);
  }

  for (const model of models) visit(model.name);
  return ordered;
}

export interface BackupPayload {
  createdAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

/** Dumps every table's rows as plain JSON, in parent-first order (informational; restore re-derives order). */
export async function dumpDatabase(): Promise<BackupPayload> {
  const order = getModelsInDependencyOrder();
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const modelName of order) {
    const delegate = delegateFor(modelName);
    tables[modelName] = await delegate.findMany();
  }
  return { createdAt: new Date().toISOString(), tables };
}

/** Restores a dump: deletes all rows child-first, then inserts parent-first. Returns row counts per table. */
export async function restoreDatabase(payload: BackupPayload): Promise<Record<string, number>> {
  const order = getModelsInDependencyOrder();
  const results: Record<string, number> = {};

  await prisma.$transaction(
    async (tx) => {
      const txDelegateFor = (modelName: string): PrismaDelegate => {
        const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        return (tx as unknown as Record<string, PrismaDelegate>)[key];
      };

      for (const modelName of [...order].reverse()) {
        if (!(modelName in payload.tables)) continue;
        await txDelegateFor(modelName).deleteMany();
      }

      for (const modelName of order) {
        const rows = payload.tables[modelName];
        if (!rows || rows.length === 0) continue;
        await txDelegateFor(modelName).createMany({ data: rows });
        results[modelName] = rows.length;
      }
    },
    { timeout: 120_000 }
  );

  return results;
}
