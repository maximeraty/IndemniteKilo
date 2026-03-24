import { Platform } from 'react-native';
import type { Trajet, TrajetStatut } from '../types/trajet';
import type { Horodatage, HorodatageFormData } from '../types/horodatage';
import type { Vehicule, VehiculeFormData } from '../types/vehicule';

let db: any = null;

async function getSQLite() {
  return await import('expo-sqlite');
}

export async function getDatabase(): Promise<any> {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not supported on web');
  }
  if (!db) {
    const SQLite = await getSQLite();
    db = await SQLite.openDatabaseAsync('kilotrack.db');
    await initializeSchema(db);
  }
  return db;
}

async function initializeSchema(database: any): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS vehicules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      immatriculation TEXT NOT NULL DEFAULT '',
      tarif_km REAL NOT NULL,
      puissance_fiscale INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS trajets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      adresse_depart TEXT NOT NULL,
      adresse_arrivee TEXT NOT NULL,
      distance_km REAL NOT NULL,
      aller_retour INTEGER NOT NULL DEFAULT 0,
      motif TEXT NOT NULL DEFAULT '',
      vehicule_id INTEGER NOT NULL,
      montant_eur REAL NOT NULL,
      statut TEXT NOT NULL DEFAULT 'brouillon',
      FOREIGN KEY (vehicule_id) REFERENCES vehicules(id)
    );

    CREATE TABLE IF NOT EXISTS horodatages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      heure TEXT NOT NULL,
      kilometrage_km REAL NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      vehicule_id INTEGER NOT NULL,
      FOREIGN KEY (vehicule_id) REFERENCES vehicules(id)
    );

    CREATE INDEX IF NOT EXISTS idx_trajets_date ON trajets(date);
    CREATE INDEX IF NOT EXISTS idx_trajets_vehicule ON trajets(vehicule_id);
    CREATE INDEX IF NOT EXISTS idx_trajets_statut ON trajets(statut);
    CREATE INDEX IF NOT EXISTS idx_horodatages_date ON horodatages(date);
    CREATE INDEX IF NOT EXISTS idx_horodatages_vehicule ON horodatages(vehicule_id);
  `);
}

// ──── Vehicules ────

export async function insertVehicule(data: VehiculeFormData): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO vehicules (nom, immatriculation, tarif_km, puissance_fiscale) VALUES (?, ?, ?, ?)',
    [data.nom, data.immatriculation, data.tarif_km, data.puissance_fiscale]
  );
  return result.lastInsertRowId;
}

export async function getAllVehicules(): Promise<Vehicule[]> {
  const database = await getDatabase();
  return await database.getAllAsync('SELECT * FROM vehicules ORDER BY nom') as Vehicule[];
}

export async function getVehiculeById(id: number): Promise<Vehicule | null> {
  const database = await getDatabase();
  return await database.getFirstAsync(
    'SELECT * FROM vehicules WHERE id = ?',
    [id]
  ) as Vehicule | null;
}

export async function updateVehicule(
  id: number,
  data: VehiculeFormData
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE vehicules SET nom = ?, immatriculation = ?, tarif_km = ?, puissance_fiscale = ? WHERE id = ?',
    [data.nom, data.immatriculation, data.tarif_km, data.puissance_fiscale, id]
  );
}

export async function deleteVehicule(id: number): Promise<void> {
  const database = await getDatabase();
  const trajetCount = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM trajets WHERE vehicule_id = ?',
    [id]
  ) as { count: number } | null;
  const horodatageCount = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM horodatages WHERE vehicule_id = ?',
    [id]
  ) as { count: number } | null;
  const totalReferences = (trajetCount?.count ?? 0) + (horodatageCount?.count ?? 0);

  if (totalReferences > 0) {
    throw new Error(
      `Ce véhicule est utilisé par ${totalReferences} enregistrement(s). Supprimez-les d'abord.`
    );
  }
  await database.runAsync('DELETE FROM vehicules WHERE id = ?', [id]);
}

// ──── Trajets ────

export interface InsertTrajetData {
  date: string;
  adresse_depart: string;
  adresse_arrivee: string;
  distance_km: number;
  aller_retour: boolean;
  motif: string;
  vehicule_id: number;
  montant_eur: number;
}

export async function insertTrajet(data: InsertTrajetData): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO trajets (date, adresse_depart, adresse_arrivee, distance_km, aller_retour, motif, vehicule_id, montant_eur, statut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'brouillon')`,
    [
      data.date,
      data.adresse_depart,
      data.adresse_arrivee,
      data.distance_km,
      data.aller_retour ? 1 : 0,
      data.motif,
      data.vehicule_id,
      data.montant_eur,
    ]
  );
  return result.lastInsertRowId;
}

function rowToTrajet(row: any): Trajet {
  return {
    ...row,
    entry_type: 'trajet',
    aller_retour: row.aller_retour === 1,
  };
}

export async function getTrajetsByMonth(yearMonth: string): Promise<Trajet[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    "SELECT * FROM trajets WHERE date LIKE ? ORDER BY date DESC",
    [`${yearMonth}%`]
  ) as any[];
  return rows.map(rowToTrajet);
}

export async function getTrajetsByPeriod(
  dateDebut: string,
  dateFin: string,
  vehiculeId?: number | null,
  statut?: TrajetStatut | null
): Promise<Trajet[]> {
  const database = await getDatabase();
  let query = 'SELECT * FROM trajets WHERE date >= ? AND date <= ?';
  const params: any[] = [dateDebut, dateFin];

  if (vehiculeId) {
    query += ' AND vehicule_id = ?';
    params.push(vehiculeId);
  }
  if (statut) {
    query += ' AND statut = ?';
    params.push(statut);
  }
  query += ' ORDER BY date ASC';

  const rows = await database.getAllAsync(query, params) as any[];
  return rows.map(rowToTrajet);
}

export async function getTrajetById(id: number): Promise<Trajet | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT * FROM trajets WHERE id = ?',
    [id]
  ) as any | null;
  return row ? rowToTrajet(row) : null;
}

export async function updateTrajet(
  id: number,
  data: Partial<InsertTrajetData>
): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
  if (data.adresse_depart !== undefined) { fields.push('adresse_depart = ?'); values.push(data.adresse_depart); }
  if (data.adresse_arrivee !== undefined) { fields.push('adresse_arrivee = ?'); values.push(data.adresse_arrivee); }
  if (data.distance_km !== undefined) { fields.push('distance_km = ?'); values.push(data.distance_km); }
  if (data.aller_retour !== undefined) { fields.push('aller_retour = ?'); values.push(data.aller_retour ? 1 : 0); }
  if (data.motif !== undefined) { fields.push('motif = ?'); values.push(data.motif); }
  if (data.vehicule_id !== undefined) { fields.push('vehicule_id = ?'); values.push(data.vehicule_id); }
  if (data.montant_eur !== undefined) { fields.push('montant_eur = ?'); values.push(data.montant_eur); }

  if (fields.length === 0) return;

  values.push(id);
  await database.runAsync(
    `UPDATE trajets SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function updateTrajetStatut(
  id: number,
  statut: TrajetStatut
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE trajets SET statut = ? WHERE id = ?', [
    statut,
    id,
  ]);
}

export async function deleteTrajet(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM trajets WHERE id = ?', [id]);
}

// ──── Horodatages ────

export type InsertHorodatageData = HorodatageFormData;

function rowToHorodatage(row: any): Horodatage {
  return {
    ...row,
    entry_type: 'horodatage',
  };
}

export async function insertHorodatage(
  data: InsertHorodatageData
): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO horodatages (date, heure, kilometrage_km, note, vehicule_id)
     VALUES (?, ?, ?, ?, ?)`,
    [data.date, data.heure, data.kilometrage_km, data.note, data.vehicule_id]
  );
  return result.lastInsertRowId;
}

export async function getHorodatagesByMonth(
  yearMonth: string
): Promise<Horodatage[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    'SELECT * FROM horodatages WHERE date LIKE ? ORDER BY date DESC, heure DESC, id DESC',
    [`${yearMonth}%`]
  ) as any[];
  return rows.map(rowToHorodatage);
}

export async function getHorodatagesByPeriod(
  dateDebut: string,
  dateFin: string,
  vehiculeId?: number | null
): Promise<Horodatage[]> {
  const database = await getDatabase();
  let query = 'SELECT * FROM horodatages WHERE date >= ? AND date <= ?';
  const params: any[] = [dateDebut, dateFin];

  if (vehiculeId) {
    query += ' AND vehicule_id = ?';
    params.push(vehiculeId);
  }

  query += ' ORDER BY date ASC, heure ASC, id ASC';
  const rows = await database.getAllAsync(query, params) as any[];
  return rows.map(rowToHorodatage);
}

export async function getHorodatageById(id: number): Promise<Horodatage | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT * FROM horodatages WHERE id = ?',
    [id]
  ) as any | null;
  return row ? rowToHorodatage(row) : null;
}

export async function updateHorodatage(
  id: number,
  data: Partial<InsertHorodatageData>
): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
  if (data.heure !== undefined) { fields.push('heure = ?'); values.push(data.heure); }
  if (data.kilometrage_km !== undefined) { fields.push('kilometrage_km = ?'); values.push(data.kilometrage_km); }
  if (data.note !== undefined) { fields.push('note = ?'); values.push(data.note); }
  if (data.vehicule_id !== undefined) { fields.push('vehicule_id = ?'); values.push(data.vehicule_id); }

  if (fields.length === 0) return;

  values.push(id);
  await database.runAsync(
    `UPDATE horodatages SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteHorodatage(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM horodatages WHERE id = ?', [id]);
}

export interface MonthlySummary {
  total_km: number;
  total_eur: number;
  count: number;
}

export async function getMonthlySummary(
  yearMonth: string
): Promise<MonthlySummary> {
  const database = await getDatabase();
  const result = await database.getFirstAsync(
    "SELECT COALESCE(SUM(distance_km), 0) as total_km, COALESCE(SUM(montant_eur), 0) as total_eur, COUNT(*) as count FROM trajets WHERE date LIKE ?",
    [`${yearMonth}%`]
  ) as {
    total_km: number | null;
    total_eur: number | null;
    count: number;
  } | null;
  return {
    total_km: result?.total_km ?? 0,
    total_eur: result?.total_eur ?? 0,
    count: result?.count ?? 0,
  };
}

// ──── Total trip count (for paywall) ────

export async function getTotalTrajetCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM trajets'
  ) as { count: number } | null;
  return result?.count ?? 0;
}

// ──── Bulk status update for exports ────

export async function markTrajetsAsExported(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const database = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await database.runAsync(
    `UPDATE trajets SET statut = 'exporte' WHERE id IN (${placeholders})`,
    ids
  );
}
